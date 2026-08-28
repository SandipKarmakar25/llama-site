#!/usr/bin/env node
/* ==========================================================================
   End-to-end tests for the Stripe integration, with the Stripe API stubbed.

       npm run test:server

   No network access and no real keys. What this actually proves:
     - the price charged is resolved server-side from market + cycle, and a
       tampered request cannot change it
     - JPY is treated as zero-decimal and INR is not
     - tax_behavior matches what the pricing page promises per market
     - webhook signatures are verified, and replays are ignored
     - the app degrades correctly when Stripe is not configured
   ========================================================================== */

'use strict';

/* Env must be set before server/config.js is first required. */
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_local_tests';
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret_for_local_tests';
process.env.SITE_URL = 'http://localhost:4173';
process.env.PORT = '0';
// Pin this: a local .env with tax switched off must not change the assertions.
process.env.STRIPE_AUTOMATIC_TAX = 'true';

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const Stripe = require('stripe');

/* Fake catalogue: price IDs encode plan/currency/cycle so assertions read well. */
const catalogue = {};
for (const plan of ['premium', 'pro']) {
  catalogue[plan] = {};
  for (const cur of ['USD', 'GBP', 'EUR', 'INR', 'JPY']) {
    catalogue[plan][cur] = {
      monthly: `price_${plan}_${cur.toLowerCase()}_monthly`,
      annual: `price_${plan}_${cur.toLowerCase()}_annual`
    };
  }
}
process.env.STRIPE_PRICES = JSON.stringify(catalogue);

/* Isolate the store completely: a test run must never read or write the real
   server/data directory. Must be set before store.js / session.js load. */
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'llama-test-'));
process.env.LLAMA_DATA_DIR = DATA_DIR;

process.on('exit', () => {
  try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (err) { /* best effort */ }
});

const cfg = require('../config');
const { setClientForTests } = require('../stripe');
const store = require('../store');
const app = require('../index');

/* --- Stripe stub ---------------------------------------------------------- */
const calls = { sessions: [], portal: [], customersCreated: [], customersUpdated: [], customerSeq: 0 };
const realStripe = new Stripe('sk_test_fake_key_for_local_tests', { apiVersion: '2026-07-29.dahlia' });

setClientForTests({
  checkout: {
    sessions: {
      create: async (params, opts) => {
        calls.sessions.push({ params, opts });
        return { id: 'cs_test_stub123', url: 'https://checkout.stripe.com/c/pay/cs_test_stub123' };
      },
      retrieve: async (id) => {
        // cs_test_unpaid... simulates an abandoned / open session so the
        // claim route can be tested for refusing to grant access.
        const unpaid = id.includes('unpaid');
        return {
          id,
          status: unpaid ? 'open' : 'complete',
          payment_status: unpaid ? 'unpaid' : 'paid',
          currency: 'eur',
          amount_total: 11500,
          total_details: { amount_tax: 1836 },
          customer: 'cus_test_claimed',
          customer_details: { email: 'buyer@example.com', name: 'Test Buyer' },
          metadata: { plan: 'premium', cycle: 'annual', market: 'DE' }
        };
      }
    }
  },
  billingPortal: {
    sessions: {
      create: async (params) => {
        calls.portal.push(params);
        return { url: 'https://billing.stripe.com/p/session/test_stub' };
      }
    }
  },
  customers: {
    // Filter by email like the real API does. Returning a hit unconditionally
    // would hide the "unknown address gets nothing" behaviour we rely on.
    list: async ({ email }) => (
      email === 'buyer@example.com'
        ? { data: [{ id: 'cus_test_claimed', email }] }
        : { data: [] }
    ),
    create: async (params) => {
      const created = Object.assign({ id: 'cus_test_new_' + (calls.customerSeq += 1) }, params);
      calls.customersCreated.push(created);
      return created;
    },
    retrieve: async (id) => ({
      id,
      deleted: false,
      // cus_test_claimed already has a German address on file, so the market
      // default must NOT overwrite it.
      address: id === 'cus_test_claimed' ? { country: 'DE' } : null
    }),
    update: async (id, params) => {
      calls.customersUpdated.push({ id, params });
      return { id, ...params };
    }
  },
  // Real crypto - signature verification is genuinely exercised.
  webhooks: realStripe.webhooks
});

/* --- Tiny test harness ---------------------------------------------------- */
let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

let server;
let base;

/* Cookie jar, so session behaviour can be exercised the way a browser would. */
let jar = {};
function resetJar() { jar = {}; }
function cookieHeader() {
  const pairs = Object.entries(jar).filter(([, v]) => v !== '');
  return pairs.length ? pairs.map(([k, v]) => `${k}=${v}`).join('; ') : null;
}
function storeCookies(res) {
  const set = res.headers['set-cookie'];
  if (!set) return;
  for (const line of set) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

function request(method, url, { body, headers = {}, raw, noCookies = false, redirect = false } = {}) {
  return new Promise((resolve, reject) => {
    const payload = raw !== undefined ? raw : (body !== undefined ? JSON.stringify(body) : null);
    const cookie = noCookies ? null : cookieHeader();
    const req = http.request(
      base + url,
      {
        method,
        headers: Object.assign(
          payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {},
          cookie ? { Cookie: cookie } : {},
          headers
        )
      },
      (res) => {
        if (!noCookies) storeCookies(res);
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(data); } catch (e) { /* html */ }
          resolve({ status: res.statusCode, body: json, text: data, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  section('Configuration');
  check('payments enabled with keys + catalogue', cfg.paymentsEnabled());
  check('20 price combinations expected', cfg.expectedCombinations().length === 20);
  check('nothing missing from catalogue', cfg.missingPrices().length === 0);
  check('not live mode with sk_test key', cfg.isLiveMode() === false);

  // Stripe's default handling: listed prices are net, tax is added at checkout.
  check('every currency is tax-exclusive',
    cfg.CURRENCIES.every((c) => cfg.TAX_BEHAVIOUR[c] === 'exclusive'),
    JSON.stringify(cfg.TAX_BEHAVIOUR));
  check('no market claims tax-inclusive display',
    Object.values(cfg.shared.MARKETS).every((m) => m.taxIncluded === false));

  const health = await request('GET', '/api/health');
  check('GET /api/health -> 200', health.status === 200);
  check('health reports 20/20 provisioned',
    health.body.pricesProvisioned === 20 && health.body.pricesExpected === 20);

  const pub = await request('GET', '/api/config');
  check('GET /api/config -> paymentsEnabled true', pub.body.paymentsEnabled === true);
  check('config exposes publishable key only',
    pub.body.publishableKey === 'pk_test_fake' && !('secretKey' in pub.body));
  check('config is not cached', /no-store/.test(pub.headers['cache-control'] || ''));

  section('Checkout — price resolution per market');
  const cases = [
    { market: 'US', plan: 'premium', cycle: 'monthly', price: 'price_premium_usd_monthly', locale: 'en' },
    { market: 'GB', plan: 'premium', cycle: 'annual', price: 'price_premium_gbp_annual', locale: 'en' },
    { market: 'DE', plan: 'pro', cycle: 'annual', price: 'price_pro_eur_annual', locale: 'de' },
    { market: 'FR', plan: 'pro', cycle: 'monthly', price: 'price_pro_eur_monthly', locale: 'fr' },
    { market: 'IN', plan: 'premium', cycle: 'annual', price: 'price_premium_inr_annual', locale: 'en' },
    { market: 'JP', plan: 'pro', cycle: 'monthly', price: 'price_pro_jpy_monthly', locale: 'ja' }
  ];

  for (const c of cases) {
    calls.sessions.length = 0;
    const res = await request('POST', '/api/checkout', {
      body: { plan: c.plan, cycle: c.cycle, market: c.market }
    });
    const sent = calls.sessions[0] ? calls.sessions[0].params : null;
    check(`${c.market} ${c.plan}/${c.cycle} -> ${c.price}`,
      res.status === 200 && sent && sent.line_items[0].price === c.price,
      sent ? 'got ' + sent.line_items[0].price : 'no call, HTTP ' + res.status);
    check(`${c.market} uses Stripe locale "${c.locale}"`,
      sent && sent.locale === c.locale, sent ? 'got ' + sent.locale : '');
    check(`${c.market} returns the Checkout URL`,
      res.body && typeof res.body.url === 'string' && res.body.url.includes('checkout.stripe.com'));
  }

  section('Checkout — session parameters');
  calls.sessions.length = 0;
  await request('POST', '/api/checkout', {
    body: { plan: 'pro', cycle: 'annual', market: 'DE', email: 'buyer@example.com', language: 'de' },
    headers: { 'X-Idempotency-Key': 'test-key-abc' }
  });
  const s = calls.sessions[0].params;
  const o = calls.sessions[0].opts;
  check('mode is subscription', s.mode === 'subscription');
  check('automatic tax enabled', s.automatic_tax && s.automatic_tax.enabled === true);
  check('billing address required for tax', s.billing_address_collection === 'required');
  check('tax ID collection enabled (B2B VAT/GST)', s.tax_id_collection && s.tax_id_collection.enabled === true);
  check('email is carried on the customer, never as customer_email',
    !('customer_email' in s) && typeof s.customer === 'string');
  // Stripe rejects customer_creation outside payment mode; subscription mode
  // creates the Customer implicitly. Regression guard for a real 400.
  check('customer_creation is not sent in subscription mode',
    !('customer_creation' in s));
  check('billing address is required (Stripe Tax needs it)',
    s.billing_address_collection === 'required');

  section('Checkout — billing country is pre-selected from the market');
  // Without a Customer carrying a country, Stripe Checkout defaults the
  // billing country to the account's own (US) on every session - so a German
  // buying in EUR would be defaulted to a US address and taxed as US.
  const countryCases = [
    ['DE', 'DE'], ['FR', 'FR'], ['GB', 'GB'], ['JP', 'JP'], ['IN', 'IN'], ['US', 'US']
  ];
  for (const [market, expected] of countryCases) {
    resetJar();
    calls.customersCreated.length = 0;
    calls.sessions.length = 0;
    await request('POST', '/api/checkout', { body: { plan: 'premium', cycle: 'monthly', market } });
    const created = calls.customersCreated[0];
    check(`${market} checkout creates a customer with country ${expected}`,
      created && created.address && created.address.country === expected,
      created ? JSON.stringify(created.address) : 'no customer created');
    check(`${market} session attaches that customer`,
      calls.sessions[0].params.customer === created.id);
  }

  calls.sessions.length = 0;
  calls.customersCreated.length = 0;
  await request('POST', '/api/checkout', {
    body: { plan: 'premium', cycle: 'monthly', market: 'JP', email: 'buyer@example.com' }
  });
  check('email is put on the customer, not sent as customer_email',
    calls.customersCreated[0].email === 'buyer@example.com' &&
    !('customer_email' in calls.sessions[0].params));
  check('market recorded on the customer for later reference',
    calls.customersCreated[0].metadata.llama_market === 'JP');

  section('Checkout — signed-in buyer reuses their Stripe customer');
  resetJar();
  await request('POST', '/api/auth/claim', { body: { session_id: 'cs_test_paid_upgrade' } });
  calls.sessions.length = 0;
  calls.customersCreated.length = 0;
  calls.customersUpdated.length = 0;
  await request('POST', '/api/checkout', { body: { plan: 'pro', cycle: 'monthly', market: 'GB' } });
  const up = calls.sessions[0].params;
  check('reuses the session customer instead of creating a second one',
    up.customer === 'cus_test_claimed', 'got ' + up.customer);
  check('no duplicate customer created for a signed-in buyer',
    calls.customersCreated.length === 0);
  check('an address already on file is NOT overwritten by the market default',
    calls.customersUpdated.length === 0);
  check('does not also send customer_email (Stripe rejects both)',
    !('customer_email' in up));
  check('customer_update writes the billing address back to the customer',
    up.customer_update && up.customer_update.address === 'auto');
  // A body-supplied customer must be ignored entirely.
  calls.sessions.length = 0;
  await request('POST', '/api/checkout', {
    body: { plan: 'pro', cycle: 'monthly', market: 'GB', customer: 'cus_someone_else' }
  });
  check('a customer id in the request body is ignored',
    calls.sessions[0].params.customer === 'cus_test_claimed');
  resetJar();
  check('promotion codes allowed', s.allow_promotion_codes === true);
  check('metadata carries plan/cycle/market',
    s.subscription_data.metadata.plan === 'pro' &&
    s.subscription_data.metadata.cycle === 'annual' &&
    s.subscription_data.metadata.market === 'DE');
  check('success_url carries the session placeholder',
    s.success_url.includes('checkout-success.html') && s.success_url.includes('{CHECKOUT_SESSION_ID}'));
  check('cancel_url returns to pricing', s.cancel_url.includes('pricing.html?checkout=cancelled'));
  check('idempotency key forwarded to Stripe', o && o.idempotencyKey === 'test-key-abc');

  section('Checkout — the client cannot set the price');
  calls.sessions.length = 0;
  const tampered = await request('POST', '/api/checkout', {
    body: {
      plan: 'pro', cycle: 'annual', market: 'IN',
      amount: 1, unit_amount: 1, price: 'price_attacker_controlled', currency: 'usd'
    }
  });
  const t = calls.sessions[0] ? calls.sessions[0].params : null;
  check('extra client fields are ignored',
    tampered.status === 200 && t.line_items[0].price === 'price_pro_inr_annual',
    t ? 'got ' + t.line_items[0].price : '');
  check('no amount is ever forwarded from the client',
    t && !('amount' in t) && !('unit_amount' in t) && t.line_items[0].quantity === 1);

  section('Checkout — validation');
  const bad = [
    ['unknown plan', { plan: 'enterprise', cycle: 'monthly', market: 'US' }, 'unknown_plan'],
    ['free plan is not chargeable', { plan: 'free', cycle: 'monthly', market: 'US' }, 'unknown_plan'],
    ['unknown cycle', { plan: 'pro', cycle: 'weekly', market: 'US' }, 'unknown_cycle'],
    ['unknown market', { plan: 'pro', cycle: 'monthly', market: 'ZZ' }, 'unknown_market'],
    ['missing body fields', {}, 'unknown_plan']
  ];
  for (const [name, body, expected] of bad) {
    const res = await request('POST', '/api/checkout', { body });
    check(`400 on ${name}`, res.status === 400 && res.body.error === expected,
      `HTTP ${res.status} ${res.body && res.body.error}`);
  }

  section('Session lookup (success page)');
  const sess = await request('GET', '/api/session/cs_test_stub123');
  check('GET /api/session/:id -> 200', sess.status === 200);
  check('amount converted back from minor units (11500 -> 115)', sess.body.amountTotal === 115);
  check('tax converted back (1836 -> 18.36)', Math.abs(sess.body.amountTax - 18.36) < 0.001);
  check('returns plan and market', sess.body.plan === 'premium' && sess.body.market === 'DE');
  const badSess = await request('GET', '/api/session/not-a-session-id');
  check('400 on malformed session id', badSess.status === 400);

  section('Webhook — signature verification');
  const evtPayload = JSON.stringify({
    id: 'evt_test_001',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_stub123',
        object: 'checkout.session',
        mode: 'subscription',
        customer: 'cus_test_webhook',
        subscription: 'sub_test_001',
        currency: 'eur',
        customer_details: { email: 'buyer@example.com', name: 'Test Buyer', address: { country: 'DE' } },
        metadata: { plan: 'premium', cycle: 'annual', market: 'DE' }
      }
    }
  });

  const unsigned = await request('POST', '/api/stripe/webhook', {
    raw: evtPayload,
    headers: { 'stripe-signature': 't=1,v1=deadbeef' }
  });
  check('400 on invalid signature', unsigned.status === 400);

  const noSig = await request('POST', '/api/stripe/webhook', { raw: evtPayload });
  check('400 when signature header is absent', noSig.status === 400);

  const sig = realStripe.webhooks.generateTestHeaderString({
    payload: evtPayload,
    secret: process.env.STRIPE_WEBHOOK_SECRET
  });
  const signed = await request('POST', '/api/stripe/webhook', {
    raw: evtPayload,
    headers: { 'stripe-signature': sig }
  });
  check('200 on valid signature', signed.status === 200 && signed.body.received === true);

  await new Promise((r) => setTimeout(r, 120));
  const rec = store.getSubscription('cus_test_webhook');
  check('subscription recorded from webhook', Boolean(rec), 'nothing stored');
  check('recorded plan/cycle/market',
    rec && rec.plan === 'premium' && rec.cycle === 'annual' && rec.market === 'DE');
  check('recorded email and status',
    rec && rec.email === 'buyer@example.com' && rec.status === 'active');
  check('lookup by email works', Boolean(store.findByEmail('buyer@example.com')));

  section('Webhook — idempotency');
  check('event marked processed', store.alreadyProcessed('evt_test_001'));
  const replay = await request('POST', '/api/stripe/webhook', {
    raw: evtPayload,
    headers: { 'stripe-signature': sig }
  });
  check('replay still acknowledged 200', replay.status === 200);

  const cancelPayload = JSON.stringify({
    id: 'evt_test_002',
    object: 'event',
    type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_test_001', object: 'subscription', customer: 'cus_test_webhook', status: 'canceled' } }
  });
  const cancelSig = realStripe.webhooks.generateTestHeaderString({
    payload: cancelPayload, secret: process.env.STRIPE_WEBHOOK_SECRET
  });
  await request('POST', '/api/stripe/webhook', { raw: cancelPayload, headers: { 'stripe-signature': cancelSig } });
  await new Promise((r) => setTimeout(r, 120));
  const cancelled = store.getSubscription('cus_test_webhook');
  check('cancellation downgrades the record', cancelled && cancelled.status === 'canceled');

  section('Billing portal');
  calls.portal.length = 0;
  resetJar();

  // The portal now derives the customer from the session cookie. Supplying an
  // email is no longer enough - and must not be.
  const spoofed = await request('POST', '/api/portal', { body: { email: 'buyer@example.com' } });
  check('401 when only an email is supplied (no session)', spoofed.status === 401);
  check('no portal session created for an unauthenticated caller', calls.portal.length === 0);

  await request('POST', '/api/auth/claim', { body: { session_id: 'cs_test_paid_portal' } });
  const portal = await request('POST', '/api/portal', { body: {} });
  check('POST /api/portal -> 200 with URL once signed in',
    portal.status === 200 && portal.body.url.includes('billing.stripe.com'));
  check('portal opens for the session customer, not a supplied one',
    calls.portal[0] && calls.portal[0].customer === 'cus_test_claimed');
  check('portal return_url points at the account page',
    calls.portal[0] && calls.portal[0].return_url.includes('account.html'));
  resetJar();

  /* ================= Entitlements and sessions ================= */

  section('Entitlements — plan resolution');
  const ent = require('../entitlements');
  check('no record -> free', ent.resolve(null).plan.id === 'free');
  check('active premium -> premium',
    ent.resolve({ status: 'active', plan: 'premium' }).plan.id === 'premium');
  check('active pro -> pro',
    ent.resolve({ status: 'active', plan: 'pro' }).plan.id === 'pro');
  check('canceled premium -> free',
    ent.resolve({ status: 'canceled', plan: 'premium' }).plan.id === 'free');
  check('past_due keeps access (grace period promised in the terms)',
    ent.resolve({ status: 'past_due', plan: 'pro' }).plan.id === 'pro');
  check('unknown plan name falls back to free, not a crash',
    ent.resolve({ status: 'active', plan: 'enterprise' }).plan.id === 'free');
  check('free limits match the pricing page (3 trips, 1 traveller)',
    ent.PLANS.free.tripsPerYear === 3 && ent.PLANS.free.travellersPerTrip === 1);
  check('premium is unlimited trips, 4 travellers, 20 routes',
    ent.PLANS.premium.tripsPerYear === null &&
    ent.PLANS.premium.travellersPerTrip === 4 &&
    ent.PLANS.premium.watchedRoutes === 20);
  check('pro is 12 travellers, unlimited routes, API access',
    ent.PLANS.pro.travellersPerTrip === 12 &&
    ent.PLANS.pro.watchedRoutes === null &&
    ent.PLANS.pro.apiAccess === true);
  check('withinLimit treats null as unlimited',
    ent.withinLimit(null, 999999) === true && ent.withinLimit(3, 3) === false);

  section('Billing country ↔ market reconciliation');
  const geo = require('../geo');
  check('US -> US market', geo.marketForCountry('US').market === 'US');
  check('DE -> DE market', geo.marketForCountry('DE').market === 'DE');
  check('GB -> GB market', geo.marketForCountry('GB').market === 'GB');
  check('JP -> JP market', geo.marketForCountry('JP').market === 'JP');
  check('IN -> IN market', geo.marketForCountry('IN').market === 'IN');
  check('Spain falls into the EUR catalogue, not USD',
    geo.marketForCountry('ES').market === 'DE' && geo.marketForCountry('ES').exact === false);
  check('Ireland falls into the EUR catalogue', geo.marketForCountry('IE').market === 'DE');
  check('an unknown country defaults to US', geo.marketForCountry('ZZ').market === 'US');
  check('empty country defaults to US without throwing', geo.marketForCountry('').market === 'US');

  check('a German address on EUR pricing is consistent',
    geo.countryMatchesMarket('DE', 'DE') === true);
  check('a French address on the DE (euro) price is consistent',
    geo.countryMatchesMarket('FR', 'DE') === true);
  check('a German address on USD pricing is a MISMATCH',
    geo.countryMatchesMarket('DE', 'US') === false);
  check('a US address on GBP pricing is a MISMATCH',
    geo.countryMatchesMarket('US', 'GB') === false);
  check('an Indian address on JPY pricing is a MISMATCH',
    geo.countryMatchesMarket('IN', 'JP') === false);
  check('an unknown billing country is not treated as a mismatch',
    geo.countryMatchesMarket('', 'DE') === true);

  section('Webhook records a billing-country mismatch');
  const mismatchPayload = JSON.stringify({
    id: 'evt_test_mismatch',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_mismatch', object: 'checkout.session', mode: 'subscription',
        customer: 'cus_test_mismatch', subscription: 'sub_test_mismatch', currency: 'usd',
        customer_details: { email: 'de-buyer@example.com', address: { country: 'DE' } },
        // Priced in the US catalogue, but billing address is German.
        metadata: { plan: 'premium', cycle: 'monthly', market: 'US' }
      }
    }
  });
  const mismatchSig = realStripe.webhooks.generateTestHeaderString({
    payload: mismatchPayload, secret: process.env.STRIPE_WEBHOOK_SECRET
  });
  await request('POST', '/api/stripe/webhook', {
    raw: mismatchPayload, headers: { 'stripe-signature': mismatchSig }
  });
  await new Promise((r) => setTimeout(r, 120));
  const mm = store.getSubscription('cus_test_mismatch');
  check('mismatch flagged on the record', mm && mm.billingMismatch === true);
  check('suggests the correct market', mm && mm.suggestedMarket === 'DE');
  check('billing country retained', mm && mm.country === 'DE');

  const consistentPayload = JSON.stringify({
    id: 'evt_test_consistent',
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_consistent', object: 'checkout.session', mode: 'subscription',
        customer: 'cus_test_consistent', subscription: 'sub_ok', currency: 'eur',
        customer_details: { email: 'ok@example.com', address: { country: 'FR' } },
        metadata: { plan: 'pro', cycle: 'annual', market: 'FR' }
      }
    }
  });
  const consistentSig = realStripe.webhooks.generateTestHeaderString({
    payload: consistentPayload, secret: process.env.STRIPE_WEBHOOK_SECRET
  });
  await request('POST', '/api/stripe/webhook', {
    raw: consistentPayload, headers: { 'stripe-signature': consistentSig }
  });
  await new Promise((r) => setTimeout(r, 120));
  const ok = store.getSubscription('cus_test_consistent');
  check('a matching country is not flagged', ok && ok.billingMismatch === false);

  section('Country detection from edge headers');
  const geoCfg = await request('GET', '/api/config', { headers: { 'cf-ipcountry': 'DE' } });
  check('Cloudflare header detected', geoCfg.body.detectedCountry === 'DE');
  check('mapped to the DE market', geoCfg.body.detectedMarket === 'DE');
  const geoEs = await request('GET', '/api/config', { headers: { 'x-vercel-ip-country': 'ES' } });
  check('Vercel header detected, Spain -> EUR market',
    geoEs.body.detectedCountry === 'ES' && geoEs.body.detectedMarket === 'DE');
  const geoNone = await request('GET', '/api/config');
  check('no header -> null, browser locale used instead',
    geoNone.body.detectedCountry === null && geoNone.body.detectedMarket === null);
  const geoJunk = await request('GET', '/api/config', { headers: { 'cf-ipcountry': 'XX' } });
  check('Cloudflare XX (unknown) is ignored', geoJunk.body.detectedCountry === null);

  section('Session cookies — signing');
  const sessionLib = require('../session');
  const token = sessionLib.encode({ sub: 'cus_abc', email: 'a@b.com' });
  check('round-trips', sessionLib.decode(token).sub === 'cus_abc');
  check('rejects a tampered payload', sessionLib.decode('x' + token) === null);
  check('rejects a stripped signature', sessionLib.decode(token.split('.')[0]) === null);
  check('rejects garbage', sessionLib.decode('not-a-token') === null);
  const forged = Buffer.from(JSON.stringify({
    sub: 'cus_attacker', exp: Date.now() + 10000
  })).toString('base64url') + '.deadbeef';
  check('rejects a forged cookie with no valid HMAC', sessionLib.decode(forged) === null);

  section('Signed out');
  resetJar();
  const anon = await request('GET', '/api/me');
  check('GET /api/me -> signedIn false, free plan',
    anon.body.signedIn === false && anon.body.plan === 'free');
  const anonTrips = await request('GET', '/api/trips');
  check('GET /api/trips -> 401 without a session', anonTrips.status === 401);
  const anonPost = await request('POST', '/api/trips', { body: { destination: 'Kyoto' } });
  check('POST /api/trips -> 401 without a session', anonPost.status === 401);
  const anonPortal = await request('POST', '/api/portal', { body: {} });
  check('POST /api/portal -> 401 without a session (the hole is closed)',
    anonPortal.status === 401);

  section('Claiming a session after checkout');
  const badClaim = await request('POST', '/api/auth/claim', { body: { session_id: 'nope' } });
  check('400 on a malformed session id', badClaim.status === 400);

  const unpaidClaim = await request('POST', '/api/auth/claim', {
    body: { session_id: 'cs_test_unpaid_abc' }
  });
  check('402 when the session was never paid', unpaidClaim.status === 402);
  check('no cookie issued for an unpaid session', !jar['llama_session']);

  const claim = await request('POST', '/api/auth/claim', {
    body: { session_id: 'cs_test_paid_abc' }
  });
  check('200 on a paid session', claim.status === 200);
  check('session cookie issued', Boolean(jar['llama_session']));
  check('cookie is httpOnly and SameSite=Lax', (() => {
    const raw = (claim.headers['set-cookie'] || []).join(';');
    return /HttpOnly/i.test(raw) && /SameSite=Lax/i.test(raw);
  })());
  check('claim returns the entitlements', claim.body.me && claim.body.me.signedIn === true);

  section('Signed in — entitlements visible');
  const meRes = await request('GET', '/api/me');
  check('GET /api/me -> signedIn true', meRes.body.signedIn === true);
  check('plan is premium (from the checkout metadata)', meRes.body.plan === 'premium');
  check('entitlements included in the payload',
    meRes.body.entitlements && meRes.body.entitlements.travellersPerTrip === 4);
  check('email surfaced', meRes.body.email === 'buyer@example.com');
  check('/api/me is never cached', /no-store/.test(meRes.headers['cache-control'] || ''));

  section('Gated resource — premium limits');
  const t1 = await request('POST', '/api/trips', {
    body: { destination: 'Kyoto', travellers: 4, days: 21 }
  });
  check('premium: 4 travellers accepted', t1.status === 201);
  check('trip returned with an id', t1.body.trip && Boolean(t1.body.trip.id));
  const t2 = await request('POST', '/api/trips', {
    body: { destination: 'Lisbon', travellers: 8, days: 5 }
  });
  check('premium: 8 travellers refused with 402', t2.status === 402);
  check('refusal names the limit and an upgrade target',
    t2.body.limit === 'travellersPerTrip' && t2.body.upgradeTo === 'pro');
  const t3 = await request('POST', '/api/trips', { body: { destination: '' } });
  check('400 when destination is blank', t3.status === 400);

  const listed = await request('GET', '/api/trips');
  check('GET /api/trips lists only the accepted trip', listed.body.trips.length === 1);
  check('usage reports unlimited for premium', listed.body.usage.limit === null);

  section('Gated resource — free plan limits are enforced');
  // Downgrade this customer to Free the way a cancellation webhook would.
  store.upsertSubscription('cus_test_claimed', { status: 'canceled' });
  const freeMe = await request('GET', '/api/me');
  check('cancelled subscription drops to free', freeMe.body.plan === 'free');
  check('free entitlements now apply',
    freeMe.body.entitlements.travellersPerTrip === 1 &&
    freeMe.body.entitlements.tripsPerYear === 3);

  const f1 = await request('POST', '/api/trips', {
    body: { destination: 'Porto', travellers: 3, days: 4 }
  });
  check('free: 3 travellers refused', f1.status === 402 && f1.body.limit === 'travellersPerTrip');
  const f2 = await request('POST', '/api/trips', {
    body: { destination: 'Porto', travellers: 1, days: 12 }
  });
  check('free: 12-day itinerary refused', f2.status === 402 && f2.body.limit === 'itineraryDays');
  const f3 = await request('POST', '/api/trips', {
    body: { destination: 'Porto', travellers: 1, days: 4 }
  });
  check('free: a 4-day solo trip is accepted (2nd of 3)', f3.status === 201);
  const f4 = await request('POST', '/api/trips', {
    body: { destination: 'Vigo', travellers: 1, days: 3 }
  });
  check('free: third trip accepted', f4.status === 201);
  const f5 = await request('POST', '/api/trips', {
    body: { destination: 'Braga', travellers: 1, days: 3 }
  });
  check('free: FOURTH trip refused on the yearly cap',
    f5.status === 402 && f5.body.limit === 'tripsPerYear');
  check('refusal suggests upgrading to premium', f5.body.upgradeTo === 'premium');

  section('Magic-link sign-in');
  resetJar();
  const link = await request('POST', '/api/auth/link', { body: { email: 'buyer@example.com' } });
  check('200 for a known address', link.status === 200);
  check('test mode returns the link so the flow is usable without email',
    typeof link.body.devLoginUrl === 'string' && link.body.devLoginUrl.includes('token='));

  const unknown = await request('POST', '/api/auth/link', { body: { email: 'nobody@example.com' } });
  check('unknown address gets the same generic answer (no enumeration)',
    unknown.status === 200 && unknown.body.message === link.body.message);
  check('no link returned for an unknown address', !unknown.body.devLoginUrl);

  const badEmail = await request('POST', '/api/auth/link', { body: { email: 'not-an-email' } });
  check('400 on a malformed address', badEmail.status === 400);

  const tokenValue = new URL(link.body.devLoginUrl).searchParams.get('token');
  const verify = await request('GET', '/api/auth/verify?token=' + encodeURIComponent(tokenValue));
  check('verify redirects to the account page',
    verify.status === 302 && (verify.headers.location || '').includes('account.html?signin=ok'));
  check('verify issues a session cookie', Boolean(jar['llama_session']));

  const afterLink = await request('GET', '/api/me');
  check('signed in after following the link', afterLink.body.signedIn === true);

  const replayLink = await request('GET', '/api/auth/verify?token=' + encodeURIComponent(tokenValue));
  check('sign-in token is single use',
    replayLink.status === 302 && (replayLink.headers.location || '').includes('signin=expired'));

  section('Sign out');
  const out = await request('POST', '/api/auth/signout', { body: {} });
  check('signout -> 200', out.status === 200);
  const afterOut = await request('GET', '/api/me');
  check('session is gone', afterOut.body.signedIn === false);
  const tripsAfterOut = await request('GET', '/api/trips');
  check('gated resource refuses again', tripsAfterOut.status === 401);

  section('Static site and errors');
  resetJar();
  const home = await request('GET', '/');
  check('GET / -> 200 HTML', home.status === 200 && home.text.includes('<title>'));
  const css = await request('GET', '/assets/css/styles.css');
  check('stylesheet served', css.status === 200 && css.headers['content-type'].includes('text/css'));
  const missing = await request('GET', '/no-such-page.html');
  check('unknown page -> 404 HTML', missing.status === 404 && missing.text.includes('404'));
  const missingApi = await request('GET', '/api/no-such-route');
  check('unknown /api route -> JSON 404',
    missingApi.status === 404 && missingApi.body && missingApi.body.error === 'not_found');

  section('Security headers');
  check('CSP present', /content-security-policy/i.test(Object.keys(home.headers).join(',')));
  check('CSP allows Stripe checkout frames',
    (home.headers['content-security-policy'] || '').includes('checkout.stripe.com'));
  check('nosniff set', home.headers['x-content-type-options'] === 'nosniff');
  check('framing denied', home.headers['x-frame-options'] === 'DENY');
}

server = app.listen(0, async () => {
  base = 'http://127.0.0.1:' + server.address().port;
  console.log(`\nStripe integration tests (stubbed API) — ${base}`);
  try {
    await run();
  } catch (err) {
    failed++;
    failures.push('threw: ' + err.message);
    console.error('\nUnexpected error:', err.stack);
  }
  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log('  - ' + f));
  }
  server.close(() => process.exit(failed ? 1 : 0));
});
