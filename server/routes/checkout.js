/* ==========================================================================
   POST /api/checkout - create a Stripe Checkout Session for a subscription.

   The browser sends only {plan, cycle, market, email?}. It never sends an
   amount: the price is resolved server-side from the provisioned catalogue,
   so a tampered request cannot change what is charged.
   ========================================================================== */

'use strict';

const express = require('express');
const { stripe } = require('../stripe');
const cfg = require('../config');

const router = express.Router();

const VALID_PLANS = new Set(cfg.PAID_PLANS);
const VALID_CYCLES = new Set(cfg.CYCLES);

router.post('/checkout', async (req, res) => {
  const { plan, cycle, market, email, language } = req.body || {};

  /* --- Validate everything that came from the client --- */
  if (!VALID_PLANS.has(plan)) {
    return res.status(400).json({ error: 'unknown_plan', message: 'Unknown plan.' });
  }
  if (!VALID_CYCLES.has(cycle)) {
    return res.status(400).json({ error: 'unknown_cycle', message: 'Unknown billing cycle.' });
  }
  if (!cfg.shared.MARKETS[market]) {
    return res.status(400).json({ error: 'unknown_market', message: 'Unknown market.' });
  }
  if (!cfg.paymentsEnabled()) {
    return res.status(503).json({
      error: 'payments_disabled',
      message: 'Payments are not configured on this server.'
    });
  }

  const priceId = cfg.getPriceId(plan, market, cycle);
  if (!priceId) {
    return res.status(503).json({
      error: 'price_not_provisioned',
      message: 'No Stripe price exists for that plan in this market yet.'
    });
  }

  const marketMeta = cfg.shared.MARKETS[market];
  const locale = cfg.STRIPE_LOCALES[language] || cfg.STRIPE_LOCALES[marketMeta.lang] || 'auto';

  // Taken from the signed session cookie, never from the request body - a
  // caller must not be able to attach a checkout to someone else's customer.
  const sessionCustomerId = req.session ? req.session.sub : null;
  const validEmail = typeof email === 'string' && email.includes('@') ? email : null;

  // Every market code is also its ISO country code, so this doubles as the
  // billing country we want Checkout to pre-select.
  const marketCountry = marketMeta.code;

  try {
    // Resolve a Customer carrying the right billing country BEFORE creating
    // the session. Without one, Checkout pre-selects the Stripe account's own
    // country (US) on every session - so a German buying in EUR would be
    // defaulted to a US billing address, and Stripe would compute US sales tax
    // on a euro subscription unless they noticed and changed it.
    const customerId = await resolveCustomer(sessionCustomerId, marketCountry, validEmail, market);

    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],

      // Stripe Tax computes VAT / GST / sales tax from the billing address.
      // Prices are tax-exclusive, so tax is added on top at this step and the
      // customer's total is higher than the listed price.
      automatic_tax: { enabled: cfg.env.automaticTax },
      billing_address_collection: 'required',

      // Lets business customers enter a VAT / GST number and get a reverse
      // charge where it applies. Pro advertises VAT/GST invoicing.
      tax_id_collection: { enabled: true },

      // Always a Customer now, so the billing country is pre-selected and a
      // signed-in subscriber upgrading does not spawn a second record.
      // `customer_update.address` writes whatever they finally enter back onto
      // the customer, which is what lets Stripe calculate tax on RENEWAL
      // invoices too, not just this first charge.
      // `customer_email` must not be sent alongside `customer` - Stripe
      // rejects both together - so the email lives on the customer instead.
      customer: customerId,
      customer_update: { address: 'auto', name: 'auto' },

      allow_promotion_codes: true,
      locale,

      // Surfaced on the invoice and used by the webhook to grant entitlements.
      subscription_data: {
        metadata: { plan, cycle, market, currency: marketMeta.currency }
      },
      metadata: { plan, cycle, market },

      success_url: `${cfg.env.siteUrl}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${cfg.env.siteUrl}/pricing.html?checkout=cancelled`
    }, {
      // Guards against a double-click creating two subscriptions.
      idempotencyKey: req.get('X-Idempotency-Key') || undefined
    });

    return res.json({ id: session.id, url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error:', err.type || err.name, '-', err.message);
    return res.status(502).json({
      error: 'stripe_error',
      message: 'Could not start checkout. Please try again.'
    });
  }
});

/**
 * Return a Stripe customer ID whose address country matches the market being
 * bought, so Checkout pre-selects the right billing country.
 *
 * @param {string|null} sessionCustomerId from the signed session cookie
 * @param {string} country  ISO country for the market
 * @param {string|null} email
 * @param {string} market
 */
async function resolveCustomer(sessionCustomerId, country, email, market) {
  if (sessionCustomerId) {
    try {
      const existing = await stripe().customers.retrieve(sessionCustomerId);
      if (!existing.deleted) {
        // Only seed a country when we have none. An address the customer has
        // already given us is better information than the market default, and
        // must not be overwritten.
        if (!existing.address || !existing.address.country) {
          await stripe().customers.update(sessionCustomerId, { address: { country: country } });
        }
        return sessionCustomerId;
      }
    } catch (err) {
      console.warn('[checkout] Session customer unusable, creating a new one:', err.message);
    }
  }

  const created = await stripe().customers.create({
    email: email || undefined,
    address: { country: country },
    metadata: { llama_market: market, source: 'checkout' }
  });
  return created.id;
}

/* --- GET /api/session/:id -------------------------------------------------
   Used by the success page to confirm what was bought. Returns only what is
   safe to show the person who just completed that session.
   -------------------------------------------------------------------------- */
router.get('/session/:id', async (req, res) => {
  const id = req.params.id;
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) {
    return res.status(400).json({ error: 'bad_session_id' });
  }
  if (!cfg.env.secretKey) {
    return res.status(503).json({ error: 'payments_disabled' });
  }

  try {
    const session = await stripe().checkout.sessions.retrieve(id, {
      expand: ['subscription', 'customer_details']
    });

    return res.json({
      status: session.status,
      paymentStatus: session.payment_status,
      email: session.customer_details ? session.customer_details.email : null,
      plan: session.metadata ? session.metadata.plan : null,
      cycle: session.metadata ? session.metadata.cycle : null,
      market: session.metadata ? session.metadata.market : null,
      currency: session.currency ? session.currency.toUpperCase() : null,
      amountTotal: session.amount_total !== null && session.currency
        ? cfg.fromStripeAmount(session.amount_total, session.currency)
        : null,
      amountTax: session.total_details && session.currency
        ? cfg.fromStripeAmount(session.total_details.amount_tax, session.currency)
        : null
    });
  } catch (err) {
    console.error('[session] Stripe error:', err.message);
    return res.status(404).json({ error: 'session_not_found' });
  }
});

module.exports = router;
