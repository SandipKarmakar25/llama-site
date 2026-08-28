#!/usr/bin/env node
/* ==========================================================================
   Llama LLC - application server.

   Serves the static site and the Stripe endpoints from one origin, so the
   browser needs no CORS handling and cookies stay first-party.

       npm start            # this server, port 4173
       npm run serve        # static only, no Stripe (tools/serve.js)

   The site works with or without Stripe credentials. Without them,
   /api/config reports paymentsEnabled:false and the front end falls back to
   collecting an email address instead of opening Checkout.
   ========================================================================== */

'use strict';

const path = require('path');
const express = require('express');

const cfg = require('./config');
const session = require('./session');
const webhookRoutes = require('./routes/webhook');
const checkoutRoutes = require('./routes/checkout');
const portalRoutes = require('./routes/portal');
const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');

const app = express();
app.disable('x-powered-by');

// Railway, Vercel and every CDN in front of them terminate TLS and forward the
// original client details in X-Forwarded-*. Without this, req.ip is the
// proxy's address - which would make the sign-in rate limiter treat every
// visitor as the same caller - and req.protocol reports http on an https site.
app.set('trust proxy', 1);

/* --- Security headers -----------------------------------------------------
   The CSP allows Stripe's JS and frames because Checkout and the portal are
   redirects today, but Stripe.js is the natural next step (embedded Elements).
   -------------------------------------------------------------------------- */
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(self "https://checkout.stripe.com")',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' https://js.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
      "connect-src 'self' https://api.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "form-action 'self' https://checkout.stripe.com",
      "base-uri 'self'",
      "object-src 'none'"
    ].join('; ')
  });
  next();
});

/* --- Webhook FIRST ---------------------------------------------------------
   Signature verification hashes the raw request body. It must be mounted
   before express.json(), or the body will already have been parsed and
   re-serialised and every signature check will fail.
   -------------------------------------------------------------------------- */
app.use('/api', webhookRoutes);

/* Everything after this point may parse JSON. */
app.use(express.json({ limit: '32kb' }));

/* Puts req.session on every request (null when not signed in). */
app.use(session.attach);

app.use('/api', publicRoutes);
app.use('/api', authRoutes);
app.use('/api', checkoutRoutes);
app.use('/api', portalRoutes);
app.use('/api', tripRoutes);

/* --- Static site ----------------------------------------------------------- */
app.use(express.static(cfg.ROOT, {
  extensions: ['html'],
  setHeaders(res, filePath) {
    // Revalidate rather than cache blind. Assets here are unversioned, so a
    // max-age served stale JS after every edit. ETag still gives us 304s.
    if (/\.(css|js|svg|html)$/.test(filePath)) {
      res.set('Cache-Control', 'no-cache');
    }
  }
}));

/* Unknown /api path -> JSON 404 rather than the static handler's HTML. */
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(cfg.ROOT, '404.html'), (err) => {
    if (err) res.type('html').send('<h1>404</h1><p>Page not found.</p>');
  });
});

/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  console.error('[server]', err.stack || err.message);
  if (res.headersSent) return;
  res.status(500).json({ error: 'server_error' });
});

/* --- Boot ------------------------------------------------------------------ */
function describeState() {
  const missing = cfg.missingPrices();
  const total = cfg.expectedCombinations().length;

  console.log(`\nLlama site  ->  http://localhost:${cfg.env.port}/`);

  if (!cfg.env.secretKey) {
    console.log('  Stripe:   not configured (STRIPE_SECRET_KEY missing)');
    console.log('            The site runs; paid plans collect an email instead of charging.');
    console.log('            Copy server/.env.example to .env to enable payments.');
  } else {
    console.log(`  Stripe:   ${cfg.isLiveMode() ? 'LIVE MODE' : 'test mode'}`);
    console.log(`  Prices:   ${total - missing.length}/${total} provisioned`);
    if (missing.length) {
      console.log(`            Missing: ${missing.map((m) => `${m.plan}/${m.currency}/${m.cycle}`).join(', ')}`);
      console.log('            Run: npm run stripe:provision');
    }
    console.log(`  Webhook:  ${cfg.env.webhookSecret ? 'secret set' : 'NOT SET - subscription events will be rejected'}`);
    if (cfg.isLiveMode()) {
      console.log('\n  !! Live mode: real cards will be charged. !!');
    }
  }

  /* --- Deployment warnings ------------------------------------------------
     These are silent failures in production: everything boots, and only
     breaks once a customer tries to pay or sign in.
     ---------------------------------------------------------------------- */
  const warnings = [];

  if (process.env.NODE_ENV === 'production' || cfg.isLiveMode()) {
    if (cfg.env.siteUrl.includes('localhost')) {
      warnings.push('SITE_URL is still localhost - customers will be redirected there after paying.');
    }
    if (!cfg.env.siteUrl.startsWith('https://')) {
      warnings.push('SITE_URL is not https - the session cookie will not get the Secure flag.');
    }
    if (!process.env.SESSION_SECRET) {
      warnings.push('SESSION_SECRET is not set - a new one is generated per deploy, signing everyone out.');
    }
    if (!process.env.LLAMA_DATA_DIR) {
      warnings.push('LLAMA_DATA_DIR is not set - data is on ephemeral disk and lost on redeploy. Mount a volume, then run: npm run stripe:resync');
    }
  }

  if (warnings.length) {
    console.log('\n  Deployment warnings:');
    warnings.forEach((w) => console.log('    - ' + w));
  }

  console.log('');
}

if (require.main === module) {
  app.listen(cfg.env.port, () => describeState());
}

module.exports = app;
