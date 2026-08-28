#!/usr/bin/env node
/* ==========================================================================
   Create the Stripe products and prices this site needs.

       node server/scripts/provision.js --check      # verify, write nothing
       node server/scripts/provision.js --dry-run    # show the plan
       node server/scripts/provision.js              # create them
       node server/scripts/provision.js --force      # re-price existing keys

   Reads the amounts straight from assets/js/config.js, so what Stripe charges
   is generated from the same numbers the pricing page displays.

   Idempotent. Every price gets a stable lookup_key
   (llama_premium_gbp_monthly), so re-running finds what already exists rather
   than creating duplicates. Stripe prices are immutable, so changing an amount
   creates a new price and moves the lookup_key onto it (--force).

   Writes server/prices.json, which the server reads at boot.
   ========================================================================== */

'use strict';

const { stripe } = require('../stripe');
const cfg = require('../config');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const CHECK = args.includes('--check');

const PLAN_NAMES = {
  premium: 'Llama Premium',
  pro: 'Llama Pro'
};

const PLAN_DESCRIPTIONS = {
  premium: 'Unlimited trips, fare and hotel price watching, disruption rebooking help, offline itineraries and shared trips for up to 4 travellers.',
  pro: 'Everything in Premium plus unlimited price watching, group trips for up to 12, business travel mode, loyalty optimisation, concierge requests and 24/7 support.'
};

const INTERVAL = { monthly: 'month', annual: 'year' };

function lookupKey(plan, currency, cycle) {
  return `llama_${plan}_${currency}_${cycle}`.toLowerCase();
}

async function findOrCreateProduct(plan) {
  const existing = await stripe().products.search({
    query: `metadata['llama_plan']:'${plan}'`,
    limit: 1
  });

  if (existing.data.length) {
    const product = existing.data[0];

    // An archived product cannot be sold, and Stripe rejects checkout with
    // "its product is not active" - even though every price under it looks
    // healthy. Reactivate rather than silently provisioning an unsellable
    // catalogue.
    if (!product.active) {
      if (DRY_RUN) {
        console.log(`  product  ${plan.padEnd(8)} ARCHIVED ${product.id} - would reactivate`);
        return product;
      }
      const revived = await stripe().products.update(product.id, { active: true });
      console.log(`  product  ${plan.padEnd(8)} REACTIVATED ${revived.id} (was archived)`);
      return revived;
    }

    console.log(`  product  ${plan.padEnd(8)} reusing ${product.id}`);
    return product;
  }

  if (DRY_RUN) {
    console.log(`  product  ${plan.padEnd(8)} would create "${PLAN_NAMES[plan]}"`);
    return { id: `prod_DRYRUN_${plan}` };
  }

  const product = await stripe().products.create({
    name: PLAN_NAMES[plan],
    description: PLAN_DESCRIPTIONS[plan],
    metadata: { llama_plan: plan },
    tax_code: 'txcd_10103001' // Software as a service (SaaS) - electronically supplied
  });
  console.log(`  product  ${plan.padEnd(8)} created  ${product.id}`);
  return product;
}

async function findPriceByLookupKey(key) {
  const found = await stripe().prices.list({ lookup_keys: [key], limit: 1, active: true });
  return found.data.length ? found.data[0] : null;
}

/* --- Read-only verification -----------------------------------------------
   Confirms every price ID in server/prices.json still exists in Stripe, is
   active, sits under an ACTIVE product, and carries the amount, currency and
   tax behaviour the pricing page promises. Writes nothing.
   -------------------------------------------------------------------------- */
async function check() {
  const combos = cfg.expectedCombinations();
  const problems = [];

  console.log(`\nChecking ${combos.length} prices against Stripe (${cfg.isLiveMode() ? 'LIVE' : 'test'} mode)\n`);

  for (const c of combos) {
    const label = `${c.plan}/${c.currency}/${c.cycle}`.padEnd(24);
    const id = cfg.getPriceId(c.plan, c.market, c.cycle);

    if (!id) {
      console.log(`  MISSING  ${label} not in server/prices.json`);
      problems.push(`${label.trim()} is not provisioned`);
      continue;
    }

    let price;
    try {
      price = await stripe().prices.retrieve(id, { expand: ['product'] });
    } catch (err) {
      console.log(`  ERROR    ${label} ${id} - ${err.message}`);
      problems.push(`${label.trim()} price ${id} could not be retrieved`);
      continue;
    }

    const want = cfg.toStripeAmount(c.amount, c.currency);
    const wantTax = cfg.TAX_BEHAVIOUR[c.currency] || 'exclusive';
    const issues = [];

    if (price.unit_amount !== want) issues.push(`amount ${price.unit_amount} should be ${want}`);
    if (price.currency !== c.currency.toLowerCase()) issues.push(`currency ${price.currency}`);
    if (price.tax_behavior !== wantTax) issues.push(`tax_behavior ${price.tax_behavior} should be ${wantTax}`);
    if (!price.active) issues.push('price is archived');
    if (price.product && !price.product.active) issues.push('PRODUCT IS ARCHIVED - checkout will fail');

    if (issues.length) {
      console.log(`  BAD      ${label} ${issues.join('; ')}`);
      problems.push(`${label.trim()}: ${issues.join('; ')}`);
    } else {
      console.log(`  ok       ${label} ${String(price.unit_amount).padStart(8)} ${price.currency} ${price.tax_behavior}`);
    }
  }

  /* Stripe Tax is enabled per account, not per price. Checkout fails at the
     last moment if the head office address is missing, so check it here
     rather than letting a customer find out. */
  if (cfg.env.automaticTax) {
    try {
      const settings = await stripe().tax.settings.retrieve();
      if (settings.status !== 'active') {
        const reasons = settings.status_details && settings.status_details.pending
          ? (settings.status_details.pending.missing_fields || []).join(', ')
          : '';
        console.log(`\n  BAD      Stripe Tax is "${settings.status}"${reasons ? ' - missing: ' + reasons : ''}`);
        problems.push(
          'Stripe Tax is not active' + (reasons ? ` (missing: ${reasons})` : '') +
          ' - set your head office address at https://dashboard.stripe.com/settings/tax, ' +
          'or set STRIPE_AUTOMATIC_TAX=false in .env'
        );
      } else {
        console.log('\n  ok       Stripe Tax is active');
      }
    } catch (err) {
      console.log(`\n  ?        Could not read Stripe Tax settings: ${err.message}`);
    }
  }

  if (problems.length) {
    console.log(`\n${problems.length} problem(s) found:\n`);
    problems.forEach((p) => console.log('  - ' + p));

    // Only price/product problems are fixable by re-provisioning; account
    // settings have to be changed in the Stripe dashboard.
    const fixableHere = problems.some((p) => !p.startsWith('Stripe Tax'));
    if (fixableHere) {
      console.log('\nPrice and product problems are fixed by: npm run stripe:provision');
      console.log('(add --force if an amount in assets/js/config.js has changed)');
    }
    console.log('');
    process.exit(1);
  }

  console.log('\nAll prices are active, correctly priced and sellable.\n');
}

async function main() {
  if (!cfg.env.secretKey) {
    console.error('STRIPE_SECRET_KEY is not set. Copy server/.env.example to .env first.');
    process.exit(1);
  }

  if (CHECK) {
    await check();
    return;
  }

  const live = cfg.isLiveMode();
  console.log(`\nProvisioning Stripe catalogue in ${live ? 'LIVE MODE' : 'test mode'}${DRY_RUN ? ' (dry run)' : ''}\n`);

  if (live && !DRY_RUN && !args.includes('--yes-live')) {
    console.error('Refusing to write to a live account without --yes-live.');
    console.error('Provision in test mode first and check the results.');
    process.exit(1);
  }

  const catalogue = Object.assign({}, cfg.priceCatalogue);
  const combos = cfg.expectedCombinations();
  let created = 0;
  let reused = 0;
  let repriced = 0;

  for (const plan of cfg.PAID_PLANS) {
    const product = await findOrCreateProduct(plan);
    catalogue[plan] = catalogue[plan] || {};

    for (const combo of combos.filter((c) => c.plan === plan)) {
      const { currency, cycle, amount, market } = combo;
      const key = lookupKey(plan, currency, cycle);
      const unitAmount = cfg.toStripeAmount(amount, currency);
      const taxBehaviour = cfg.TAX_BEHAVIOUR[currency] || 'exclusive';
      const label = `${plan}/${currency}/${cycle}`.padEnd(24);

      const existing = await findPriceByLookupKey(key);

      // tax_behavior is part of the identity of a price, not a detail: an
      // inclusive and an exclusive price with the same unit_amount charge the
      // customer different totals. Comparing only amount + currency would
      // silently keep the wrong one.
      const matches = existing &&
        existing.unit_amount === unitAmount &&
        existing.currency === currency.toLowerCase() &&
        existing.tax_behavior === taxBehaviour;

      if (matches) {
        catalogue[plan][currency] = catalogue[plan][currency] || {};
        catalogue[plan][currency][cycle] = existing.id;
        console.log(`  price    ${label} unchanged  ${existing.id}`);
        reused++;
        continue;
      }

      if (existing && !FORCE) {
        catalogue[plan][currency] = catalogue[plan][currency] || {};
        catalogue[plan][currency][cycle] = existing.id;
        const diff = existing.unit_amount !== unitAmount
          ? `amount ${existing.unit_amount} vs ${unitAmount}`
          : `tax_behavior ${existing.tax_behavior} vs ${taxBehaviour}`;
        console.log(`  price    ${label} DIFFERS   ${diff} - pass --force to re-price`);
        reused++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`  price    ${label} would create ${unitAmount} ${currency} ${taxBehaviour} (${market})`);
        created++;
        continue;
      }

      const price = await stripe().prices.create({
        product: product.id,
        currency: currency.toLowerCase(),
        unit_amount: unitAmount,
        recurring: { interval: INTERVAL[cycle] },
        tax_behavior: taxBehaviour,
        lookup_key: key,
        transfer_lookup_key: Boolean(existing),
        nickname: `${PLAN_NAMES[plan]} - ${currency} ${cycle}`,
        metadata: { llama_plan: plan, llama_cycle: cycle, llama_currency: currency }
      });

      catalogue[plan][currency] = catalogue[plan][currency] || {};
      catalogue[plan][currency][cycle] = price.id;

      if (existing) {
        await stripe().prices.update(existing.id, { active: false });
        console.log(`  price    ${label} REPRICED  ${price.id} (old ${existing.id} archived)`);
        repriced++;
      } else {
        console.log(`  price    ${label} created   ${price.id}`);
        created++;
      }
    }
  }

  console.log(`\n  ${created} created, ${repriced} repriced, ${reused} reused.`);

  if (DRY_RUN) {
    console.log('\nDry run - nothing was written to Stripe or to server/prices.json.\n');
    return;
  }

  cfg.savePriceCatalogue(catalogue);
  console.log('\nWrote server/prices.json. Restart the server to pick it up.\n');

  const stillMissing = cfg.reloadPriceCatalogue() && cfg.missingPrices();
  if (stillMissing.length) {
    console.warn(`Warning: still missing ${stillMissing.length} price(s).`);
  } else {
    console.log('All plan / currency / cycle combinations are provisioned.\n');
  }
}

main().catch((err) => {
  console.error('\nProvisioning failed:', err.message);
  if (err.type) console.error('Stripe error type:', err.type);
  process.exit(1);
});
