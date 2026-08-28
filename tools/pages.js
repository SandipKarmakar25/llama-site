/* Marketing page content for the generator. Each entry supplies the <main>. */

'use strict';

const STAR = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6.5 7 .9-5 4.8 1.3 7L12 17.8 5.7 21.2 7 14.2 2 9.4l7-.9z"/></svg>`;
const STARS = `<div class="stars" aria-label="5 out of 5">${STAR.repeat(5)}</div>`;

const ic = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const ICONS = {
  map: ic('<path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/>'),
  pulse: ic('<polyline points="22 12 18 12 15 20 9 4 6 12 2 12"/>'),
  alert: ic('<path d="M10.3 3.2 1.8 17.5A2 2 0 0 0 3.5 20.5h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13.5"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
  passport: ic('<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><circle cx="12" cy="10" r="2.6"/><path d="M8 17.5c1-2 6.9-2 8 0"/>'),
  users: ic('<path d="M16 20v-1.8a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.4"/><path d="M22 20v-1.8a4 4 0 0 0-3-3.9"/><path d="M16 3.3a4 4 0 0 1 0 7.4"/>'),
  briefcase: ic('<rect x="2" y="7" width="20" height="14" rx="2.5"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>'),
  train: ic('<rect x="5" y="3" width="14" height="13" rx="3"/><line x1="5" y1="10" x2="19" y2="10"/><circle cx="9" cy="13.2" r="1"/><circle cx="15" cy="13.2" r="1"/><path d="m7 19-2 2.5M17 19l2 2.5"/>'),
  wallet: ic('<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1"/><rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><circle cx="16.5" cy="13.7" r="1.2"/>'),
  offline: ic('<path d="M5 18a4 4 0 0 1 .6-8 6 6 0 0 1 11.4 1.2A3.6 3.6 0 0 1 19.5 18z"/><line x1="3" y1="3" x2="21" y2="21"/>'),
  shield: ic('<path d="M12 2.6 4 6v6c0 5 3.4 8.6 8 9.4 4.6-.8 8-4.4 8-9.4V6z"/><polyline points="9 12 11.2 14.2 15.4 10"/>'),
  coin: ic('<circle cx="12" cy="12" r="9.2"/><path d="M12 6.8v10.4M14.6 9.4H10.7a1.8 1.8 0 0 0 0 3.6h2.6a1.8 1.8 0 0 1 0 3.6H9.4"/>'),
  noFee: ic('<circle cx="12" cy="12" r="9.2"/><line x1="5.5" y1="18.5" x2="18.5" y2="5.5"/>'),
  calendar: ic('<rect x="3" y="4.6" width="18" height="16.4" rx="2.4"/><line x1="3" y1="9.6" x2="21" y2="9.6"/><line x1="8" y1="2.4" x2="8" y2="6.4"/><line x1="16" y1="2.4" x2="16" y2="6.4"/>'),
  headset: ic('<path d="M4 13v-1a8 8 0 0 1 16 0v1"/><rect x="2" y="13" width="4.5" height="7" rx="2"/><rect x="17.5" y="13" width="4.5" height="7" rx="2"/><path d="M20 20v.5a2.5 2.5 0 0 1-2.5 2.5H13"/>'),
  concierge: ic('<path d="M3 19h18"/><path d="M4.5 19a7.5 7.5 0 0 1 15 0"/><line x1="12" y1="6.5" x2="12" y2="4"/><circle cx="12" cy="7.6" r="1.1"/>'),
  api: ic('<polyline points="9 18 3.5 12 9 6"/><polyline points="15 6 20.5 12 15 18"/>'),
  globe: ic('<circle cx="12" cy="12" r="9.2"/><line x1="2.8" y1="12" x2="21.2" y2="12"/><path d="M12 2.8a14.5 14.5 0 0 1 0 18.4 14.5 14.5 0 0 1 0-18.4z"/>'),
  info: ic('<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>')
};

const quote = (initials, textKey, nameKey, roleKey, fallback) => `
        <figure class="card quote-card">
          ${STARS}
          <blockquote data-i18n="${textKey}">${fallback}</blockquote>
          <figcaption><span class="avatar" aria-hidden="true">${initials}</span><span><b data-i18n="${nameKey}"></b><span data-i18n="${roleKey}"></span></span></figcaption>
        </figure>`;

/* ── Home ────────────────────────────────────────────────────────────── */
const home = `
  <section class="hero">
    <div class="shell hero__grid">
      <div class="hero__copy">
        <span class="eyebrow" data-i18n="hero.eyebrow">Your travel planning assistant</span>
        <h1 data-i18n="hero.title">Plan the whole trip in one conversation.</h1>
        <p class="lede" data-i18n="hero.lede">Llama turns a half-formed idea into a day-by-day itinerary.</p>
        <div class="cluster">
          <a class="btn btn--primary btn--lg" href="signup.html" data-i18n="cta.startFree">Start free</a>
          <a class="btn btn--outline btn--lg" href="pricing.html" data-i18n="cta.seePlans">See plans</a>
        </div>
        <p class="pill-note"><span class="dot" aria-hidden="true"></span><span data-i18n="hero.note">Free to start. No card needed.</span></p>

        <div class="hero-stats">
          <div><strong data-i18n="hero.stat1v">190+</strong><span data-i18n="hero.stat1l">Countries covered</span></div>
          <div><strong data-i18n="hero.stat2v">6</strong><span data-i18n="hero.stat2l">Markets with local pricing</span></div>
          <div><strong data-i18n="hero.stat3v">4.8/5</strong><span data-i18n="hero.stat3l">Average traveller rating</span></div>
        </div>
      </div>

      <div class="chat-mock" aria-label="Example conversation with Llama">
        <div class="chat-mock__bar">
          <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span data-i18n="chat.title">Llama &middot; Trip planner</span>
        </div>
        <div class="chat-mock__body">
          <div class="bubble bubble--user" data-i18n="chat.user1"></div>
          <div class="bubble bubble--bot">
            <strong data-i18n="chat.bot1title"></strong>
            <ul>
              <li><b data-i18n="chat.r1k"></b><span data-i18n="chat.r1v"></span></li>
              <li><b data-i18n="chat.r2k"></b><span data-i18n="chat.r2v"></span></li>
              <li><b data-i18n="chat.r3k"></b><span data-i18n="chat.r3v"></span></li>
            </ul>
          </div>
          <div class="bubble bubble--bot" data-i18n="chat.bot1foot"></div>
        </div>
        <div class="chat-mock__foot">
          <div class="fake-input" data-i18n="chat.input"></div>
          <span class="send" aria-hidden="true">${ic('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>')}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--tight section--alt">
    <div class="shell">
      <p class="center subtle mb-5" style="font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;font-weight:650">Works alongside the services you already use</p>
      <div class="logo-strip">
        <span>Deutsche Bahn</span><span>SNCF</span><span>National Rail</span>
        <span>JR East</span><span>IRCTC</span><span>Amtrak</span><span>Google Calendar</span>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head center">
        <span class="eyebrow" data-i18n="how.eyebrow">How it works</span>
        <h2 data-i18n="how.title">Three steps, then it runs itself</h2>
      </div>
      <div class="steps grid grid-3">
        <div class="step"><h3 data-i18n="how.s1t"></h3><p data-i18n="how.s1b"></p></div>
        <div class="step"><h3 data-i18n="how.s2t"></h3><p data-i18n="how.s2b"></p></div>
        <div class="step"><h3 data-i18n="how.s3t"></h3><p data-i18n="how.s3b"></p></div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="shell">
      <div class="section-head center">
        <span class="eyebrow" data-i18n="feat.eyebrow">What it does</span>
        <h2 data-i18n="feat.title">Everything a good travel agent does, minus the phone calls</h2>
        <p class="lede" data-i18n="feat.lede"></p>
      </div>

      <div class="grid grid-3">
        <article class="card card--hover feature-card">
          <div class="feature-card__head"><span class="icon-tile">${ICONS.map}</span><span class="badge badge--free">Free</span></div>
          <h3 data-i18n="feat.c1t"></h3><p data-i18n="feat.c1b"></p>
        </article>
        <article class="card card--hover feature-card">
          <div class="feature-card__head"><span class="icon-tile">${ICONS.pulse}</span><span class="badge badge--premium">Premium</span></div>
          <h3 data-i18n="feat.c2t"></h3><p data-i18n="feat.c2b"></p>
        </article>
        <article class="card card--hover feature-card">
          <div class="feature-card__head"><span class="icon-tile">${ICONS.alert}</span><span class="badge badge--premium">Premium</span></div>
          <h3 data-i18n="feat.c3t"></h3><p data-i18n="feat.c3b"></p>
        </article>
        <article class="card card--hover feature-card">
          <div class="feature-card__head"><span class="icon-tile">${ICONS.passport}</span><span class="badge badge--premium">Premium</span></div>
          <h3 data-i18n="feat.c4t"></h3><p data-i18n="feat.c4b"></p>
        </article>
        <article class="card card--hover feature-card">
          <div class="feature-card__head"><span class="icon-tile">${ICONS.users}</span><span class="badge badge--premium">Premium</span></div>
          <h3 data-i18n="feat.c5t"></h3><p data-i18n="feat.c5b"></p>
        </article>
        <article class="card card--hover feature-card">
          <div class="feature-card__head"><span class="icon-tile icon-tile--accent">${ICONS.briefcase}</span><span class="badge badge--pro">Pro</span></div>
          <h3 data-i18n="feat.c6t"></h3><p data-i18n="feat.c6b"></p>
        </article>
      </div>

      <div class="cluster mt-6" style="justify-content:center">
        <a class="btn btn--outline" href="features.html" data-i18n="cta.learnMore">Learn more</a>
        <a class="btn btn--primary" href="pricing.html" data-i18n="cta.comparePlans">Compare all features</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head center">
        <span class="eyebrow" data-i18n="markets.eyebrow">Where we operate</span>
        <h2 data-i18n="markets.title">Built for six markets, not translated into them</h2>
        <p class="lede" data-i18n="markets.lede"></p>
      </div>
      <div class="market-grid" id="market-list"></div>
      <p class="center subtle mt-5" style="font-size:.87rem" data-i18n="markets.note"></p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="shell">
      <div class="trust-row">
        <div class="trust-item">${ICONS.coin}<div><h4 data-i18n="trust.t1"></h4><p data-i18n="trust.b1"></p></div></div>
        <div class="trust-item">${ICONS.shield}<div><h4 data-i18n="trust.t2"></h4><p data-i18n="trust.b2"></p></div></div>
        <div class="trust-item">${ICONS.noFee}<div><h4 data-i18n="trust.t3"></h4><p data-i18n="trust.b3"></p></div></div>
        <div class="trust-item">${ICONS.calendar}<div><h4 data-i18n="trust.t4"></h4><p data-i18n="trust.b4"></p></div></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head center"><h2 data-i18n="quotes.title">Travellers who stopped using spreadsheets</h2></div>
      <div class="grid grid-3">
${quote('PR', 'q1', 'q1n', 'q1r', '')}
${quote('ML', 'q2', 'q2n', 'q2r', '')}
${quote('CW', 'q3', 'q3n', 'q3r', '')}
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="shell">
      <div class="cta-band">
        <h2 data-i18n="ctab.title">Start planning your next trip free</h2>
        <p data-i18n="ctab.body"></p>
        <div class="cluster">
          <a class="btn btn--accent btn--lg" href="signup.html" data-i18n="cta.startFree">Start free</a>
          <a class="btn btn--outline btn--lg" href="pricing.html" data-i18n="cta.seePlans">See plans</a>
        </div>
        <small data-i18n="ctab.note"></small>
      </div>
    </div>
  </section>`;

/* ── Features ─────────────────────────────────────────────────────────── */
const featureBlock = (icon, badge, badgeClass, title, body, bullets) => `
        <article class="card feature-card">
          <div class="feature-card__head"><span class="icon-tile${badgeClass === 'pro' ? ' icon-tile--accent' : ''}">${icon}</span><span class="badge badge--${badgeClass}">${badge}</span></div>
          <h3>${title}</h3>
          <p>${body}</p>
          <ul class="checklist">${bullets.map((b) => `<li>${b}</li>`).join('')}</ul>
        </article>`;

const features = `
  <section class="page-hero">
    <div class="shell">
      <span class="eyebrow" data-i18n="feat.eyebrow">What it does</span>
      <h1>Every feature, and exactly which plan it sits in</h1>
      <p class="lede">Llama is one assistant with three levels of access. Nothing here is a teaser: the Free plan is a real product, and the paid tiers exist because live price watching, human concierge and round-the-clock cover cost money to run.</p>
      <div class="cluster mt-4">
        <a class="btn btn--primary" href="signup.html" data-i18n="cta.startFree">Start free</a>
        <a class="btn btn--outline" href="pricing.html" data-i18n="cta.comparePlans">Compare all features</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head">
        <span class="eyebrow">Planning</span>
        <h2>From a vague idea to a plan you can actually follow</h2>
      </div>
      <div class="grid grid-3">
${featureBlock(ICONS.map, 'Free', 'free', 'Conversational itinerary building',
  'Describe the trip the way you would to a friend. Llama asks the two or three questions that actually change the answer, then produces a day-by-day plan.',
  ['Routes ordered so you are not crossing the city twice', 'Realistic transfer and travel times', 'Opening hours and closure days checked', 'Free plan covers itineraries up to five days'])}
${featureBlock(ICONS.train, 'Premium', 'premium', 'Local rail and transit routing',
  'Point-to-point routing on the networks people actually use in each of our markets, not a generic map link.',
  ['Deutsche Bahn, SNCF and TGV connections', 'JR and Shinkansen, including pass break-even maths', 'National Rail, IRCTC and Amtrak', 'Walking and metro legs between each stop'])}
${featureBlock(ICONS.globe, 'Premium', 'premium', 'Multi-city and long-haul routing',
  'Open-jaw flights, overland legs and sensible ordering for trips that visit more than one place.',
  ['Up to three cities on Premium, unlimited on Pro', 'Open-jaw and multi-city fare construction', 'Overland versus flying compared on time and cost', 'Round-the-world routings on Pro'])}
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="shell">
      <div class="section-head">
        <span class="eyebrow">Prices and booking</span>
        <h2>The part that pays for itself</h2>
      </div>
      <div class="grid grid-3">
${featureBlock(ICONS.pulse, 'Premium', 'premium', 'Fare and hotel price watching',
  'Register a route once and Llama keeps checking. You get told when the price moves, not when a marketing calendar says so.',
  ['20 watched routes on Premium, unlimited on Pro', 'Price-drop alerts by email and push', 'Historical price bands so you know if it is actually cheap', 'Hotel rate re-checks against your existing booking'])}
${featureBlock(ICONS.alert, 'Premium', 'premium', 'Disruption handling',
  'Delays and cancellations are where a planning tool earns its keep. Llama watches your booked flights and reacts before you have to.',
  ['Rebooking options ranked by arrival time', 'Downstream itinerary rebuilt automatically', 'Connection risk flagged before you book', 'EU261 and UK261 compensation eligibility noted'])}
${featureBlock(ICONS.wallet, 'Pro', 'pro', 'Points and loyalty optimiser',
  'Whether to pay cash or burn points is a maths problem. Llama does the maths across the programmes you actually hold.',
  ['Cash versus points break-even per booking', 'Airline and hotel programme balances tracked', 'Status-qualifying spend and segments', 'Transfer-partner routes surfaced'])}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head">
        <span class="eyebrow">On the trip</span>
        <h2>Useful once you have actually left the house</h2>
      </div>
      <div class="grid grid-3">
${featureBlock(ICONS.passport, 'Premium', 'premium', 'Entry rules and documents',
  'Requirements depend on your nationality, your route and sometimes your transit airport. Llama checks per traveller rather than per country.',
  ['Visa and e-visa requirements by passport held', 'Passport validity and blank-page rules', 'Transit visa traps flagged in advance', 'Vaccination and health entry rules'])}
${featureBlock(ICONS.offline, 'Premium', 'premium', 'Offline access and exports',
  'Airport wifi is unreliable and roaming is expensive. Take the whole plan with you.',
  ['Offline itinerary and downloaded maps', 'PDF export formatted for printing', 'Calendar export with travel-time blocks', 'Confirmation numbers in one place'])}
${featureBlock(ICONS.concierge, 'Pro', 'pro', 'Human concierge and 24/7 cover',
  'For the things software cannot do: calling a hotel that does not answer email, or sorting a problem at 3am local time.',
  ['5 concierge requests per month on Pro', 'Restaurant and activity reservations', '24/7 chat and callback on travel days', 'Escalation to a named agent'])}
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="shell">
      <div class="section-head">
        <span class="eyebrow">People, teams and money</span>
        <h2>Trips with other people in them</h2>
      </div>
      <div class="grid grid-3">
${featureBlock(ICONS.users, 'Premium', 'premium', 'Shared and group trips',
  'Everyone sees the same plan, and preferences are held per person rather than averaged into mush.',
  ['Up to 4 travellers on Premium, 12 on Pro', 'Per-person preferences and constraints', 'Shared budget with split tracking', 'Comment and vote on options'])}
${featureBlock(ICONS.briefcase, 'Pro', 'pro', 'Business travel mode',
  'Policy-aware planning and paperwork your finance team will accept without a follow-up.',
  ['Travel policy rules with in-policy flags', 'Approval notes attached to the trip', 'Expense export as CSV and standard accounting formats', 'Saved traveller profiles for a team'])}
${featureBlock(ICONS.coin, 'Premium', 'premium', 'Multi-currency budgeting',
  'A trip billed in four currencies is hard to keep track of. Llama converts as you go and tells you where you stand.',
  ['Live conversion at the rate you were actually charged', 'Per-category and per-day breakdown', 'Alerts when a category runs over', 'VAT and GST invoices on Pro'])}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head center">
        <span class="eyebrow">Platform</span>
        <h2>Where Llama runs</h2>
      </div>
      <div class="grid grid-4">
        <article class="card"><span class="icon-tile">${ICONS.globe}</span><h4>Web app</h4><p class="muted" style="font-size:.9rem">Works in any modern browser. Free plan included.</p></article>
        <article class="card"><span class="icon-tile">${ICONS.calendar}</span><h4>Calendar sync</h4><p class="muted" style="font-size:.9rem">Two-way sync with Google, Outlook and Apple. Premium and above.</p></article>
        <article class="card"><span class="icon-tile">${ICONS.api}</span><h4>API and Slack</h4><p class="muted" style="font-size:.9rem">Programmatic access and a Slack app for teams. Pro only.</p></article>
        <article class="card"><span class="icon-tile">${ICONS.headset}</span><h4>Support</h4><p class="muted" style="font-size:.9rem">Community on Free, 24-hour email on Premium, 24/7 on Pro.</p></article>
      </div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="shell">
      <div class="cta-band">
        <h2 data-i18n="ctab.title">Start planning your next trip free</h2>
        <p data-i18n="ctab.body"></p>
        <div class="cluster">
          <a class="btn btn--accent btn--lg" href="signup.html" data-i18n="cta.startFree">Start free</a>
          <a class="btn btn--outline btn--lg" href="pricing.html" data-i18n="cta.seePlans">See plans</a>
        </div>
        <small data-i18n="ctab.note"></small>
      </div>
    </div>
  </section>`;

/* ── Pricing ──────────────────────────────────────────────────────────── */
const faqItem = (qKey, aKey) => `
        <details>
          <summary data-i18n="${qKey}"></summary>
          <div><p data-i18n="${aKey}"></p></div>
        </details>`;

const pricing = `
  <section class="page-hero">
    <div class="shell">
      <span class="eyebrow" data-i18n="pricing.eyebrow">Pricing</span>
      <h1 data-i18n="pricing.title">Simple plans, priced for your market</h1>
      <p class="lede" data-i18n="pricing.lede"></p>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="notice notice--warn mb-6" data-when="payments-off">
        ${ICONS.info}
        <div>
          <strong data-i18n="pricing.noPaymentTitle">Subscriptions are not live yet</strong>
          <span data-i18n="pricing.noPaymentBody"></span>
        </div>
      </div>

      <div class="center mb-6">
        <div class="billing-toggle" id="billing-toggle" role="group" aria-label="Billing period">
          <button type="button" data-cycle="monthly" aria-pressed="true"><span data-i18n="pricing.monthly">Monthly</span></button>
          <button type="button" data-cycle="annual" aria-pressed="false"><span data-i18n="pricing.annual">Annual</span><span class="save-tag" data-i18n="pricing.saveTag">Save 20%</span></button>
        </div>
      </div>

      <div class="price-context" id="price-context"></div>

      <div class="plans" id="plans"></div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="shell">
      <div class="section-head center">
        <h2 data-i18n="pricing.compareTitle">Compare every feature</h2>
        <p class="lede" data-i18n="pricing.compareLede"></p>
      </div>
      <div class="table-wrap" id="comparison"></div>
    </div>
  </section>

  <section class="section">
    <div class="shell shell--narrow">
      <div class="section-head center"><h2 data-i18n="pricing.faqTitle">Pricing questions</h2></div>
      <div class="accordion">
${faqItem('faq.q1', 'faq.a1')}
${faqItem('faq.q2', 'faq.a2')}
${faqItem('faq.q3', 'faq.a3')}
${faqItem('faq.q4', 'faq.a4')}
${faqItem('faq.q5', 'faq.a5')}
${faqItem('faq.q6', 'faq.a6')}
      </div>
      <p class="mt-6 center muted" style="font-size:.9rem">Still unsure which plan fits? <a href="contact.html">Ask us</a> and we will tell you honestly, including when the answer is Free.</p>
    </div>
  </section>`;

/* ── About ────────────────────────────────────────────────────────────── */
const about = `
  <section class="page-hero">
    <div class="shell">
      <span class="eyebrow">About</span>
      <h1>We built the travel agent we wanted to hire</h1>
      <p class="lede">Llama LLC makes one product: a travel planning assistant that does the tedious parts of a trip properly and then keeps paying attention after the booking is made.</p>
    </div>
  </section>

  <section class="section">
    <div class="shell shell--narrow prose">
      <h2>Why we started</h2>
      <p>Planning a trip well takes hours of cross-referencing that nobody enjoys: comparing fares that change hourly, checking whether a museum is shut on Tuesdays, working out if a rail pass is worth it, and reading a government page in a language you do not speak to find out whether your passport has enough validity left.</p>
      <p>Existing tools mostly stop at search. They find you a flight and then lose interest. The hard part — turning options into a plan, and keeping that plan correct as the world moves — was still manual. So we built that.</p>

      <h2>How we make money</h2>
      <p>Two ways, and we would rather state both plainly than have you find out later.</p>
      <ul>
        <li><strong>Subscriptions.</strong> Premium and Pro pay for the expensive parts of the service: continuous price monitoring, licensed rail and transit data, human concierge staff, and 24/7 cover.</li>
        <li><strong>Referral fees.</strong> Some booking partners pay us a fee when you book through a link. We label every result that carries one. It does not affect ranking, and it never changes the price you pay.</li>
      </ul>
      <p>We do not sell traveller data, and we do not run advertising. If a recommendation is ever influenced by anything other than fit, we have failed at the only thing that makes this product worth using.</p>

      <h2>Where we are</h2>
      <p>We are a distributed team across six markets, which is also why the product handles those six properly rather than treating everything outside the United States as an afterthought.</p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="shell">
      <div class="metric-grid">
        <div class="card metric"><strong>2023</strong><span>Founded</span></div>
        <div class="card metric"><strong>41</strong><span>People across six markets</span></div>
        <div class="card metric"><strong>190+</strong><span>Countries with planning coverage</span></div>
      </div>
      <p class="center subtle mt-5" style="font-size:.84rem">Figures shown are illustrative placeholders for this launch build.</p>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="section-head center"><h2>What we hold ourselves to</h2></div>
      <div class="grid grid-3">
        <article class="card"><span class="icon-tile">${ICONS.noFee}</span><h3>No markup, ever</h3><p class="muted" style="font-size:.93rem">We never add a margin to a fare or a room rate. If we cannot make the recommendation worth paying for on its own, the answer is not to quietly tax the booking.</p></article>
        <article class="card"><span class="icon-tile">${ICONS.shield}</span><h3>Your trip is not a data product</h3><p class="muted" style="font-size:.93rem">Where you go and who you go with is not sold, brokered or used to target advertising. It exists to plan your trip and for nothing else.</p></article>
        <article class="card"><span class="icon-tile">${ICONS.coin}</span><h3>Honest local pricing</h3><p class="muted" style="font-size:.93rem">Prices reflect local purchasing power and local tax rules. We do not convert one dollar figure into five currencies and call it international.</p></article>
      </div>
    </div>
  </section>

  <section class="section section--alt" id="careers">
    <div class="shell shell--narrow prose">
      <h2>Careers</h2>
      <p>We hire in the six markets we serve, with a bias towards people who have worked in travel operations and know why the edge cases matter. Open roles are listed on our careers page once a search is live.</p>
      <p>Speculative applications are welcome: write to <a href="mailto:careers@llama.example">careers@llama.example</a> with what you would want to fix about travel planning.</p>

      <h2 id="press">Press</h2>
      <p>For press enquiries, interviews or brand assets, contact <a href="mailto:press@llama.example">press@llama.example</a>. We aim to respond within two working days.</p>

      <div class="notice mt-5">${ICONS.info}<div><strong>About the details on this page</strong><span>Company figures, addresses and email addresses shown across this site are placeholders for the launch build and should be replaced with real details before going live.</span></div></div>
    </div>
  </section>

  <section class="section section--tight">
    <div class="shell">
      <div class="cta-band">
        <h2 data-i18n="ctab.title">Start planning your next trip free</h2>
        <p data-i18n="ctab.body"></p>
        <div class="cluster">
          <a class="btn btn--accent btn--lg" href="signup.html" data-i18n="cta.startFree">Start free</a>
          <a class="btn btn--outline btn--lg" href="contact.html" data-i18n="cta.talkToUs">Talk to us</a>
        </div>
      </div>
    </div>
  </section>`;

/* ── Contact ──────────────────────────────────────────────────────────── */
const office = (flag, name, lines) => `
        <div class="office-card">
          <span class="flag" aria-hidden="true">${flag}</span>
          <div><h4>${name}</h4><p>${lines}</p></div>
        </div>`;

const contact = `
  <section class="page-hero">
    <div class="shell">
      <span class="eyebrow" data-i18n="nav.contact">Contact</span>
      <h1>Talk to a person</h1>
      <p class="lede">Support questions, billing, press, or telling us the itinerary was wrong. All of it reaches a human.</p>
    </div>
  </section>

  <section class="section">
    <div class="shell contact-grid">
      <div>
        <div class="notice mb-5">${ICONS.info}<div><strong>This form does not send email yet</strong><span>No backend is connected in this build. Submissions are stored in your own browser so the flow can be demonstrated end to end.</span></div></div>

        <form id="contact-form" class="stack" novalidate>
          <div class="grid grid-2">
            <div class="field">
              <label for="contact-name">Your name</label>
              <input class="input" type="text" id="contact-name" name="name" required autocomplete="name" placeholder="Alex Moreau">
            </div>
            <div class="field">
              <label for="contact-email">Email address</label>
              <input class="input" type="email" id="contact-email" name="email" required autocomplete="email" placeholder="you@example.com">
            </div>
          </div>

          <div class="grid grid-2">
            <div class="field">
              <label for="contact-topic">What is it about?</label>
              <select class="select" id="contact-topic" name="topic">
                <option value="support">Help with a trip</option>
                <option value="billing">Billing and subscriptions</option>
                <option value="business">Pro and business travel</option>
                <option value="privacy">Privacy or data request</option>
                <option value="press">Press</option>
                <option value="other">Something else</option>
              </select>
            </div>
            <div class="field">
              <label for="contact-market">Your region</label>
              <select class="select" id="contact-market" name="market" data-role="contact-market"></select>
            </div>
          </div>

          <div class="field">
            <label for="contact-message">Message</label>
            <textarea class="textarea" id="contact-message" name="message" required placeholder="Tell us what is going on. If it is about a specific trip, the trip reference helps."></textarea>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" required>
            <span>I have read the <a href="legal/privacy.html">privacy notice</a> and agree to Llama handling my message to answer this enquiry.</span>
          </label>

          <div class="cluster">
            <button type="submit" class="btn btn--primary">Send message</button>
            <span class="subtle" style="font-size:.85rem">We reply within one working day.</span>
          </div>
        </form>
      </div>

      <aside class="contact-side">
        <div class="card">
          <h3>Direct lines</h3>
          <ul class="checklist mt-3">
            <li>Support &mdash; <a href="mailto:help@llama.example">help@llama.example</a></li>
            <li>Billing &mdash; <a href="mailto:billing@llama.example">billing@llama.example</a></li>
            <li>Privacy and data requests &mdash; <a href="mailto:privacy@llama.example">privacy@llama.example</a></li>
            <li>Press &mdash; <a href="mailto:press@llama.example">press@llama.example</a></li>
          </ul>
        </div>

        <div class="card" id="help">
          <h3>Response times</h3>
          <ul class="checklist mt-3">
            <li><strong>Free</strong> &mdash; community forum, best effort</li>
            <li><strong>Premium</strong> &mdash; email within 24 hours</li>
            <li><strong>Pro</strong> &mdash; 24/7 chat and callback on travel days</li>
          </ul>
        </div>

        <div class="card" id="status">
          <h3>System status</h3>
          <p class="pill-note mt-3"><span class="dot" aria-hidden="true"></span>All systems operational</p>
          <p class="muted mt-3" style="font-size:.88rem">Live incident history will be published at status.llama.example once the service launches.</p>
        </div>

        <div class="card">
          <h3>Offices</h3>
          <div class="stack mt-3">
${office('&#127482;&#127480;', 'Llama LLC', 'Wilmington, Delaware, United States<br>Registered entity for the Americas')}
${office('&#127468;&#127463;', 'Llama Travel Technologies UK Ltd.', 'London, United Kingdom')}
${office('&#127475;&#127473;', 'Llama Travel Technologies B.V.', 'Amsterdam, Netherlands<br>Contracting entity for the EU, including Germany and France')}
${office('&#127470;&#127475;', 'Llama Travel Tech India Pvt. Ltd.', 'Bengaluru, India')}
${office('&#127471;&#127477;', 'Llama Travel Technologies KK', 'Tokyo, Japan')}
          </div>
          <p class="subtle mt-4" style="font-size:.8rem">Addresses are placeholders for this build.</p>
        </div>
      </aside>
    </div>
  </section>`;

/* ── Signup ───────────────────────────────────────────────────────────── */
const signup = `
  <section class="page-hero">
    <div class="shell">
      <div class="crumbs"><a href="index.html" data-i18n="nav.home">Home</a> <span>/</span> <span>Create account</span></div>
      <h1>Create your Llama account</h1>
      <p class="lede">The Free plan starts immediately. Paid plans are not chargeable yet &mdash; pick one and we will tell you the day billing opens in your market.</p>
    </div>
  </section>

  <section class="section" id="signup-page">
    <div class="shell signup-grid">
      <div>
        <div class="notice notice--warn mb-5" data-when="payments-off">
          ${ICONS.info}
          <div>
            <strong data-i18n="pricing.noPaymentTitle">Subscriptions are not live yet</strong>
            <span data-i18n="pricing.noPaymentBody"></span>
          </div>
        </div>

        <form id="signup-form" class="stack" novalidate>
          <div class="grid grid-2">
            <div class="field">
              <label for="signup-name">Full name</label>
              <input class="input" type="text" id="signup-name" name="name" required autocomplete="name" placeholder="Alex Moreau">
            </div>
            <div class="field">
              <label for="signup-email" data-i18n="modal.emailLabel">Email address</label>
              <input class="input" type="email" id="signup-email" name="email" required autocomplete="email" data-i18n-attr="placeholder:modal.emailPh" placeholder="you@example.com">
            </div>
          </div>

          <div class="grid grid-2">
            <div class="field">
              <label for="signup-plan" data-i18n="modal.planLabel">Plan</label>
              <select class="select" id="signup-plan" name="plan"></select>
            </div>
            <div class="field">
              <label for="signup-cycle">Billing period</label>
              <select class="select" id="signup-cycle" name="cycle">
                <option value="monthly" data-i18n="pricing.monthly">Monthly</option>
                <option value="annual" data-i18n="pricing.annual">Annual</option>
              </select>
            </div>
          </div>

          <div class="field">
            <label for="signup-home">Usual departure city <span class="subtle">(optional)</span></label>
            <input class="input" type="text" id="signup-home" name="home" autocomplete="address-level2" placeholder="Berlin, Bengaluru, Manchester&hellip;">
            <span class="hint">Used to price flights from the right airport by default. You can change it later.</span>
          </div>

          <label class="checkbox-row">
            <input type="checkbox" required>
            <span>I agree to the <a href="legal/terms.html" data-i18n="footer.terms">terms of service</a> and the <a href="legal/privacy.html" data-i18n="footer.privacy">privacy notice</a>.</span>
          </label>

          <label class="checkbox-row">
            <input type="checkbox">
            <span>Send me occasional product updates. Optional, and easy to turn off.</span>
          </label>

          <div class="cluster">
            <button type="submit" class="btn btn--primary btn--lg">Create account</button>
            <span class="subtle" style="font-size:.85rem">No card is requested or stored.</span>
          </div>
        </form>

        <p class="muted mt-5" style="font-size:.9rem">Already have an account? Sign-in will be available when the app launches.</p>
      </div>

      <aside class="card order-summary">
        <h3>Summary</h3>
        <div id="order-summary-rows" class="mt-3"></div>
        <p class="subtle mt-4" style="font-size:.82rem" id="summary-note"></p>
        <div class="form-note mt-4" style="font-size:.84rem" data-when="payments-off">No payment method is collected on this page and no charge can be made. This summary shows what the price would be in your selected region.</div>
        <div class="form-note mt-4" style="font-size:.84rem" data-when="payments-on" hidden>Card details are entered on Stripe&rsquo;s secure checkout page, never here. Tax is calculated from your billing address at that step.</div>
      </aside>
    </div>
  </section>`;

/* ── Checkout success ─────────────────────────────────────────────────── */
const checkoutSuccess = `
  <section class="section" id="checkout-success">
    <div class="shell shell--narrow center">
      <span class="icon-tile mx-auto mb-4" style="width:64px;height:64px;border-radius:50%">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:30px;height:30px" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
      </span>
      <h1 data-role="success-title" data-i18n="success.checking">Confirming your payment&hellip;</h1>
      <p class="lede mx-auto mt-4" data-role="success-status"></p>
      <p class="badge badge--soft mt-4" data-role="success-detail"></p>

      <div class="cluster mt-6" style="justify-content:center">
        <a class="btn btn--primary btn--lg" href="index.html" data-i18n="success.cta">Start planning</a>
        <a class="btn btn--outline btn--lg" href="account.html" data-i18n="success.manage">Manage subscription</a>
      </div>

      <p class="subtle mt-6" style="font-size:.86rem">A VAT or GST invoice is attached to your receipt email. You can download past invoices any time from <a href="account.html">your billing portal</a>.</p>
    </div>
  </section>`;

/* ── Account: sign-in or dashboard ────────────────────────────────────── */
const account = `
  <section class="page-hero">
    <div class="shell">
      <div class="crumbs"><a href="index.html" data-i18n="nav.home">Home</a> <span>/</span> <span data-i18n="account.title">Your account</span></div>
      <h1 data-role="account-heading" data-i18n="account.title">Your account</h1>
      <p class="lede" data-role="account-lede" data-i18n="account.lede"></p>
    </div>
  </section>

  <section class="section" id="account-page">

    <!-- ============ Signed out ============ -->
    <div class="shell shell--narrow" data-account-state="out" hidden>
      <div class="notice mb-5" data-when="payments-off">
        ${ICONS.info}
        <div>
          <strong data-i18n="pricing.noPaymentTitle">Subscriptions are not live yet</strong>
          <span data-i18n="account.notLiveBody"></span>
        </div>
      </div>

      <div class="notice notice--warn mb-5" data-role="signin-expired" hidden>
        ${ICONS.info}
        <div><span data-i18n="account.linkExpired"></span></div>
      </div>

      <form id="signin-form" class="card stack" novalidate>
        <h3 data-i18n="account.signInTitle">Sign in</h3>
        <p class="muted" style="font-size:.93rem" data-i18n="account.signInLede"></p>
        <div class="field">
          <label for="signin-email" data-i18n="account.emailLabel">The email address on your subscription</label>
          <input class="input" type="email" id="signin-email" name="email" required autocomplete="email" data-i18n-attr="placeholder:modal.emailPh" placeholder="you@example.com">
          <span class="hint" data-i18n="account.signInHint"></span>
        </div>
        <div class="cluster">
          <button type="submit" class="btn btn--primary" data-i18n="account.sendLink">Email me a sign-in link</button>
        </div>
      </form>

      <div class="form-note mt-4" data-role="dev-link" hidden>
        <strong data-i18n="account.devLinkTitle"></strong>
        <p class="mt-2" style="font-size:.85rem" data-i18n="account.devLinkBody"></p>
        <p class="mt-2"><a href="#" data-role="dev-link-url" style="word-break:break-all;font-size:.82rem"></a></p>
      </div>

      <p class="muted mt-6 center" style="font-size:.92rem" data-i18n-html="account.noSubYet"></p>
    </div>

    <!-- ============ Signed in ============ -->
    <div class="shell" data-account-state="in" hidden>
      <div class="signup-grid">
        <div>
          <!-- Plan summary -->
          <article class="card mb-5">
            <div class="feature-card__head">
              <div>
                <span class="eyebrow" data-i18n="account.yourPlan">Your plan</span>
                <h2 style="font-size:1.9rem;margin-top:6px"><span data-role="plan-name">—</span></h2>
              </div>
              <span class="badge" data-role="plan-status">—</span>
            </div>
            <div id="plan-meta" class="mt-4"></div>

            <div class="notice notice--warn mt-4" data-role="billing-mismatch" hidden>
              ${ICONS.info}
              <div>
                <strong data-i18n="account.mismatchTitle"></strong>
                <span data-role="mismatch-message"></span>
                <a href="pricing.html" data-i18n="account.mismatchAction"></a>
              </div>
            </div>
            <div class="cluster mt-5">
              <button type="button" class="btn btn--primary" data-action="open-portal" data-i18n="account.manageBilling">Manage billing</button>
              <a class="btn btn--outline" href="pricing.html" data-role="change-plan" data-i18n="account.changePlan">Change plan</a>
              <button type="button" class="btn btn--ghost" data-action="sign-out" data-i18n="account.signOut">Sign out</button>
            </div>
          </article>

          <!-- Gated feature demo -->
          <article class="card">
            <div class="feature-card__head">
              <h3 data-i18n="account.trips">Your trips</h3>
              <span class="badge badge--soft" data-role="trips-usage">—</span>
            </div>
            <p class="muted mt-2" style="font-size:.92rem" data-i18n="account.tripsLede"></p>

            <div class="notice notice--warn mt-4" data-role="limit-notice" hidden>
              ${ICONS.info}
              <div>
                <strong data-role="limit-message"></strong>
                <a href="pricing.html" data-role="limit-upgrade" data-i18n="account.upgradePrompt"></a>
              </div>
            </div>

            <ul class="checklist mt-4" data-role="trip-list"></ul>
            <p class="subtle mt-3" style="font-size:.88rem" data-role="trips-empty" data-i18n="account.noTrips" hidden></p>

            <form id="trip-form" class="stack mt-5" novalidate>
              <div class="grid grid-3">
                <div class="field">
                  <label for="trip-destination" data-i18n="account.destination">Destination</label>
                  <input class="input" type="text" id="trip-destination" required maxlength="120" placeholder="Kyoto">
                </div>
                <div class="field">
                  <label for="trip-travellers" data-i18n="account.travellers">Travellers</label>
                  <input class="input" type="number" id="trip-travellers" min="1" max="20" value="1">
                </div>
                <div class="field">
                  <label for="trip-days" data-i18n="account.days">Days</label>
                  <input class="input" type="number" id="trip-days" min="1" max="90" value="5">
                </div>
              </div>
              <div class="cluster">
                <button type="submit" class="btn btn--primary btn--sm" data-i18n="account.createTrip">Plan a trip</button>
                <span class="subtle" style="font-size:.84rem" data-i18n="account.enforcedNote"></span>
              </div>
            </form>
          </article>
        </div>

        <!-- Entitlements -->
        <aside class="card order-summary">
          <h3 data-i18n="account.entitlements">What your plan includes</h3>
          <div id="entitlement-list" class="mt-4"></div>
          <p class="subtle mt-4" style="font-size:.8rem" data-i18n="account.entitlementsNote"></p>
        </aside>
      </div>
    </div>
  </section>`;

/* ── 404 ──────────────────────────────────────────────────────────────── */
const notFound = `
  <section class="section">
    <div class="shell shell--narrow center">
      <span class="eyebrow">404</span>
      <h1 class="mt-3">That page took a wrong turn</h1>
      <p class="lede mx-auto mt-4">The link may be out of date, or the page may have moved. Llama is better at itineraries than at URLs.</p>
      <div class="cluster mt-6" style="justify-content:center">
        <a class="btn btn--primary btn--lg" href="index.html" data-i18n="nav.home">Home</a>
        <a class="btn btn--outline btn--lg" href="pricing.html" data-i18n="nav.pricing">Pricing</a>
        <a class="btn btn--ghost btn--lg" href="contact.html" data-i18n="nav.contact">Contact</a>
      </div>
    </div>
  </section>`;

module.exports = { home, features, pricing, about, contact, signup, checkoutSuccess, account, notFound, ICONS };
