/* ==========================================================================
   Signed session cookies.
   --------------------------------------------------------------------------
   Stateless: the cookie carries the Stripe customer ID and an expiry, HMAC
   signed so it cannot be forged. No session table to keep, and no dependency
   beyond node's crypto.

   The cookie is httpOnly, so page scripts cannot read it and an XSS bug
   cannot exfiltrate a login. SameSite=Lax so it survives the redirect back
   from Stripe Checkout while still blocking cross-site POSTs.
   ========================================================================== */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const COOKIE = 'llama_session';
const MAX_AGE_DAYS = 30;
const DATA_DIR = process.env.LLAMA_DATA_DIR || path.join(__dirname, 'data');
const SECRET_FILE = path.join(DATA_DIR, 'session-secret');

/* --- Secret ----------------------------------------------------------------
   Prefer SESSION_SECRET from the environment. Otherwise generate one and
   persist it, so restarting the server does not sign everyone out. An
   ephemeral secret would be a confusing bug rather than a security win.
   -------------------------------------------------------------------------- */
function loadSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) {
    return process.env.SESSION_SECRET;
  }
  try {
    const existing = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (existing.length >= 32) return existing;
  } catch (err) { /* not created yet */ }

  const generated = crypto.randomBytes(48).toString('base64url');
  try {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  } catch (err) {
    console.warn('[session] Could not persist a session secret; sessions will not survive a restart.');
  }
  return generated;
}

const SECRET = loadSecret();

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

/**
 * @param {{sub: string, email?: string|null}} payload  sub = Stripe customer ID
 * @returns {string} cookie value
 */
function encode(payload) {
  const body = {
    sub: payload.sub,
    email: payload.email || null,
    exp: Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString('base64url');
  return encoded + '.' + sign(encoded);
}

/**
 * @returns {{sub: string, email: string|null, exp: number}|null}
 */
function decode(value) {
  if (typeof value !== 'string' || !value.includes('.')) return null;
  const index = value.lastIndexOf('.');
  const encoded = value.slice(0, index);
  const signature = value.slice(index + 1);

  const expected = sign(encoded);
  // Constant-time compare; lengths must match first or timingSafeEqual throws.
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  let body;
  try {
    body = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch (err) {
    return null;
  }
  if (!body || typeof body.sub !== 'string') return null;
  if (typeof body.exp !== 'number' || body.exp < Date.now()) return null;
  return body;
}

/* --- Cookie plumbing ------------------------------------------------------- */

function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) {
      try { out[key] = decodeURIComponent(value); } catch (e) { out[key] = value; }
    }
  }
  return out;
}

function isSecureOrigin() {
  return String(process.env.SITE_URL || '').startsWith('https://');
}

function setSession(res, payload) {
  const value = encode(payload);
  const attrs = [
    `${COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${MAX_AGE_DAYS * 24 * 60 * 60}`
  ];
  if (isSecureOrigin()) attrs.push('Secure');
  res.append('Set-Cookie', attrs.join('; '));
}

function clearSession(res) {
  const attrs = [`${COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecureOrigin()) attrs.push('Secure');
  res.append('Set-Cookie', attrs.join('; '));
}

/** Express middleware: puts `req.session` on every request (null when absent). */
function attach(req, res, next) {
  const cookies = parseCookies(req);
  req.session = decode(cookies[COOKIE]);
  next();
}

/** Guard for routes that require a signed-in customer. */
function requireSession(req, res, next) {
  if (!req.session) {
    return res.status(401).json({ error: 'not_signed_in', message: 'Sign in to continue.' });
  }
  next();
}

module.exports = {
  COOKIE,
  encode,
  decode,
  setSession,
  clearSession,
  attach,
  requireSession,
  parseCookies
};
