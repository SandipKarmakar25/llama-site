#!/usr/bin/env node
/* ==========================================================================
   What would a customer actually be charged?

       node server/scripts/tax-preview.js

   Runs a Stripe Tax calculation for a representative billing address in each
   market, using the real plan price and the same tax code the products carry.
   Read-only in effect: tax calculations are previews and charge nobody.

   Use this rather than reading `amount_tax` off a fresh Checkout Session -
   that is always 0 until the customer enters an address, which makes a
   working setup look broken.
   ========================================================================== */

'use strict';

const { stripe } = require('../stripe');
const cfg = require('../config');

/* SaaS, electronically supplied - matches the tax_code set on the products. */
const TAX_CODE = 'txcd_10103001';

const SAMPLES = [
  { market: 'US', label: 'United States (CA)', address: { country: 'US', state: 'CA', city: 'San Francisco', postal_code: '94107', line1: '1 Market St' } },
  { market: 'GB', label: 'United Kingdom', address: { country: 'GB', city: 'London', postal_code: 'SW1A 1AA', line1: '10 Downing Street' } },
  { market: 'DE', label: 'Germany', address: { country: 'DE', city: 'Berlin', postal_code: '10115', line1: 'Alexanderplatz 1' } },
  { market: 'FR', label: 'France', address: { country: 'FR', city: 'Paris', postal_code: '75001', line1: '1 Rue de Rivoli' } },
  { market: 'IN', label: 'India', address: { country: 'IN', state: 'KA', city: 'Bengaluru', postal_code: '560001', line1: '1 MG Road' } },
  { market: 'JP', label: 'Japan', address: { country: 'JP', state: '13', city: 'Chiyoda-ku', postal_code: '100-0001', line1: '1-1 Chiyoda' } }
];

async function main() {
  if (!cfg.env.secretKey) {
    console.error('STRIPE_SECRET_KEY is not set.');
    process.exit(1);
  }

  const plan = process.argv[2] || 'premium';
  const cycle = process.argv[3] || 'monthly';

  console.log(`\nTax preview - ${plan} / ${cycle} (${cfg.isLiveMode() ? 'LIVE' : 'test'} mode)`);
  console.log('Prices are tax-exclusive, so tax is added on top of the listed price.\n');
  console.log('  market                   net        tax      total   rate   reason');

  let collecting = 0;

  for (const sample of SAMPLES) {
    const market = cfg.shared.MARKETS[sample.market];
    const currency = market.currency.toLowerCase();
    const pricing = cfg.shared.getPricing(plan, sample.market, cycle);
    const amount = cfg.toStripeAmount(pricing.raw.amount, market.currency);

    try {
      const calc = await stripe().tax.calculations.create({
        currency,
        line_items: [{ amount, reference: plan, tax_behavior: 'exclusive', tax_code: TAX_CODE }],
        customer_details: { address: sample.address, address_source: 'billing' }
      });

      const tax = calc.tax_amount_exclusive;
      const breakdown = (calc.tax_breakdown || [])[0];
      const rate = breakdown && breakdown.tax_rate_details
        ? breakdown.tax_rate_details.percentage_decimal + '%'
        : '-';
      const reason = breakdown ? breakdown.taxability_reason : 'no breakdown';
      if (tax > 0) collecting++;

      const fmt = (minor) => cfg.shared.formatPrice(cfg.fromStripeAmount(minor, currency), sample.market);

      console.log(
        '  ' + sample.label.padEnd(22) +
        fmt(amount).padStart(9) +
        fmt(tax).padStart(10) +
        fmt(calc.amount_total).padStart(11) +
        '   ' + String(rate).padEnd(7) +
        reason
      );
    } catch (err) {
      console.log('  ' + sample.label.padEnd(22) + 'ERROR: ' + err.message);
    }
  }

  console.log(`\n  Collecting tax in ${collecting} of ${SAMPLES.length} markets.`);
  if (collecting < SAMPLES.length) {
    console.log('  "not_collecting" means no Stripe Tax registration for that jurisdiction.');
    console.log('  Add them with: npm run stripe:registrations\n');
  } else {
    console.log('');
  }
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
