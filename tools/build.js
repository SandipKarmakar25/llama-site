#!/usr/bin/env node
/* ==========================================================================
   Static page generator.

   The site itself is plain HTML/CSS/JS and needs no build step to run - this
   script exists only so the shared header, footer, modal and cookie banner
   live in one place instead of ten copies. Run it after editing anything in
   tools/, then commit the generated HTML.

       node tools/build.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');

const { page } = require('./layout');
const content = require('./pages');
const legal = require('./pages-legal');

const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  {
    file: 'index.html',
    depth: 0,
    slug: 'home',
    title: 'Llama — your travel planning assistant | Llama LLC',
    description: 'Llama turns a rough idea into a day-by-day itinerary — flights, trains, hotels, bookings and entry rules — and keeps watching it after you book. Free to start.',
    main: content.home
  },
  {
    file: 'features.html',
    depth: 0,
    slug: 'features',
    title: 'Features | Llama',
    description: 'Every Llama feature and the plan it belongs to: itinerary building, fare watching, disruption handling, entry requirements, group trips and business travel mode.',
    main: content.features
  },
  {
    file: 'pricing.html',
    depth: 0,
    slug: 'pricing',
    title: 'Pricing | Llama',
    description: 'Free, Premium and Pro plans priced in USD, GBP, EUR, INR and JPY, with local tax handling for the US, UK, Germany, France, India and Japan.',
    main: content.pricing
  },
  {
    file: 'about.html',
    depth: 0,
    slug: 'about',
    title: 'About | Llama LLC',
    description: 'Llama LLC builds a travel planning assistant. How we make money, what we hold ourselves to, and where we operate.',
    main: content.about
  },
  {
    file: 'contact.html',
    depth: 0,
    slug: 'contact',
    title: 'Contact | Llama',
    description: 'Reach Llama support, billing, privacy or press. Response times by plan, plus our contracting entities across six markets.',
    main: content.contact
  },
  {
    file: 'signup.html',
    depth: 0,
    slug: 'signup',
    title: 'Create your account | Llama',
    description: 'Start on the Free plan straight away, or register interest in Premium and Pro. No card is requested and no payment processor is connected.',
    main: content.signup
  },
  {
    file: 'checkout-success.html',
    depth: 0,
    slug: 'checkout-success',
    title: 'Subscription confirmed | Llama',
    description: 'Your Llama subscription is active.',
    main: content.checkoutSuccess
  },
  {
    file: 'account.html',
    depth: 0,
    slug: 'account',
    title: 'Manage your subscription | Llama',
    description: 'Update your card, download VAT or GST invoices, switch plan or cancel your Llama subscription.',
    main: content.account
  },
  {
    file: '404.html',
    depth: 0,
    slug: 'not-found',
    title: 'Page not found | Llama',
    description: 'That page could not be found.',
    main: content.notFound
  },
  {
    file: path.join('legal', 'privacy.html'),
    depth: 1,
    slug: 'privacy',
    title: 'Privacy notice | Llama',
    description: 'What Llama collects, why, how long we keep it, and your rights under GDPR, UK GDPR, CCPA/CPRA, India DPDP and Japan APPI.',
    main: legal.privacy
  },
  {
    file: path.join('legal', 'terms.html'),
    depth: 1,
    slug: 'terms',
    title: 'Terms of service | Llama',
    description: 'The agreement between you and Llama: plans, billing, acceptable use, third-party bookings, accuracy limits and liability.',
    main: legal.terms
  },
  {
    file: path.join('legal', 'cookies.html'),
    depth: 1,
    slug: 'cookies',
    title: 'Cookie policy | Llama',
    description: 'Which cookies and browser storage Llama uses, which are optional, and how to change your choices.',
    main: legal.cookies
  },
  {
    file: path.join('legal', 'refunds.html'),
    depth: 1,
    slug: 'refunds',
    title: 'Refunds and cancellation | Llama',
    description: 'How to cancel a Llama subscription, the EU and UK 14-day right of withdrawal, and our money-back guarantee in other markets.',
    main: legal.refunds
  }
];

let written = 0;
for (const spec of PAGES) {
  const target = path.join(ROOT, spec.file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, page(spec), 'utf8');
  const kb = (fs.statSync(target).size / 1024).toFixed(1);
  console.log(`  ${spec.file.padEnd(24)} ${kb.padStart(6)} kB`);
  written++;
}

console.log(`\nGenerated ${written} pages.`);
