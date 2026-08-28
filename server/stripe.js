/* Stripe client. Lazily constructed so the app boots without credentials. */

'use strict';

const Stripe = require('stripe');
const { env } = require('./config');

let client = null;
let override = null;

/**
 * Replace the client with a stub. Test seam only - see server/scripts/test.js.
 * Pass null to restore the real client.
 */
function setClientForTests(stub) {
  override = stub;
}

/**
 * @returns {import('stripe').Stripe}
 * @throws when STRIPE_SECRET_KEY is absent - callers should check
 *         paymentsEnabled() first and degrade gracefully.
 */
function stripe() {
  if (override) return override;
  if (!env.secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (!client) {
    client = new Stripe(env.secretKey, {
      // Pin the API version so a Stripe-side upgrade cannot change behaviour
      // underneath us. Bump deliberately, after reading the changelog.
      apiVersion: '2026-07-29.dahlia',
      appInfo: { name: 'Llama LLC site', version: '1.0.0' },
      maxNetworkRetries: 2,
      timeout: 20000
    });
  }
  return client;
}

module.exports = { stripe, setClientForTests };
