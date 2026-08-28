/* ==========================================================================
   Which market does a billing country belong to?
   --------------------------------------------------------------------------
   The site prices in six markets, but customers arrive from anywhere. Two
   jobs here:

     1. Guess the visitor's country from edge headers, so the default currency
        is usually right before they touch the region picker.
     2. Map any billing country onto one of our six markets, so the price we
        charged can be checked against the address Stripe collected.

   No IP database and no network lookups - only headers a CDN or platform
   already sets. Absent those, detection returns null and the browser's own
   locale is used instead.
   ========================================================================== */

'use strict';

/* Countries using the euro, so a Spanish or Irish billing address maps onto
   our EUR pricing rather than falling through to USD. */
const EUROZONE = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV',
  'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES'
]);

/* Exact matches take priority over the eurozone fallback. */
const DIRECT = {
  US: 'US',
  GB: 'GB',
  IN: 'IN',
  JP: 'JP',
  FR: 'FR',
  DE: 'DE'
};

/**
 * Map an ISO-3166 alpha-2 country onto one of our markets.
 * Anything unrecognised falls back to US/USD, which is the default catalogue.
 *
 * @param {string} country
 * @returns {{market: string, exact: boolean}} exact=false means we approximated
 */
function marketForCountry(country) {
  const code = String(country || '').trim().toUpperCase();
  if (!code) return { market: 'US', exact: false };
  if (DIRECT[code]) return { market: code, exact: true };
  if (EUROZONE.has(code)) return { market: 'DE', exact: false };
  return { market: 'US', exact: false };
}

/**
 * Does a billing country belong to the market we priced in?
 * Used to reconcile the charge against the address Stripe collected.
 */
function countryMatchesMarket(country, market) {
  const code = String(country || '').trim().toUpperCase();
  if (!code || !market) return true; // nothing to contradict
  const resolved = marketForCountry(code);

  // DE and FR share the euro catalogue, so either satisfies the other.
  const EUR_MARKETS = new Set(['DE', 'FR']);
  if (EUR_MARKETS.has(market) && EUR_MARKETS.has(resolved.market)) return true;

  return resolved.market === market;
}

/* Headers set by common CDNs and hosts. First hit wins. */
const COUNTRY_HEADERS = [
  'cf-ipcountry',              // Cloudflare
  'x-vercel-ip-country',       // Vercel
  'cloudfront-viewer-country', // AWS CloudFront
  'x-appengine-country',       // Google App Engine
  'fastly-client-country',     // Fastly
  'x-country-code'             // generic / self-set
];

/**
 * Best-effort country for the request. Returns null when nothing is in front
 * of the app setting these - which is the case on localhost.
 */
function detectCountry(req) {
  for (const header of COUNTRY_HEADERS) {
    const value = req.get(header);
    if (value && /^[A-Za-z]{2}$/.test(value.trim()) && value.trim().toUpperCase() !== 'XX') {
      return value.trim().toUpperCase();
    }
  }
  return null;
}

module.exports = {
  EUROZONE,
  marketForCountry,
  countryMatchesMarket,
  detectCountry
};
