/* ==========================================================================
   Identity: how a browser proves which Stripe customer it is.

   Two ways in, no passwords:

   1. POST /api/auth/claim  {session_id}
      Straight after paying. The Checkout Session ID is a one-time secret that
      only the paying browser receives, via Stripe's redirect. We verify with
      Stripe that it is genuinely paid, then issue a session cookie. This is
      what stops a customer landing back at square one after checkout.

   2. POST /api/auth/link   {email}  ->  GET /api/auth/verify?token=...
      For returning visitors. Emails a single-use link. Delivery is pluggable
      and currently unimplemented - see sendLoginEmail() below.
   ========================================================================== */

'use strict';

const express = require('express');
const { stripe } = require('../stripe');
const cfg = require('../config');
const store = require('../store');
const session = require('../session');
const entitlements = require('../entitlements');

const router = express.Router();

/* --- Rate limiting ---------------------------------------------------------
   Crude in-memory limiter. Enough to stop someone enumerating email addresses
   or hammering the Stripe API from this box; replace with a shared store when
   you run more than one instance.
   -------------------------------------------------------------------------- */
const attempts = new Map();

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.reset) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  entry.count++;
  return entry.count <= max;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) if (now > entry.reset) attempts.delete(key);
}, 10 * 60 * 1000).unref();

/* --- 1. Claim a session after checkout ------------------------------------ */

router.post('/auth/claim', async (req, res) => {
  const sessionId = (req.body || {}).session_id;

  if (!/^cs_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) {
    return res.status(400).json({ error: 'bad_session_id' });
  }
  if (!rateLimit('claim:' + req.ip, 20, 60 * 1000)) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  if (!cfg.env.secretKey) {
    return res.status(503).json({ error: 'payments_disabled' });
  }

  try {
    const checkout = await stripe().checkout.sessions.retrieve(sessionId);

    // Only a genuinely completed payment gets a session. Anything else and we
    // would be handing out access on the strength of a guessed URL.
    const paid = checkout.payment_status === 'paid' || checkout.payment_status === 'no_payment_required';
    if (checkout.status !== 'complete' || !paid) {
      return res.status(402).json({
        error: 'not_paid',
        message: 'That checkout session has not completed.'
      });
    }

    const customerId = typeof checkout.customer === 'string'
      ? checkout.customer
      : checkout.customer && checkout.customer.id;
    if (!customerId) {
      return res.status(422).json({ error: 'no_customer' });
    }

    const email = checkout.customer_details ? checkout.customer_details.email : null;

    // The webhook is the authority on subscription state, but it can arrive
    // after the redirect. Seed a record so the dashboard is not empty for the
    // first few seconds; the webhook overwrites it with the real thing.
    if (!store.getSubscription(customerId)) {
      store.upsertSubscription(customerId, {
        email,
        plan: checkout.metadata ? checkout.metadata.plan : null,
        cycle: checkout.metadata ? checkout.metadata.cycle : null,
        market: checkout.metadata ? checkout.metadata.market : null,
        status: 'active',
        provisional: true
      });
    }

    session.setSession(res, { sub: customerId, email });
    return res.json({ ok: true, me: buildMe(customerId, email) });
  } catch (err) {
    console.error('[auth/claim]', err.message);
    return res.status(502).json({ error: 'stripe_error' });
  }
});

/* --- 2. Magic link -------------------------------------------------------- */

router.post('/auth/link', async (req, res) => {
  const email = String((req.body || {}).email || '').trim().toLowerCase();

  if (!email.includes('@') || email.length > 320) {
    return res.status(400).json({ error: 'bad_email' });
  }
  if (!rateLimit('link:' + req.ip, 5, 15 * 60 * 1000)) {
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Too many sign-in requests. Try again shortly.'
    });
  }

  let record = store.findByEmail(email);

  // Fall back to Stripe: the webhook may not have recorded this customer on
  // this machine (fresh checkout, different environment, restored data).
  if (!record && cfg.env.secretKey) {
    try {
      const found = await stripe().customers.list({ email, limit: 1 });
      if (found.data.length) record = { customerId: found.data[0].id, email };
    } catch (err) {
      console.error('[auth/link] Stripe lookup failed:', err.message);
    }
  }

  // Always answer the same way. Telling an anonymous caller whether an address
  // has a subscription would leak customer data.
  const generic = { ok: true, message: 'If that address has a subscription, a sign-in link is on its way.' };

  if (!record || !record.customerId) {
    return res.json(generic);
  }

  const token = store.createLoginToken(email, record.customerId);
  const url = `${cfg.env.siteUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;
  await sendLoginEmail(email, url);

  // In test mode, hand the link back so the flow is usable without an email
  // provider. Never in live mode - that would make the link readable by
  // anyone who can POST this endpoint.
  if (!cfg.isLiveMode()) {
    return res.json(Object.assign({}, generic, { devLoginUrl: url }));
  }
  return res.json(generic);
});

router.get('/auth/verify', (req, res) => {
  const entry = store.consumeLoginToken(req.query.token);
  if (!entry) {
    return res.redirect(302, '/account.html?signin=expired');
  }
  session.setSession(res, { sub: entry.customerId, email: entry.email });
  return res.redirect(302, '/account.html?signin=ok');
});

/* --- 3. Session state ----------------------------------------------------- */

router.get('/me', (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!req.session) {
    return res.json({ signedIn: false, plan: 'free', entitlements: entitlements.PLANS.free });
  }
  res.json(buildMe(req.session.sub, req.session.email));
});

router.post('/auth/signout', (req, res) => {
  session.clearSession(res);
  res.json({ ok: true });
});

function buildMe(customerId, email) {
  const record = store.getSubscription(customerId);
  const view = entitlements.publicView(record);
  return Object.assign({
    signedIn: true,
    email: (record && record.email) || email || null,
    customerId,
    tripsThisYear: store.countTripsInCurrentYear(customerId)
  }, view);
}

/**
 * Deliver a sign-in link.
 *
 * NOT IMPLEMENTED - there is no email provider configured. Wire this to
 * Postmark / SES / Resend before launch, or the magic-link path is unusable
 * in production. In test mode the link is returned by /api/auth/link and
 * logged below, which is enough to exercise the flow locally.
 */
async function sendLoginEmail(email, url) {
  console.log(`[auth] Sign-in link for ${email}: ${url}`);
  console.log('[auth] (No email provider configured - see sendLoginEmail in server/routes/auth.js)');
}

module.exports = router;
module.exports.buildMe = buildMe;
