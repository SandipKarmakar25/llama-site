/* ==========================================================================
   Trips - a real, gated resource.

   This exists to prove entitlements are enforced where it counts. The limits
   are checked here, on the server, against the plan resolved from Stripe.
   Hiding a button in the UI is not access control; this is.

   Replace with the real trips service. What matters is the shape: resolve the
   plan from the subscription record, check the limit, refuse with a reason
   the UI can act on (402 + upgrade target).
   ========================================================================== */

'use strict';

const express = require('express');
const store = require('../store');
const session = require('../session');
const entitlements = require('../entitlements');

const router = express.Router();

router.get('/trips', session.requireSession, (req, res) => {
  const record = store.getSubscription(req.session.sub);
  const { plan } = entitlements.resolve(record);
  const trips = store.listTrips(req.session.sub);

  res.set('Cache-Control', 'no-store');
  res.json({
    trips,
    usage: {
      thisYear: store.countTripsInCurrentYear(req.session.sub),
      limit: plan.tripsPerYear,
      limitLabel: entitlements.describeLimit(plan.tripsPerYear)
    },
    plan: plan.id
  });
});

router.post('/trips', session.requireSession, (req, res) => {
  const record = store.getSubscription(req.session.sub);
  const { plan } = entitlements.resolve(record);
  const body = req.body || {};

  const destination = String(body.destination || '').trim().slice(0, 120);
  const travellers = Number(body.travellers) || 1;
  const days = Number(body.days) || 1;

  if (!destination) {
    return res.status(400).json({ error: 'destination_required', message: 'Where are you going?' });
  }

  /* --- Limit: trips per year --- */
  const used = store.countTripsInCurrentYear(req.session.sub);
  if (!entitlements.withinLimit(plan.tripsPerYear, used)) {
    return res.status(402).json({
      error: 'limit_reached',
      limit: 'tripsPerYear',
      message: `The ${plan.id} plan covers ${plan.tripsPerYear} trips a year. You have planned ${used}.`,
      used,
      allowed: plan.tripsPerYear,
      upgradeTo: plan.rank < 1 ? 'premium' : 'pro'
    });
  }

  /* --- Limit: travellers per trip --- */
  if (!entitlements.withinLimit(plan.travellersPerTrip, travellers - 1)) {
    return res.status(402).json({
      error: 'limit_reached',
      limit: 'travellersPerTrip',
      message: `The ${plan.id} plan covers ${plan.travellersPerTrip} traveller(s) per trip.`,
      used: travellers,
      allowed: plan.travellersPerTrip,
      upgradeTo: plan.rank < 1 ? 'premium' : 'pro'
    });
  }

  /* --- Limit: itinerary length --- */
  if (!entitlements.withinLimit(plan.itineraryDays, days - 1)) {
    return res.status(402).json({
      error: 'limit_reached',
      limit: 'itineraryDays',
      message: `The ${plan.id} plan covers itineraries up to ${plan.itineraryDays} days.`,
      used: days,
      allowed: plan.itineraryDays,
      upgradeTo: plan.rank < 1 ? 'premium' : 'pro'
    });
  }

  const trip = store.addTrip(req.session.sub, { destination, travellers, days });

  res.status(201).json({
    trip,
    usage: {
      thisYear: store.countTripsInCurrentYear(req.session.sub),
      limit: plan.tripsPerYear,
      limitLabel: entitlements.describeLimit(plan.tripsPerYear)
    }
  });
});

router.delete('/trips/:id', session.requireSession, (req, res) => {
  const removed = store.deleteTrip(req.session.sub, req.params.id);
  if (!removed) return res.status(404).json({ error: 'not_found' });
  res.json({ ok: true });
});

module.exports = router;
