/* ==========================================================================
   What each plan actually grants.
   --------------------------------------------------------------------------
   One source of truth, used by:
     - GET /api/me            so the UI can show what the user has
     - the gated API routes   so limits are enforced on the server
     - the account dashboard  so entitlements are legible to the customer

   The numbers mirror the comparison table on the pricing page. If you change
   one here, change it there (tools/pages.js -> COMPARISON in
   assets/js/config.js) or the marketing will start lying.

   `null` means unlimited. Infinity does not survive JSON.
   ========================================================================== */

'use strict';

const PLANS = {
  free: {
    id: 'free',
    rank: 0,
    tripsPerYear: 3,
    itineraryDays: 5,
    travellersPerTrip: 1,
    watchedRoutes: 0,
    multiCityStops: 0,
    conciergeRequestsPerMonth: 0,
    offlineExport: false,
    transitRouting: false,
    entryRequirements: 'summary',
    budgetTracker: false,
    disruptionRebooking: false,
    loyaltyOptimiser: false,
    businessMode: false,
    expenseExport: false,
    calendarSync: false,
    apiAccess: false,
    taxInvoices: false,
    support: 'community'
  },
  premium: {
    id: 'premium',
    rank: 1,
    tripsPerYear: null,
    itineraryDays: null,
    travellersPerTrip: 4,
    watchedRoutes: 20,
    multiCityStops: 3,
    conciergeRequestsPerMonth: 0,
    offlineExport: true,
    transitRouting: true,
    entryRequirements: 'perTraveller',
    budgetTracker: true,
    disruptionRebooking: true,
    loyaltyOptimiser: false,
    businessMode: false,
    expenseExport: false,
    calendarSync: true,
    apiAccess: false,
    taxInvoices: false,
    support: 'email24'
  },
  pro: {
    id: 'pro',
    rank: 2,
    tripsPerYear: null,
    itineraryDays: null,
    travellersPerTrip: 12,
    watchedRoutes: null,
    multiCityStops: null,
    conciergeRequestsPerMonth: 5,
    offlineExport: true,
    transitRouting: true,
    entryRequirements: 'perTraveller',
    budgetTracker: true,
    disruptionRebooking: true,
    loyaltyOptimiser: true,
    businessMode: true,
    expenseExport: true,
    calendarSync: true,
    apiAccess: true,
    taxInvoices: true,
    support: '247'
  }
};

/* Stripe subscription statuses that should still grant paid access.
   `past_due` is deliberately included: the terms promise notice and a grace
   period before paid features are suspended, so a failed payment must not
   lock someone out mid-trip. */
const ENTITLING_STATUSES = new Set(['active', 'trialing', 'past_due']);

/**
 * Resolve the effective plan for a stored subscription record.
 * Anything unknown, cancelled or absent falls back to Free rather than
 * erroring - losing access should never be the failure mode of a bug here.
 *
 * @param {object|null} record from server/store.js
 * @returns {{plan: object, status: string, reason: string}}
 */
function resolve(record) {
  if (!record) {
    return { plan: PLANS.free, status: 'none', reason: 'no_subscription' };
  }
  if (!ENTITLING_STATUSES.has(record.status)) {
    return { plan: PLANS.free, status: record.status, reason: 'subscription_not_active' };
  }
  const plan = PLANS[record.plan];
  if (!plan) {
    return { plan: PLANS.free, status: record.status, reason: 'unknown_plan' };
  }
  return { plan, status: record.status, reason: 'ok' };
}

/**
 * Is a numeric limit exceeded?
 * @param {number|null} limit null = unlimited
 * @param {number} used
 */
function withinLimit(limit, used) {
  return limit === null || used < limit;
}

function describeLimit(limit) {
  return limit === null ? 'unlimited' : String(limit);
}

/** Everything the browser needs to render the account page. */
function publicView(record) {
  const { plan, status, reason } = resolve(record);
  return {
    plan: plan.id,
    planRank: plan.rank,
    status,
    reason,
    cycle: record ? record.cycle || null : null,
    market: record ? record.market || null : null,
    currency: record ? record.currency || null : null,
    currentPeriodEnd: record ? record.currentPeriodEnd || null : null,
    cancelAtPeriodEnd: record ? Boolean(record.cancelAtPeriodEnd) : false,
    // Set when the billing country Stripe collected does not belong to the
    // market we charged in - so the account page can offer to correct it.
    billingCountry: record ? record.country || null : null,
    billingMismatch: record ? Boolean(record.billingMismatch) : false,
    suggestedMarket: record ? record.suggestedMarket || null : null,
    entitlements: plan
  };
}

module.exports = {
  PLANS,
  ENTITLING_STATUSES,
  resolve,
  withinLimit,
  describeLimit,
  publicView
};
