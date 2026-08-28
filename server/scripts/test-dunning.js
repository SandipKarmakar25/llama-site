#!/usr/bin/env node
/* ==========================================================================
   Simulate a failed renewal and Stripe's retry schedule.

       node server/scripts/test-dunning.js            # run the simulation
       node server/scripts/test-dunning.js --cleanup  # delete leftover clocks

   WHY A TEST CLOCK
   A renewal failure only happens a month after the first payment, and you
   cannot wait a month. A Stripe test clock is a fake "now" that a customer and
   their subscription are pinned to; advancing it makes Stripe run the real
   billing logic - renewal, decline, Smart Retries, status transitions - in
   seconds.

   WHAT THIS PROVES
     - invoice.payment_failed reaches your webhook
     - the subscription moves to past_due
     - entitlements still grant access during past_due (the grace period the
       terms promise) and only drop at cancellation

   Test mode only. Refuses to touch a live key.
   ========================================================================== */

'use strict';

const { stripe } = require('../stripe');
const cfg = require('../config');

const CLEANUP_ONLY = process.argv.includes('--cleanup');
const MARKET = process.argv.find((a) => /^--market=/.test(a));
const market = MARKET ? MARKET.split('=')[1] : 'US';

/* Stripe's canned payment method that attaches fine, then fails when charged -
   exactly the shape of a card that expires or hits its limit later. */
const FAILING_PM = 'pm_card_chargeCustomerFail';
const GOOD_PM = 'pm_card_visa';

const DAY = 24 * 60 * 60;

function label(v) { return String(v).padEnd(12); }

async function cleanup() {
  const clocks = await stripe().testHelpers.testClocks.list({ limit: 100 });
  const ours = clocks.data.filter((c) => (c.name || '').startsWith('llama-dunning'));
  console.log(`\nTest clocks from this script: ${ours.length}`);
  for (const c of ours) {
    await stripe().testHelpers.testClocks.del(c.id);
    console.log(`  deleted ${c.id} (${c.name}) - and every customer, subscription and invoice on it`);
  }
  if (!ours.length) console.log('  nothing to clean up');
  console.log('');
}

async function advanceTo(clockId, unixTime) {
  await stripe().testHelpers.testClocks.advance({ frozen_time: unixTime }, { stripeAccount: undefined })
    .catch(async () => stripe().testHelpers.testClocks.advance(clockId, { frozen_time: unixTime }));

  // Advancing is async; poll until Stripe finishes replaying billing.
  for (let i = 0; i < 60; i++) {
    const clock = await stripe().testHelpers.testClocks.retrieve(clockId);
    if (clock.status === 'ready') return clock;
    if (clock.status === 'internal_failure') throw new Error('test clock advance failed');
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('test clock did not become ready in time');
}

async function report(subscriptionId, when) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const invoices = await stripe().invoices.list({ subscription: subscriptionId, limit: 5 });
  const latest = invoices.data[0];

  console.log(`\n  ${when}`);
  console.log(`    subscription status : ${sub.status}`);
  if (latest) {
    console.log(`    latest invoice      : ${latest.status}  attempts=${latest.attempt_count}` +
      (latest.next_payment_attempt
        ? `  next retry ${new Date(latest.next_payment_attempt * 1000).toISOString().slice(0, 16).replace('T', ' ')}`
        : '  no further retry scheduled'));
  }

  // What the app would actually grant this customer right now.
  const entitlements = require('../entitlements');
  const resolved = entitlements.resolve({ status: sub.status, plan: sub.metadata.plan });
  console.log(`    app would grant     : ${resolved.plan.id}` +
    (resolved.plan.id !== 'free' ? '  (access retained)' : '  (downgraded to Free)'));
  return sub;
}

async function main() {
  if (!cfg.env.secretKey) {
    console.error('STRIPE_SECRET_KEY is not set.');
    process.exit(1);
  }
  if (cfg.isLiveMode()) {
    console.error('Refusing to run against a live key. Test clocks are test-mode only.');
    process.exit(1);
  }

  if (CLEANUP_ONLY) return cleanup();

  const priceId = cfg.getPriceId('premium', market, 'monthly');
  if (!priceId) {
    console.error(`No premium/monthly price for market ${market}. Run: npm run stripe:provision`);
    process.exit(1);
  }

  console.log(`\nSimulating a failed renewal - premium/monthly in ${market}\n`);

  const now = Math.floor(Date.now() / 1000);
  const clock = await stripe().testHelpers.testClocks.create({
    frozen_time: now,
    name: 'llama-dunning-' + now
  });
  console.log(`  test clock  ${clock.id}`);

  const customer = await stripe().customers.create({
    test_clock: clock.id,
    email: `dunning-${now}@example.com`,
    address: { country: market },
    payment_method: FAILING_PM,
    invoice_settings: { default_payment_method: FAILING_PM },
    metadata: { llama_market: market, purpose: 'dunning-simulation' }
  });
  console.log(`  customer    ${customer.id}  (card: fails on charge)`);

  const sub = await stripe().subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    metadata: { plan: 'premium', cycle: 'monthly', market },
    // Let the first invoice through so we start from a healthy subscription.
    trial_period_days: 7
  });
  console.log(`  subscription ${sub.id}  status=${sub.status}`);

  await report(sub.id, 'Day 0 - trialing');

  // Trial ends -> first real charge -> the card fails.
  console.log('\n  advancing 8 days (trial ends, first charge attempted)...');
  await advanceTo(clock.id, now + 8 * DAY);
  await report(sub.id, 'Day 8 - first charge attempted');

  // Stripe's Smart Retries kick in over the following days.
  for (const days of [12, 20, 30]) {
    console.log(`\n  advancing to day ${days} (retry window)...`);
    await advanceTo(clock.id, now + days * DAY);
    await report(sub.id, `Day ${days}`);
  }

  console.log('\n  Check your Railway logs - each failure should have produced');
  console.log('  a [webhook] line, and your store should show status past_due.');
  console.log('\n  Clean up when done:');
  console.log('    node server/scripts/test-dunning.js --cleanup\n');
}

main().catch((err) => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
