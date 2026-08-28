/* ==========================================================================
   GET /api/config - what the browser is allowed to know.

   The front end calls this on load to decide whether to send people to Stripe
   Checkout or fall back to the email-capture dialog. That keeps the site fully
   functional before any keys exist, and means adding keys is the only step
   needed to turn payments on.

   Nothing secret is returned. The publishable key is designed to be public.
   ========================================================================== */

'use strict';

const express = require('express');
const cfg = require('../config');
const geo = require('../geo');

const router = express.Router();

router.get('/config', (req, res) => {
  const missing = cfg.missingPrices();
  const country = geo.detectCountry(req);

  res.set('Cache-Control', 'no-store');
  res.json({
    paymentsEnabled: cfg.paymentsEnabled(),
    publishableKey: cfg.env.publishableKey || null,
    liveMode: cfg.isLiveMode(),
    automaticTax: cfg.env.automaticTax,
    // Lets the browser default to the right currency before the visitor
    // touches the region picker. null when nothing upstream sets a country
    // header (localhost), in which case the browser locale is used instead.
    detectedCountry: country,
    detectedMarket: country ? geo.marketForCountry(country).market : null,
    // Useful while setting up; harmless to expose (it names plans and
    // currencies that are already on the public pricing page).
    unprovisioned: missing.map((m) => `${m.plan}/${m.currency}/${m.cycle}`)
  });
});

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    paymentsEnabled: cfg.paymentsEnabled(),
    stripeConfigured: Boolean(cfg.env.secretKey),
    webhookConfigured: Boolean(cfg.env.webhookSecret),
    pricesProvisioned: cfg.expectedCombinations().length - cfg.missingPrices().length,
    pricesExpected: cfg.expectedCombinations().length
  });
});

module.exports = router;
