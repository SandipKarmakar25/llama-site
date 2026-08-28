# Llama LLC — marketing site

Static website for **Llama**, a digital assistant for travel planning, built for six launch
markets: 🇺🇸 US, 🇬🇧 UK, 🇩🇪 Germany, 🇫🇷 France, 🇮🇳 India and 🇯🇵 Japan.

Static HTML, CSS and JavaScript for the site; a small Express server for Stripe subscriptions.
The front end has no framework and no build step.

**The site works with or without Stripe credentials.** Without them, paid plans fall back to
collecting an email address. Add keys and the same buttons open Stripe Checkout — no code change.

---

## Running it

```bash
npm install
npm start
```

Then open <http://localhost:4173>. That serves the site *and* the Stripe endpoints from one
origin, so there is no CORS to configure.

For the static site alone, with no server-side anything:

```bash
npm run serve
```

Opening `index.html` via `file://` also works; only the Stripe calls need the server.

---

## Layout

```
├── index.html            Home
├── features.html         Full feature breakdown, tagged by plan
├── pricing.html          Plans, billing toggle, comparison matrix, FAQ
├── about.html            Company, how we make money, careers, press
├── contact.html          Contact form, response times by plan, offices
├── signup.html           Account creation + order summary
├── checkout-success.html Post-payment confirmation
├── account.html          Entry point to the Stripe billing portal
├── 404.html
├── server/               Express + Stripe (see below)
│   ├── index.js          App entry: static site + API
│   ├── config.js         Env, price catalogue, minor-unit conversion
│   ├── stripe.js         Stripe client
│   ├── entitlements.js   What each plan grants (single source of truth)
│   ├── session.js        Signed session cookies
│   ├── store.js          Subscriptions, tokens, trips (swap for a real DB)
│   ├── routes/           checkout · auth · trips · portal · webhook · public
│   └── scripts/          provision.js · test.js
├── legal/
│   ├── privacy.html      GDPR / UK GDPR / CCPA / DPDP / APPI
│   ├── terms.html        Terms of service
│   ├── cookies.html      Cookie policy
│   └── refunds.html      Refunds, cancellation, 14-day withdrawal rights
├── assets/
│   ├── css/styles.css    Whole design system in one file
│   ├── js/config.js      Markets, currencies, tax rules, plans, prices
│   ├── js/i18n.js        Translations (en, de, fr, ja)
│   ├── js/app.js         Runtime: theme, locale, pricing, forms, modal
│   └── img/              Logo and favicon (SVG)
├── tools/                Page generator — see below
├── robots.txt
└── sitemap.xml
```

### The `tools/` directory

The header, footer, cookie banner and plan modal are identical on all ten pages. Rather than
maintain ten copies, they live in `tools/layout.js` and the pages are generated from it:

```bash
npm run build
```

**This is not a build step for deployment.** The generated `.html` files are the deliverable and
are committed. You only need to run it if you edit something in `tools/`. If you would rather not
keep a generator around, delete `tools/` and edit the HTML directly — nothing else depends on it.

---

## Markets, currency and tax

`assets/js/config.js` is the single source of truth. Each market defines its currency, default
language, tax treatment, contracting entity and refund regime.

All prices below are **net**. Tax is added at checkout.

| Market | Currency | Premium | Pro | Tax added at checkout | Refund right |
|---|---|---|---|---|---|
| 🇺🇸 US | USD | $12/mo · $115/yr | $29/mo · $279/yr | Sales tax, where applicable | 14-day guarantee |
| 🇬🇧 UK | GBP | £10/mo · £96/yr | £25/mo · £240/yr | VAT 20% | 14-day statutory |
| 🇩🇪 DE | EUR | €12/mo · €115/yr | €29/mo · €279/yr | MwSt. 19% | 14-day statutory |
| 🇫🇷 FR | EUR | €12/mo · €115/yr | €29/mo · €279/yr | TVA 20% | 14-day statutory |
| 🇮🇳 IN | INR | ₹499/mo · ₹4,790/yr | ₹1,299/mo · ₹12,470/yr | GST 18% | 14-day guarantee |
| 🇯🇵 JP | JPY | ¥1,800/mo · ¥17,280/yr | ¥4,400/mo · ¥42,240/yr | Consumption tax 10% | 14-day guarantee |

A few decisions worth knowing about:

- **Prices are set per market, not converted.** India is priced to local purchasing power rather
  than at the dollar exchange rate. Change the numbers in `PRICES` in `config.js`.
- **All prices are tax-exclusive** (`tax_behavior: 'exclusive'`), which is Stripe's usual default:
  the listed price is net and tax is calculated from the billing address at checkout. See
  [Tax](#tax) below — this has a compliance caveat for UK/EU consumers.
- **Annual savings are computed, never hardcoded.** `getPricing()` floors the percentage so the
  headline can't overstate the discount. The toggle says "save up to 20%" because the real figure
  is 19–20% depending on rounding.
- **The contracting entity changes by market** and is surfaced on the pricing and signup pages,
  because it determines which consumer-law regime applies.

Formatting uses `Intl.NumberFormat` with the market's locale, so Germany renders `12 €` and Japan
renders `￥1,800` the way each market expects.

## Languages

Four languages cover the six markets — **English** (US, UK, India), **German**, **French** and
**Japanese**. Every user-facing string in the site is translated; the check script below verifies
100% coverage of keys actually in use.

Region and language are separate controls in the header. Picking a region switches the language to
that market's default; the language dropdown then overrides it independently. Both persist in
`localStorage`, and first-time visitors are matched against `navigator.languages`.

To add a string: add the key to all four dictionaries in `i18n.js`, then reference it with
`data-i18n="your.key"` in the HTML (or `data-i18n-attr="placeholder:your.key"` for attributes).
Missing keys fall back to English rather than rendering blank.

---

## Stripe

### Setup

**1. Keys.** Copy the example env file to the project root and fill in test keys from
<https://dashboard.stripe.com/test/apikeys>:

```bash
cp server/.env.example .env
```

**2. Create the products and prices.** Twenty of them (2 paid plans × 5 currencies × 2 cycles).
Don't do this by hand — the script reads the amounts from `assets/js/config.js`, so Stripe and the
pricing page cannot disagree:

```bash
npm run stripe:provision:dry
```

```bash
npm run stripe:provision
```

It is idempotent. Each price gets a stable `lookup_key` (`llama_premium_gbp_monthly`), so
re-running finds what exists rather than duplicating. Stripe prices are immutable, so changing an
amount in `config.js` and running `npm run stripe:provision -- --force` creates a new price and
moves the lookup key onto it, archiving the old one. Results are written to `server/prices.json`.

**3. Webhooks.** In another terminal:

```bash
stripe listen --forward-to localhost:4173/api/stripe/webhook
```

Paste the `whsec_...` it prints into `.env` and restart the server. The CLI secret and each
deployed endpoint's secret are different.

**4. Enable Stripe Tax.** With tax-exclusive prices this is **required, not optional** — until it
is on, nothing is added at checkout and you collect no tax at all. Set your head office address at
<https://dashboard.stripe.com/settings/tax> and add your registrations. Without a head office
address Stripe rejects every checkout with *"You must have a valid head office address to enable
automatic tax calculation"*. If you would rather handle VAT/GST another way, set
`STRIPE_AUTOMATIC_TAX=false` in `.env`.

**5. Verify** before trying a real checkout:

```bash
npm run stripe:check
```

Read-only. It confirms every price ID exists, is active, sits under an **active product**, carries
the right amount, currency and `tax_behavior`, and that Stripe Tax is configured. Each of those
has caused a checkout failure in practice, and each fails at checkout time rather than at startup,
so run this after any Stripe-side change.

`npm start` also prints what is and isn't configured — but note it only checks `prices.json`
locally; it cannot tell whether the products behind those IDs are still active. That is what
`stripe:check` is for.

### Endpoints

| Route | Purpose |
|---|---|
| `GET /api/config` | Whether payments are live. The front end calls this on load. |
| `GET /api/health` | Configuration status, for uptime checks. |
| `POST /api/checkout` | Creates a Checkout Session, returns the redirect URL. |
| `GET /api/session/:id` | Confirms what was bought, for the success page. |
| `POST /api/auth/claim` | Turns a paid Checkout Session into a signed-in session. |
| `POST /api/auth/link` | Emails a single-use sign-in link. |
| `GET /api/auth/verify` | Consumes the link, sets the session cookie. |
| `GET /api/me` | Current plan, status and entitlements. |
| `POST /api/auth/signout` | Clears the session. |
| `GET`/`POST /api/trips` | Gated resource — plan limits enforced here. |
| `POST /api/portal` | Opens the Stripe billing portal (card, invoices, cancel). Session required. |
| `POST /api/stripe/webhook` | Subscription lifecycle. Signature-verified. |

### How it is put together

- **The browser never sends an amount.** It sends `{plan, cycle, market}`; the server resolves the
  price ID from the provisioned catalogue. A tampered request cannot change what is charged —
  there is a test for exactly this.
- **Entitlements are granted by webhook, never by the success redirect.** A customer closing the
  tab must not lose their subscription, and a crafted redirect must not create one.
- **Webhook handlers are idempotent.** Stripe retries and can deliver twice; processed event IDs
  are recorded and replays skipped.
- **The webhook route is mounted before `express.json()`** in `server/index.js`. Signature
  verification hashes the raw body — parsing it first breaks every check.
- **Minor units are handled per currency.** JPY is zero-decimal (¥1,800 → `1800`) but INR is not
  (₹499 → `49900`). Getting this wrong charges 100× wrong; `toStripeAmount()` covers it.
- **`tax_behavior` matches the pricing page** — `exclusive` everywhere, so the listed price is net
  and the customer's total at checkout is that plus tax. See [Tax](#tax).

---

## Deploying

**Vercel serves the static site. Railway runs the API. Vercel proxies `/api/*` to Railway.**

That last part matters more than it looks. If the browser talked to two origins, the session
cookie would be cross-site — `SameSite=Lax` would drop it on the way back from Stripe Checkout,
and sign-in would silently stop working. The rewrite means the browser only ever sees the Vercel
domain, so cookies stay first-party and there is no CORS to configure.

Vercel cannot host the whole thing on its own: `server/store.js` and `server/session.js` write
five files at runtime, and serverless filesystems are ephemeral and per-invocation. Moving to
Vercel-only means replacing the store with a database first.

Railway on its own works fine, if you would rather not split it.

### 1. Railway (API)

Deploy from the repo — `railway.json` sets the start command and points health checks at
`/api/health`. Then set variables:

| Variable | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` (or `sk_test_…` while testing) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | from the Dashboard endpoint you create in step 3 |
| `STRIPE_AUTOMATIC_TAX` | `true` |
| `SITE_URL` | your **Vercel** URL, e.g. `https://llama.vercel.app` |
| `SESSION_SECRET` | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `LLAMA_DATA_DIR` | `/data` |
| `NODE_ENV` | `production` |

`SITE_URL` is the public site, **not** the Railway URL — it builds the Checkout return links, so
getting it wrong sends paying customers to the wrong host.

**Attach a volume mounted at `/data`.** Without it the container's disk resets on every deploy:
subscriptions vanish (recoverable — see below) and the session secret regenerates, signing
everyone out. Setting `SESSION_SECRET` fixes the second even without a volume.

The server prints a warning block at boot for each of these if it is missing.

### 2. Vercel (site)

Deploy the same repo. `vercel.json` handles the rest — but **edit the rewrite destination first**:

```json
{ "source": "/api/:path*", "destination": "https://YOUR-APP.up.railway.app/api/:path*" }
```

There is no build step: the HTML is committed. Run `npm run build` locally after editing anything
in `tools/`, and commit the result. `.vercelignore` keeps `server/` off Vercel entirely, so the
secrets never reach it.

### 3. Stripe webhook

Create the endpoint against the **Railway** URL, not Vercel:

```
https://YOUR-APP.up.railway.app/api/stripe/webhook
```

Signature verification hashes the raw request body, and going through a proxy risks it being
re-encoded. Pointing Stripe straight at Railway removes that class of problem.

Subscribe to `checkout.session.completed`, `customer.subscription.*`, `invoice.paid` and
`invoice.payment_failed`, then copy the signing secret into `STRIPE_WEBHOOK_SECRET`. It is
different from the Stripe CLI's local secret.

### 4. Live-mode catalogue

Test-mode price IDs do not exist in live mode. Re-provision against the live key:

```bash
STRIPE_SECRET_KEY=sk_live_... npm run stripe:provision -- --yes-live
```

Then commit the regenerated `server/prices.json`, or paste it into the `STRIPE_PRICES` variable if
you would rather not commit live IDs. Tax registrations need redoing in live mode too — and only
for jurisdictions where you are genuinely registered.

### 5. Verify

```bash
curl https://YOUR-APP.up.railway.app/api/health
```

```bash
curl https://YOUR-SITE.vercel.app/api/health
```

Both should return the same JSON. If the first works and the second does not, the rewrite
destination is wrong.

### Country detection

`detectedCountry` reads edge headers. Vercel sets `x-vercel-ip-country` and it survives the
rewrite, so this keeps working through the proxy. On Railway alone, put Cloudflare in front
(`cf-ipcountry`) or the detection returns `null` and the browser locale is used instead — a
graceful fallback, not a failure.

---

## Accounts and entitlements

Paying is only half the job — the customer has to *get* what they paid for. That chain is:

**Stripe customer → session cookie → resolved plan → enforced limits.**

### Getting signed in

Two ways, no passwords:

1. **Straight after checkout.** Stripe redirects to `checkout-success.html?session_id=cs_...`.
   That ID is a one-time secret only the paying browser receives. `POST /api/auth/claim` verifies
   with Stripe that the session is genuinely `complete` and `paid`, then issues a signed session
   cookie. This is what stops a customer landing back at square one after paying.
2. **Returning later.** `POST /api/auth/link` emails a single-use link (15-minute expiry, stored
   hashed). Unknown addresses get an identical response, so the endpoint cannot be used to
   enumerate customers.

Sessions are HMAC-signed cookies — `httpOnly` (a page script cannot read them, so XSS cannot steal
a login), `SameSite=Lax` (survives the Stripe redirect, blocks cross-site POSTs), `Secure` when
`SITE_URL` is https. Stateless, so there is no session table to keep.

### What each plan grants

`server/entitlements.js` is the single source of truth, mirroring the comparison table on the
pricing page. **Change one and change the other**, or the marketing starts lying.

Two decisions worth knowing:

- **`past_due` still grants access.** The terms promise notice and a grace period before paid
  features are suspended, so a failed payment must not lock someone out mid-trip.
- **Anything unknown falls back to Free**, never to an error. Losing access should not be the
  failure mode of a bug in plan resolution.

### Enforcement

`GET /api/me` tells the UI what to show. That is *display only*. The limits are enforced in the
API — see `server/routes/trips.js`, which resolves the plan from the subscription record and
refuses with `402` plus a structured reason (`limit`, `used`, `allowed`, `upgradeTo`) the UI turns
into a localised message. Hiding a button is not access control.

The trips endpoint exists to demonstrate the shape. Replace it with the real service; keep the
pattern.

### Signed-in UI

The header shows an account link with a plan badge, the pricing page marks your current plan
("Current plan" / "Upgrade" / "Switch to this"), and `account.html` becomes a dashboard: plan,
status, renewal date, billing period, market, full entitlement list, and a working demonstration
of a limit being enforced.

---

## Tax

Prices are **tax-exclusive** in every market: `TAX_BEHAVIOUR` in `server/config.js` sets
`tax_behavior: 'exclusive'` on all 20 Stripe prices, so the listed figure is net and Stripe Tax
adds VAT / GST / sales tax at checkout from the customer's billing address.

### Two things this depends on

**Stripe Tax must be switched on.** With exclusive prices and `automatic_tax` disabled, the
customer is charged the net amount and **no tax is collected** — a verified checkout session
showed `amount_tax: 0`. The site detects this: when the server reports `automaticTax: false`, the
pricing page swaps the per-market tax note for "Tax calculation is not switched on yet, so no tax
is added at checkout" rather than promising VAT that never arrives. Fix it by setting the head
office address and re-enabling `STRIPE_AUTOMATIC_TAX`.

**You need tax registrations.** Even with Stripe Tax active, it only collects where you have
registered. There are currently **none** on the account.

### The UK/EU consumer caveat

Showing tax-exclusive prices to **consumers** in the UK and EU is generally not permitted — the UK
Price Marking Order and EU Price Indication Directive 98/6/EC both require the price a consumer
sees to be the price they pay, inclusive of VAT. Exclusive pricing is normal and expected for B2B.

Llama is sold to individual travellers, so this needs a legal review before launching in the UK,
Germany or France. To reverse it, set those currencies back to `'inclusive'` in
`server/config.js` and run:

```bash
npm run stripe:provision -- --force
```

The i18n strings for both wordings are already in place, so only the config changes.

### Currency vs tax: keeping them consistent

Two different things decide the number a customer sees:

- **Currency and price** come from the region picker on the site.
- **Tax** comes from the billing address they type into Stripe Checkout.

**Stripe Checkout cannot re-price mid-session.** The currency is fixed when the session is
created, so no amount of address-typing on Stripe's page will switch it. The currency is therefore
whatever the region picker was set to when the customer clicked, and the tax is whatever their
billing address implies. Those usually agree; three things keep them that way:

1. **Better default.** `GET /api/config` returns `detectedCountry` from an edge header
   (`cf-ipcountry`, `x-vercel-ip-country`, CloudFront, App Engine, Fastly). The browser prefers
   that over `navigator.language` when picking the initial market, so a German visitor starts on
   EUR. Returns `null` on localhost, where the browser locale is used instead.
2. **Pre-selected billing country.** Every session is created against a Stripe Customer carrying
   the market's country. Without one, Checkout defaults the billing-country dropdown to *your
   Stripe account's* country — so a German buying in EUR would see "United States" pre-selected
   and, if they did not notice, be charged US sales tax on a euro subscription. A signed-in
   subscriber reuses their existing customer, and an address already on file is never overwritten
   by the market default. `customer_update: { address: 'auto' }` writes back whatever they finally
   enter, which is what lets Stripe calculate tax on **renewal** invoices too.
3. **Reconciliation.** The webhook compares the billing country Stripe collected against the
   market we priced in (`server/geo.js`) and records `billingMismatch` plus the market they should
   be on. The account page then shows a notice with a one-click switch.

`marketForCountry()` maps any country onto one of the six markets — eurozone countries fall into
the EUR catalogue rather than defaulting to USD, and DE/FR are treated as equivalent since they
share a price list.

**Tax rates are never hardcoded.** The pricing copy says "VAT is added at checkout, based on your
billing address" rather than naming a percentage, because Stripe is the only thing that knows the
real rate and it changes without notice. To see what Stripe would actually charge:

```bash
npm run stripe:tax-preview
```

### Changing tax behaviour

`tax_behavior` is part of a price's identity, not a detail — an inclusive and an exclusive price
with the same `unit_amount` charge different totals. The provisioning script compares it alongside
amount and currency when deciding whether a price is unchanged, so switching modes correctly
triggers a re-price rather than silently keeping the old one.

### Storage

`server/store.js` is a JSON file behind a narrow interface. Swap it for real database calls when
you have one; nothing else in the server touches storage. Stripe stays the source of truth for
billing — this is a local projection so the app can answer "is this account entitled to Pro?"
without a round trip.

Because it is only a cache, it can be rebuilt at any time:

```bash
npm run stripe:resync
```

That reads every subscription from Stripe and repopulates the local file — useful after data loss,
or to backfill subscriptions created while the webhook forwarder was not running. It reads Stripe
and writes locally, never the reverse.

### Testing

```bash
npm test
```

131 assertions with the Stripe API stubbed — price resolution per market, tamper resistance,
minor-unit conversion, webhook signature verification and replay handling, entitlement resolution,
session cookie forgery, the gated-resource limits, magic-link single use and non-enumeration, and
the security headers. No network and no real keys required, and the suite runs against a temporary
data directory so it never touches `server/data`.

For a real end-to-end test, use card `4242 4242 4242 4242` in test mode. Worth also running
`4000 0000 0000 3220` (3-D Secure) and `4000 0000 0000 0341` (attaches, then fails on charge).

---

## Known gaps before taking real money

These are real:

- **Sign-in emails are not delivered.** The magic-link flow works end to end, but
  `sendLoginEmail()` in `server/routes/auth.js` only logs the link. In test mode the link is also
  returned to the browser so the flow is usable; in live mode it is not, which means **the
  magic-link path is unusable in production until you wire up an email provider** (Postmark, SES,
  Resend). Paying customers are unaffected — they are signed in automatically by the checkout
  redirect — but a returning customer on a new device cannot get back in.
- **India: recurring INR card payments need RBI e-mandate.** Under the RBI framework, recurring
  card payments require an e-mandate with pre-debit notification, and auto-debits above ₹15,000
  need additional authentication per transaction. Our annual Pro price (₹12,470) sits under that
  ceiling; annual pricing changes should keep it there or handle the step-up. Confirm your Stripe
  India account supports the flows you need before launching INR subscriptions.
- **Japan:** consider adding JCB acceptance; convenience-store payment does not support
  subscriptions.
- **EU/UK:** Checkout handles SCA, but test the 3-D Secure path (`4000 0000 0000 3220`) before
  launch — a chunk of European cards will hit it.
- **Dunning is unimplemented.** `invoice.payment_failed` updates the record and logs; the terms
  promise notice and a grace period before suspension, so the emails still need writing.
- **No rate limiting** on `/api/checkout`. Add some before exposing it publicly.

---

## Before this goes live

Things that are deliberately placeholder and need real values:

- **Legal documents are unreviewed drafts.** Each carries a banner saying so. They cover the right
  ground for six jurisdictions but must be reviewed by a lawyer in each market before launch.
- **Company details are invented** — addresses, entity names, `@llama.example` email addresses,
  the `llama.example` domain in `sitemap.xml`, `robots.txt` and canonical tags.
- **Testimonials and metrics are illustrative.** The three quotes, "190+ countries", "4.8/5" and
  the headcount on the About page are placeholders. Publishing invented testimonials as real is a
  consumer-protection problem in every one of these six markets — replace or remove them.
- **No OG raster image.** `og:image` points at the SVG logo; most social platforms want a
  1200×630 PNG.
- **Analytics are not installed.** The cookie banner already gates them behind consent, and the
  cookie policy describes the categories; the actual script still needs adding to the `accept`
  branch in `initCookieBar()`.
- **The "subscriptions are not live" notices** hide themselves automatically once the server
  reports `paymentsEnabled` — no edit needed. The exception is the "Current status" section of
  `legal/refunds.html`, which is static prose and must be removed by hand when you go live.

---

## Browser support and accessibility

Targets current Chrome, Edge, Firefox and Safari. Uses `color-mix()`, CSS nesting-free custom
properties, `<dialog>` and `Intl.NumberFormat` — all baseline-available. The `<dialog>` calls are
feature-detected with an `open`-attribute fallback.

Built in: skip link, visible focus rings, landmark regions, `aria-current` on the active nav item,
labelled form controls, `aria-pressed` on the billing toggle, screen-reader text behind the ✓/—
marks in the comparison table, and a `prefers-reduced-motion` block that disables animation.

Light and dark themes both ship. Dark follows the system by default and the header toggle overrides
it, persisted in `localStorage`.

---

## Checks

`tools/build.js` regenerates the pages. There is no test framework, but the site was verified
against: internal link and asset resolution, in-page anchor targets, every `data-i18n` key
resolving in all four languages, translation coverage, annual-vs-monthly pricing sanity across all
six markets, and duplicate element IDs.
