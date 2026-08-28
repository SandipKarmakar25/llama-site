/* ==========================================================================
   Subscription state.
   --------------------------------------------------------------------------
   A JSON file behind a narrow interface, deliberately. Swap the four functions
   below for real database calls when you have one - nothing else in the server
   touches storage.

   Stripe remains the source of truth for billing. This is a local projection
   so the app can answer "is this account entitled to Pro?" without a round
   trip on every request.
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

/* Data directory is overridable so tests never touch real data. */
const DATA_DIR = process.env.LLAMA_DATA_DIR || path.join(__dirname, 'data');

const FILE = path.join(DATA_DIR, 'subscriptions.json');

function ensureDir() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
}

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    return {};
  }
}

function writeAll(data) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * Record or update what we know about a customer's subscription.
 * Keyed by Stripe customer ID.
 */
function upsertSubscription(customerId, record) {
  if (!customerId) return null;
  const all = readAll();
  all[customerId] = Object.assign({}, all[customerId], record, {
    customerId,
    updatedAt: new Date().toISOString()
  });
  writeAll(all);
  return all[customerId];
}

function getSubscription(customerId) {
  return readAll()[customerId] || null;
}

function findByEmail(email) {
  if (!email) return null;
  const all = readAll();
  const key = Object.keys(all).find(
    (id) => all[id].email && all[id].email.toLowerCase() === email.toLowerCase()
  );
  return key ? all[key] : null;
}

function listSubscriptions() {
  return Object.values(readAll());
}

/* --- Webhook replay protection --------------------------------------------
   Stripe retries deliveries, and can deliver the same event more than once.
   Handlers must be idempotent; this records what we have already applied.
   -------------------------------------------------------------------------- */
const EVENTS_FILE = path.join(DATA_DIR, 'processed-events.json');
const MAX_REMEMBERED = 1000;

function alreadyProcessed(eventId) {
  try {
    const seen = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    return seen.includes(eventId);
  } catch (err) {
    return false;
  }
}

function markProcessed(eventId) {
  ensureDir();
  let seen = [];
  try {
    seen = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch (err) {
    seen = [];
  }
  seen.push(eventId);
  if (seen.length > MAX_REMEMBERED) seen = seen.slice(-MAX_REMEMBERED);
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(seen), 'utf8');
}

/* --- Sign-in tokens (magic links) -----------------------------------------
   Single use, short lived. Stored hashed so a leaked data file cannot be
   replayed into a login.
   -------------------------------------------------------------------------- */
const crypto = require('crypto');
const TOKENS_FILE = path.join(DATA_DIR, 'login-tokens.json');
const TOKEN_TTL_MS = 15 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch (err) {
    return {};
  }
}

function writeTokens(data) {
  ensureDir();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function createLoginToken(email, customerId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const all = readTokens();

  // Drop anything already expired while we are here.
  const now = Date.now();
  for (const key of Object.keys(all)) {
    if (all[key].expires < now) delete all[key];
  }

  all[hashToken(token)] = {
    email: email,
    customerId: customerId,
    expires: now + TOKEN_TTL_MS
  };
  writeTokens(all);
  return token;
}

/** Returns the token payload and invalidates it, or null. */
function consumeLoginToken(token) {
  if (!token || typeof token !== 'string') return null;
  const all = readTokens();
  const key = hashToken(token);
  const entry = all[key];
  if (!entry) return null;
  delete all[key];
  writeTokens(all);
  if (entry.expires < Date.now()) return null;
  return entry;
}

/* --- Trips ----------------------------------------------------------------
   Exists to demonstrate that plan limits are enforced on the server, not
   merely displayed in the UI. Replace with the real trips table.
   -------------------------------------------------------------------------- */
const TRIPS_FILE = path.join(DATA_DIR, 'trips.json');

function readTrips() {
  try {
    return JSON.parse(fs.readFileSync(TRIPS_FILE, 'utf8'));
  } catch (err) {
    return {};
  }
}

function writeTrips(data) {
  ensureDir();
  fs.writeFileSync(TRIPS_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function listTrips(customerId) {
  return readTrips()[customerId] || [];
}

function addTrip(customerId, trip) {
  const all = readTrips();
  all[customerId] = all[customerId] || [];
  const record = Object.assign({
    id: crypto.randomBytes(8).toString('hex'),
    createdAt: new Date().toISOString()
  }, trip);
  all[customerId].push(record);
  writeTrips(all);
  return record;
}

function countTripsInCurrentYear(customerId) {
  const year = new Date().getUTCFullYear();
  return listTrips(customerId).filter(
    (t) => new Date(t.createdAt).getUTCFullYear() === year
  ).length;
}

function deleteTrip(customerId, tripId) {
  const all = readTrips();
  const before = (all[customerId] || []).length;
  all[customerId] = (all[customerId] || []).filter((t) => t.id !== tripId);
  writeTrips(all);
  return all[customerId].length < before;
}

module.exports = {
  upsertSubscription,
  getSubscription,
  findByEmail,
  listSubscriptions,
  alreadyProcessed,
  markProcessed,
  createLoginToken,
  consumeLoginToken,
  listTrips,
  addTrip,
  countTripsInCurrentYear,
  deleteTrip
};
