#!/usr/bin/env node
/* ==========================================================================
   Stripe Tax registrations for the six launch markets.

       node server/scripts/tax-registrations.js --list      # show current
       node server/scripts/tax-registrations.js --dry-run   # show the plan
       node server/scripts/tax-registrations.js             # create them

   WHY THIS EXISTS
   Stripe Tax only collects tax where you have registered. With no
   registrations it calculates 0% everywhere and reports
   `taxability_reason: not_collecting` - which looks exactly like a bug.

   WHAT A REGISTRATION MEANS
   Telling Stripe you are registered in a jurisdiction makes it charge that
   jurisdiction's tax. It does NOT register you with the tax authority. Only
   add a market here once you are genuinely registered there, or you will
   collect tax you have no way to remit.

   Refuses to run against a live key without --yes-live for that reason.
   ========================================================================== */

'use strict';

const { stripe } = require('../stripe');
const cfg = require('../config');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIST = args.includes('--list');
const YES_LIVE = args.includes('--yes-live');

/* One entry per market the site sells in. `type` is the registration scheme
   Stripe expects for that jurisdiction. */
const REGISTRATIONS = [
  {
    label: 'United Kingdom - VAT',
    params: { country: 'GB', country_options: { gb: { type: 'standard' } }, active_from: 'now' }
  },
  // EU member states need a place-of-supply scheme alongside the type.
  // `standard` = you charge the local rate on B2C supplies into that country.
  // A single `oss_union` / `oss_non_union` registration can cover the whole EU
  // instead; per-country is used here because Llama only sells into DE and FR.
  {
    label: 'Germany - VAT',
    params: {
      country: 'DE',
      country_options: { de: { type: 'standard', standard: { place_of_supply_scheme: 'standard' } } },
      active_from: 'now'
    }
  },
  {
    label: 'France - TVA',
    params: {
      country: 'FR',
      country_options: { fr: { type: 'standard', standard: { place_of_supply_scheme: 'standard' } } },
      active_from: 'now'
    }
  },
  {
    label: 'India - GST',
    params: { country: 'IN', country_options: { in: { type: 'simplified' } }, active_from: 'now' }
  },
  {
    label: 'Japan - consumption tax',
    params: { country: 'JP', country_options: { jp: { type: 'standard' } }, active_from: 'now' }
  },
  {
    label: 'US - California sales tax',
    params: {
      country: 'US',
      country_options: { us: { state: 'CA', type: 'state_sales_tax' } },
      active_from: 'now'
    }
  },
  {
    label: 'US - New York sales tax',
    params: {
      country: 'US',
      country_options: { us: { state: 'NY', type: 'state_sales_tax' } },
      active_from: 'now'
    }
  }
];

function describe(reg) {
  const opts = reg.country_options || {};
  const key = Object.keys(opts)[0];
  const detail = key ? opts[key] : {};
  const bits = [detail.type, detail.state].filter(Boolean).join(' ');
  return `${reg.country}${bits ? ' (' + bits + ')' : ''}`;
}

async function listCurrent() {
  const existing = await stripe().tax.registrations.list({ limit: 100 });
  console.log(`\nCurrent registrations: ${existing.data.length}`);
  if (!existing.data.length) {
    console.log('  none - Stripe Tax will calculate 0% in every market\n');
  } else {
    existing.data.forEach((r) => {
      console.log(`  ${r.id}  ${describe(r).padEnd(28)} ${r.status}`);
    });
    console.log('');
  }
  return existing.data;
}

async function main() {
  if (!cfg.env.secretKey) {
    console.error('STRIPE_SECRET_KEY is not set.');
    process.exit(1);
  }

  const live = cfg.isLiveMode();
  console.log(`\nStripe Tax registrations - ${live ? 'LIVE MODE' : 'test mode'}${DRY_RUN ? ' (dry run)' : ''}`);

  const existing = await listCurrent();
  if (LIST) return;

  if (live && !YES_LIVE) {
    console.error('Refusing to add registrations to a live account without --yes-live.');
    console.error('Registrations change what real customers are charged, and you must');
    console.error('actually be registered in a jurisdiction before collecting its tax.');
    process.exit(1);
  }

  // Do not duplicate a country/state that is already registered.
  const seen = new Set(existing.map((r) => describe(r)));
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of REGISTRATIONS) {
    const label = entry.label.padEnd(28);
    const signature = describe(entry.params);

    if (seen.has(signature)) {
      console.log(`  skip    ${label} already registered`);
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would   ${label} ${signature}`);
      created++;
      continue;
    }

    try {
      const reg = await stripe().tax.registrations.create(entry.params);
      console.log(`  created ${label} ${reg.id}  ${reg.status}`);
      created++;
    } catch (err) {
      console.log(`  FAILED  ${label} ${err.message}`);
      failed++;
    }
  }

  console.log(`\n  ${created} ${DRY_RUN ? 'to create' : 'created'}, ${skipped} skipped, ${failed} failed.`);
  if (!DRY_RUN && created) {
    console.log('\nVerify what a customer would now be charged:');
    console.log('  npm run stripe:tax-preview\n');
  }
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
