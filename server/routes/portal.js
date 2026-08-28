/* ==========================================================================
   POST /api/portal - open the Stripe Customer Portal.

   This is how a customer updates their card, downloads VAT/GST invoices,
   switches plan or cancels. The terms and the refunds policy both promise
   cancellation without a phone call, so this route is what makes that true.

   The customer ID comes from the signed session cookie, never from the
   request body. An earlier version accepted an email address, which meant
   anyone who guessed a subscriber's address could open their billing page.
   ========================================================================== */

'use strict';

const express = require('express');
const { stripe } = require('../stripe');
const cfg = require('../config');
const session = require('../session');

const router = express.Router();

router.post('/portal', session.requireSession, async (req, res) => {
  if (!cfg.env.secretKey) {
    return res.status(503).json({ error: 'payments_disabled' });
  }

  try {
    const portalSession = await stripe().billingPortal.sessions.create({
      customer: req.session.sub,
      return_url: `${cfg.env.siteUrl}/account.html`
    });
    return res.json({ url: portalSession.url });
  } catch (err) {
    console.error('[portal] Stripe error:', err.message);
    return res.status(502).json({
      error: 'stripe_error',
      message: 'Could not open the billing portal.'
    });
  }
});

module.exports = router;
