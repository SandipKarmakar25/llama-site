#!/usr/bin/env node
/* ==========================================================================
   Rebuild the local subscription projection from Stripe.

       node server/scripts/resync.js            # rebuild
       node server/scripts/resync.js --dry-run  # show what would be written

   server/data/subscriptions.json is only a cache of what Stripe already
   knows. If it is lost, corrupted, or drifts because a webhook was missed
   while the server was down, this reconstructs it from the API.

   Safe to run at any time: it reads Stripe and upserts locally, never the
   other way round.
   ========================================================================== */

'use strict';

const { stripe } = require('../stripe');
const cfg = require('../config');
const store = require('../store');
const geo = require('../geo');

const DRY_RUN = process.argv.includes('--dry-run');

/** Map a Stripe price ID back to the plan/cycle/market we provisioned it as. */
function identifyPrice(priceId) {
  const catalogue = cfg.priceCatalogue;
  for (const plan of Object.keys(catalogue)) {
    for (const currency of Object.keys(catalogue[plan])) {
      for (const cycle of Object.keys(catalogue[plan][currency])) {
        if (catalogue[plan][currency][cycle] === priceId) {
          const market = cfg.shared.MARKET_ORDER.find(
            (m) => cfg.shared.MARKETS[m].currency === currency
          );
          return { plan, cycle, currency, market };
        }
      }
    }
  }
  return null;
}

async function main() {
  if (!cfg.env.secretKey) {
    console.error('STRIPE_SECRET_KEY is not set.');
    process.exit(1);
  }

  console.log(`\nRebuilding local subscriptions from Stripe (${cfg.isLiveMode() ? 'LIVE' : 'test'} mode)${DRY_RUN ? ' - dry run' : ''}\n`);

  const subs = await stripe().subscriptions.list({
    limit: 100,
    status: 'all',
    expand: ['data.customer']
  });

  if (!subs.data.length) {
    console.log('  No subscriptions found in Stripe.\n');
    return;
  }

  let written = 0;

  for (const sub of subs.data) {
    const customer = sub.customer && typeof sub.customer === 'object' ? sub.customer : null;
    const customerId = customer ? customer.id : sub.customer;
    const item = sub.items && sub.items.data && sub.items.data[0];
    const priceId = item ? item.price.id : null;

    // Prefer the metadata we set at checkout; fall back to the price catalogue
    // for anything created before that metadata existed.
    const identified = priceId ? identifyPrice(priceId) : null;
    const plan = (sub.metadata && sub.metadata.plan) || (identified && identified.plan) || null;
    const cycle = (sub.metadata && sub.metadata.cycle) || (identified && identified.cycle) || null;
    const market = (sub.metadata && sub.metadata.market) || (identified && identified.market) || null;

    const billingCountry = customer && customer.address ? customer.address.country : null;
    const mismatch = Boolean(
      billingCountry && market && !geo.countryMatchesMarket(billingCountry, market)
    );

    const record = {
      email: customer ? customer.email : null,
      name: customer ? customer.name : null,
      country: billingCountry,
      billingMismatch: mismatch,
      suggestedMarket: mismatch ? geo.marketForCountry(billingCountry).market : null,
      subscriptionId: sub.id,
      status: sub.status,
      plan,
      cycle,
      market,
      priceId,
      currency: item && item.price.currency ? item.price.currency.toUpperCase() : null,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
      resyncedAt: new Date().toISOString()
    };

    console.log(
      `  ${customerId}  ${String(record.email || '-').padEnd(28)} ` +
      `${String(plan || '?')}/${String(cycle || '?')}  ${String(market || '?')}  ${sub.status}` +
      (mismatch ? '  [billing-country mismatch]' : '')
    );

    if (!DRY_RUN) {
      store.upsertSubscription(customerId, record);
      written++;
    }
  }

  console.log(`\n  ${DRY_RUN ? subs.data.length + ' would be written' : written + ' record(s) restored'}.\n`);
}

main().catch((err) => {
  console.error('\nResync failed:', err.message);
  process.exit(1);
});
