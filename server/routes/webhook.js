/* ==========================================================================
   POST /api/stripe/webhook

   Two rules this file exists to enforce:
     1. The signature must be verified against the RAW body. Any JSON parsing
        before this point breaks verification - see the mount order in index.js.
     2. Handlers must be idempotent. Stripe retries, and will occasionally
        deliver the same event twice.

   Everything that grants or revokes access happens here, never in the
   browser redirect - a customer closing the tab must not lose their
   subscription, and a crafted redirect must not create one.
   ========================================================================== */

'use strict';

const express = require('express');
const { stripe } = require('../stripe');
const cfg = require('../config');
const store = require('../store');
const geo = require('../geo');

const router = express.Router();

/* Events we act on. Anything else is acknowledged and ignored. */
const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed'
]);

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!cfg.env.webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set - refusing unverified events.');
    return res.status(503).send('Webhook not configured');
  }

  let event;
  try {
    event = stripe().webhooks.constructEvent(
      req.body,
      req.get('stripe-signature'),
      cfg.env.webhookSecret
    );
  } catch (err) {
    // Do not leak detail to an unauthenticated caller.
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).send('Invalid signature');
  }

  // Acknowledge fast. Stripe times out at 20s and will retry on a slow reply.
  res.json({ received: true });

  if (!HANDLED.has(event.type)) return;
  if (store.alreadyProcessed(event.id)) {
    console.log(`[webhook] ${event.type} ${event.id} already applied - skipping.`);
    return;
  }

  try {
    await handleEvent(event);
    store.markProcessed(event.id);
  } catch (err) {
    // Logged, not rethrown: we have already replied 200. Alert on this in
    // production so a failed projection does not go unnoticed.
    console.error(`[webhook] Failed to handle ${event.type} ${event.id}:`, err.message);
  }
});

async function handleEvent(event) {
  const object = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (object.mode !== 'subscription') return;
      const subscriptionId = typeof object.subscription === 'string'
        ? object.subscription
        : object.subscription && object.subscription.id;

      const billingCountry = object.customer_details && object.customer_details.address
        ? object.customer_details.address.country
        : null;
      const pricedMarket = object.metadata ? object.metadata.market : null;

      // The currency came from the region the visitor picked; the tax came
      // from the address they typed at Stripe. Those can disagree - someone
      // browsing the US site with a German card, say. Record it so the
      // account page can offer to move them onto the right regional price.
      const mismatch = Boolean(
        billingCountry && pricedMarket &&
        !geo.countryMatchesMarket(billingCountry, pricedMarket)
      );

      const record = {
        email: object.customer_details ? object.customer_details.email : null,
        name: object.customer_details ? object.customer_details.name : null,
        country: billingCountry,
        billingMismatch: mismatch,
        suggestedMarket: mismatch ? geo.marketForCountry(billingCountry).market : null,
        subscriptionId,
        plan: object.metadata ? object.metadata.plan : null,
        cycle: object.metadata ? object.metadata.cycle : null,
        market: object.metadata ? object.metadata.market : null,
        currency: object.currency ? object.currency.toUpperCase() : null,
        status: 'active',
        checkoutSessionId: object.id
      };

      store.upsertSubscription(customerIdOf(object), record);
      console.log(`[webhook] Subscription started: ${record.plan}/${record.cycle} in ${record.market} (${record.email})`);
      // Hook point: provision the account, send a welcome email.
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const item = object.items && object.items.data && object.items.data[0];
      store.upsertSubscription(customerIdOf(object), {
        subscriptionId: object.id,
        status: object.status,
        plan: object.metadata ? object.metadata.plan : undefined,
        cycle: object.metadata ? object.metadata.cycle : undefined,
        market: object.metadata ? object.metadata.market : undefined,
        priceId: item ? item.price.id : undefined,
        currency: item && item.price.currency ? item.price.currency.toUpperCase() : undefined,
        currentPeriodEnd: object.current_period_end
          ? new Date(object.current_period_end * 1000).toISOString()
          : undefined,
        cancelAtPeriodEnd: Boolean(object.cancel_at_period_end)
      });
      console.log(`[webhook] Subscription ${object.id} is now ${object.status}` +
        (object.cancel_at_period_end ? ' (cancels at period end)' : ''));
      break;
    }

    case 'customer.subscription.deleted': {
      store.upsertSubscription(customerIdOf(object), {
        subscriptionId: object.id,
        status: 'canceled',
        cancelAtPeriodEnd: false,
        endedAt: new Date().toISOString()
      });
      console.log(`[webhook] Subscription ${object.id} ended - downgrade to Free.`);
      // Hook point: revoke paid entitlements, keep the user's trips readable.
      break;
    }

    case 'invoice.paid': {
      store.upsertSubscription(customerIdOf(object), {
        status: 'active',
        lastInvoiceId: object.id,
        lastPaidAt: new Date().toISOString()
      });
      break;
    }

    case 'invoice.payment_failed': {
      store.upsertSubscription(customerIdOf(object), {
        status: 'past_due',
        lastFailedInvoiceId: object.id
      });
      console.warn(`[webhook] Payment failed for invoice ${object.id}.`);
      // Hook point: dunning email. Terms promise notice and a grace period
      // before paid features are suspended.
      break;
    }
  }
}

function customerIdOf(object) {
  if (!object) return null;
  return typeof object.customer === 'string'
    ? object.customer
    : object.customer && object.customer.id;
}

module.exports = router;
