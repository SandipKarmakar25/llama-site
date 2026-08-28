/* ==========================================================================
   Server configuration and the Stripe price catalogue.
   --------------------------------------------------------------------------
   Pricing numbers are NOT duplicated here. They are read from the same
   assets/js/config.js the browser uses, so the page and the charge can never
   drift apart. This file only adds what the browser must never see: which
   Stripe price ID corresponds to each plan / currency / cycle.
   ========================================================================== */

'use strict';

require('dotenv').config({ quiet: true });

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/* --- Shared pricing data ---------------------------------------------------
   assets/js/config.js is a browser IIFE that assigns to `window`. Evaluate it
   with a stand-in global so Node gets the same object the page gets.
   -------------------------------------------------------------------------- */
function loadSharedConfig() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'config.js'), 'utf8');
  const fakeWindow = {};
  new Function('window', src)(fakeWindow);
  if (!fakeWindow.LlamaConfig) {
    throw new Error('assets/js/config.js did not define LlamaConfig');
  }
  return fakeWindow.LlamaConfig;
}

const shared = loadSharedConfig();

/* --- Currency behaviour ----------------------------------------------------
   Stripe expects amounts in the smallest currency unit. Most currencies are
   two-decimal (USD 12.00 -> 1200), but a handful are zero-decimal (JPY 1800
   -> 1800). INR looks like it should be zero-decimal because we show whole
   rupees, but Stripe treats it as two-decimal paise - getting this wrong
   charges 100x too little or too much.
   -------------------------------------------------------------------------- */
const ZERO_DECIMAL = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW',
  'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

function toStripeAmount(amount, currency) {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL.has(code)) return Math.round(amount);
  return Math.round(amount * 100);
}

function fromStripeAmount(amount, currency) {
  const code = String(currency).toUpperCase();
  if (ZERO_DECIMAL.has(code)) return amount;
  return amount / 100;
}

/* --- Tax behaviour ---------------------------------------------------------
   Stripe's usual default: the listed price is net, and tax is calculated and
   added at checkout from the customer's billing address.

   NOTE FOR B2C IN THE UK AND EU: consumer price displays there are normally
   required to be tax-inclusive (UK Price Marking Order; EU Price Indication
   Directive 98/6/EC). Exclusive pricing is standard and accepted for B2B, but
   if you sell to consumers in those markets this needs a legal review - see
   the tax section of the README. Switch a currency back to 'inclusive' here
   and re-run `npm run stripe:provision -- --force` to reverse it.
   -------------------------------------------------------------------------- */
const TAX_BEHAVIOUR = {
  USD: 'exclusive',
  GBP: 'exclusive',
  EUR: 'exclusive',
  INR: 'exclusive',
  JPY: 'exclusive'
};

/* Currencies we actually sell in, derived from the market table. */
const CURRENCIES = [...new Set(
  shared.MARKET_ORDER.map((code) => shared.MARKETS[code].currency)
)];

const PAID_PLANS = ['premium', 'pro'];
const CYCLES = ['monthly', 'annual'];

/* --- Stripe price catalogue ------------------------------------------------
   Written by `npm run stripe:provision`, or supplied as JSON in the
   STRIPE_PRICES env var for platforms without a writable filesystem.
   Shape: { premium: { USD: { monthly: 'price_x', annual: 'price_y' } }, ... }
   -------------------------------------------------------------------------- */
const PRICES_FILE = path.join(__dirname, 'prices.json');

function loadPriceCatalogue() {
  if (process.env.STRIPE_PRICES) {
    try {
      return JSON.parse(process.env.STRIPE_PRICES);
    } catch (err) {
      console.error('STRIPE_PRICES is not valid JSON - ignoring it.');
    }
  }
  if (fs.existsSync(PRICES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PRICES_FILE, 'utf8'));
    } catch (err) {
      console.error('server/prices.json is not valid JSON - ignoring it.');
    }
  }
  return {};
}

let priceCatalogue = loadPriceCatalogue();

function reloadPriceCatalogue() {
  priceCatalogue = loadPriceCatalogue();
  return priceCatalogue;
}

function savePriceCatalogue(catalogue) {
  fs.writeFileSync(PRICES_FILE, JSON.stringify(catalogue, null, 2) + '\n', 'utf8');
  priceCatalogue = catalogue;
}

/**
 * Resolve the Stripe price ID for a plan in a market on a billing cycle.
 * @returns {string|null} null when that combination has not been provisioned
 */
function getPriceId(plan, market, cycle) {
  const currency = currencyForMarket(market);
  if (!currency) return null;
  const byCurrency = priceCatalogue[plan];
  if (!byCurrency) return null;
  const byCycle = byCurrency[currency];
  if (!byCycle) return null;
  return byCycle[cycle] || null;
}

function currencyForMarket(market) {
  const entry = shared.MARKETS[market];
  return entry ? entry.currency : null;
}

/** Every plan/currency/cycle combination we expect to exist. */
function expectedCombinations() {
  const out = [];
  for (const plan of PAID_PLANS) {
    for (const currency of CURRENCIES) {
      for (const cycle of CYCLES) {
        const market = shared.MARKET_ORDER.find(
          (m) => shared.MARKETS[m].currency === currency
        );
        const amount = shared.PRICES[plan][market][cycle === 'annual' ? 'y' : 'm'];
        out.push({ plan, currency, cycle, market, amount });
      }
    }
  }
  return out;
}

/** Which expected prices are missing from the catalogue. */
function missingPrices() {
  return expectedCombinations().filter(
    (c) => !(priceCatalogue[c.plan] && priceCatalogue[c.plan][c.currency] && priceCatalogue[c.plan][c.currency][c.cycle])
  );
}

/* --- Environment ---------------------------------------------------------- */
const env = {
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  siteUrl: (process.env.SITE_URL || 'http://localhost:4173').replace(/\/$/, ''),
  port: Number(process.env.PORT) || 4173,
  automaticTax: process.env.STRIPE_AUTOMATIC_TAX !== 'false'
};

/** True when we have enough configuration to actually take a payment. */
function paymentsEnabled() {
  return Boolean(env.secretKey) && missingPrices().length === 0;
}

function isLiveMode() {
  return env.secretKey.startsWith('sk_live_');
}

/* Stripe Checkout locale codes for the languages the site ships. */
const STRIPE_LOCALES = { en: 'en', de: 'de', fr: 'fr', ja: 'ja' };

module.exports = {
  shared,
  env,
  ROOT,
  CURRENCIES,
  PAID_PLANS,
  CYCLES,
  TAX_BEHAVIOUR,
  STRIPE_LOCALES,
  ZERO_DECIMAL,
  toStripeAmount,
  fromStripeAmount,
  currencyForMarket,
  getPriceId,
  expectedCombinations,
  missingPrices,
  loadPriceCatalogue,
  reloadPriceCatalogue,
  savePriceCatalogue,
  paymentsEnabled,
  isLiveMode,
  get priceCatalogue() { return priceCatalogue; }
};
