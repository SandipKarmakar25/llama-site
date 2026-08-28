/* Legal page content. Templates only - see the review banner on each page. */

'use strict';

const { ICONS } = require('./pages');

const UPDATED = '23 August 2026';

const REVIEW_BANNER = `<div class="notice notice--warn mb-6">
        ${ICONS.info}
        <div>
          <strong>Draft template &mdash; not yet reviewed by counsel</strong>
          <span>This document is a starting point written for the launch build. It must be reviewed and adapted by a qualified lawyer in each market before the site goes live, and company names, addresses and contact details replaced with real ones.</span>
        </div>
      </div>`;

const toc = (items) => `
      <nav class="doc-toc" aria-label="On this page">
        <h4>On this page</h4>
        <ul>${items.map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`).join('')}</ul>
      </nav>`;

const doc = ({ eyebrow, title, lede, tocItems, body }) => `
  <section class="page-hero">
    <div class="shell">
      <div class="crumbs"><a href="../index.html" data-i18n="nav.home">Home</a> <span>/</span> <span data-i18n="footer.legal">Legal</span></div>
      <span class="eyebrow">${eyebrow}</span>
      <h1>${title}</h1>
      <p class="lede">${lede}</p>
    </div>
  </section>

  <section class="section">
    <div class="shell doc-layout">
${toc(tocItems)}
      <div>
        <div class="doc-meta">
          <span><b>Last updated:</b> ${UPDATED}</span>
          <span><b>Applies to:</b> US, UK, Germany, France, India, Japan</span>
        </div>
        ${REVIEW_BANNER}
        <div class="prose">
${body}
        </div>
      </div>
    </div>
  </section>`;

/* ── Privacy ──────────────────────────────────────────────────────────── */
const privacy = doc({
  eyebrow: 'Legal',
  title: 'Privacy notice',
  lede: 'What we collect when you plan a trip with Llama, why we hold it, how long we keep it, and the rights you have in your market.',
  tocItems: [
    ['who', 'Who we are'],
    ['what', 'What we collect'],
    ['why', 'Why and on what basis'],
    ['sharing', 'Who we share it with'],
    ['transfers', 'International transfers'],
    ['retention', 'How long we keep it'],
    ['rights', 'Your rights'],
    ['regional', 'Market-specific notes'],
    ['contact', 'Contacting us']
  ],
  body: `
          <h2 id="who">Who we are</h2>
          <p>Llama LLC, registered in Delaware, United States, provides the Llama travel planning assistant. Depending on where you live, the controller of your personal data is:</p>
          <table>
            <thead><tr><th>Your market</th><th>Controller</th></tr></thead>
            <tbody>
              <tr><td>United States</td><td>Llama LLC (Delaware, USA)</td></tr>
              <tr><td>United Kingdom</td><td>Llama Travel Technologies UK Ltd.</td></tr>
              <tr><td>Germany and France</td><td>Llama Travel Technologies B.V. (Netherlands)</td></tr>
              <tr><td>India</td><td>Llama Travel Tech India Pvt. Ltd.</td></tr>
              <tr><td>Japan</td><td>Llama Travel Technologies KK</td></tr>
            </tbody>
          </table>

          <h2 id="what">What we collect</h2>
          <ul>
            <li><strong>Account data</strong> &mdash; name, email address, password hash, chosen plan, market and language.</li>
            <li><strong>Trip data</strong> &mdash; destinations, dates, travel companions you add, preferences, budgets, saved itineraries and booking references you choose to store.</li>
            <li><strong>Traveller details</strong> &mdash; where you ask us to check entry requirements, the nationality and passport expiry you provide. We do not ask for passport numbers.</li>
            <li><strong>Usage data</strong> &mdash; pages viewed, features used, approximate location derived from IP address, device and browser type.</li>
            <li><strong>Billing data</strong> &mdash; when subscriptions launch, a payment processor will handle card details. We will store the subscription status, plan, market and invoices, never full card numbers.</li>
            <li><strong>Support data</strong> &mdash; messages you send us and our replies.</li>
          </ul>

          <h2 id="why">Why and on what basis</h2>
          <table>
            <thead><tr><th>Purpose</th><th>Legal basis (UK/EU GDPR)</th></tr></thead>
            <tbody>
              <tr><td>Providing the planning service you asked for</td><td>Performance of a contract</td></tr>
              <tr><td>Taking payment and issuing invoices</td><td>Performance of a contract; legal obligation</td></tr>
              <tr><td>Price monitoring and disruption alerts you enable</td><td>Performance of a contract</td></tr>
              <tr><td>Keeping the service secure and preventing abuse</td><td>Legitimate interests</td></tr>
              <tr><td>Product analytics</td><td>Consent (optional cookies)</td></tr>
              <tr><td>Marketing email</td><td>Consent, withdrawable at any time</td></tr>
              <tr><td>Meeting tax and accounting obligations</td><td>Legal obligation</td></tr>
            </tbody>
          </table>

          <h2 id="sharing">Who we share it with</h2>
          <p>We share personal data only with processors acting on our instructions, and only what each needs:</p>
          <ul>
            <li>Cloud hosting and database providers.</li>
            <li>Travel data providers, when you ask for a search &mdash; typically route, dates and passenger count, not your identity.</li>
            <li>A payment processor, once subscriptions launch.</li>
            <li>Email and customer support tooling.</li>
            <li>Analytics, only where you have accepted optional cookies.</li>
          </ul>
          <p><strong>We do not sell personal data, and we do not share it for cross-context behavioural advertising.</strong> We do not disclose your trip data to advertisers or data brokers.</p>

          <h2 id="transfers">International transfers</h2>
          <p>We operate across six markets, so data may be processed outside your country. Where data leaves the UK or EEA, we rely on adequacy decisions where they exist, and otherwise on Standard Contractual Clauses together with a transfer risk assessment. Indian and Japanese transfers are handled under the corresponding requirements of the DPDP Act and APPI. A copy of the safeguards in place is available on request.</p>

          <h2 id="retention">How long we keep it</h2>
          <ul>
            <li><strong>Account data</strong> &mdash; while your account is open, then 30 days after deletion.</li>
            <li><strong>Trip data</strong> &mdash; while your account is open, or until you delete the trip.</li>
            <li><strong>Invoices and tax records</strong> &mdash; as long as tax law in the relevant market requires, typically six to ten years.</li>
            <li><strong>Support messages</strong> &mdash; 24 months.</li>
            <li><strong>Server logs</strong> &mdash; 90 days.</li>
          </ul>

          <h2 id="rights">Your rights</h2>
          <p>Subject to local law, you can ask us to give you a copy of your data, correct it, delete it, restrict or object to processing, provide it in a portable format, or withdraw consent you previously gave. You can also complain to your data protection authority. We respond within one month, and we do not charge for this.</p>

          <h2 id="regional">Market-specific notes</h2>
          <h3>United Kingdom and European Union</h3>
          <p>Processing is governed by UK GDPR and EU GDPR respectively. Supervisory authorities are the ICO in the UK, the relevant Land authority in Germany, and the CNIL in France. Our EU representative can be contacted at the Amsterdam entity above.</p>
          <h3>United States</h3>
          <p>California residents have rights under the CCPA/CPRA to know, delete, correct and opt out of sale or sharing. We do not sell or share personal information as those terms are defined, so there is nothing to opt out of, but the request channel is open regardless. We honour Global Privacy Control signals.</p>
          <h3>India</h3>
          <p>Processing follows the Digital Personal Data Protection Act 2023. You may nominate another person to exercise your rights in the event of death or incapacity, and you may raise grievances with our Grievance Officer before approaching the Data Protection Board.</p>
          <h3>Japan</h3>
          <p>Processing follows the Act on the Protection of Personal Information. We will disclose the purposes of use on request and will not provide personal data to third parties without consent except where APPI permits.</p>

          <h2 id="contact">Contacting us</h2>
          <p>Privacy questions and rights requests: <a href="mailto:privacy@llama.example">privacy@llama.example</a>. Our Data Protection Officer can be reached at the same address, marked for their attention.</p>`
});

/* ── Terms ────────────────────────────────────────────────────────────── */
const terms = doc({
  eyebrow: 'Legal',
  title: 'Terms of service',
  lede: 'The agreement between you and Llama when you use the planning assistant, including what we do and do not promise.',
  tocItems: [
    ['agreement', 'The agreement'],
    ['eligibility', 'Eligibility'],
    ['account', 'Your account'],
    ['plans', 'Plans and features'],
    ['billing', 'Billing'],
    ['acceptable', 'Acceptable use'],
    ['bookings', 'Bookings and third parties'],
    ['accuracy', 'Accuracy and limits'],
    ['ip', 'Intellectual property'],
    ['liability', 'Liability'],
    ['termination', 'Ending the agreement'],
    ['law', 'Governing law']
  ],
  body: `
          <h2 id="agreement">The agreement</h2>
          <p>These terms are between you and the Llama entity for your market, as listed in the <a href="privacy.html#who">privacy notice</a>. By creating an account or using the service you accept them. If you do not accept them, do not use the service.</p>

          <h2 id="eligibility">Eligibility</h2>
          <p>You must be at least 16 years old, or the age of digital consent in your country if that is higher, and legally able to enter a contract. If you use Llama on behalf of an organisation, you confirm you are authorised to bind it.</p>

          <h2 id="account">Your account</h2>
          <p>Keep your credentials secure and tell us promptly if you believe someone else has access. You are responsible for activity under your account. Information you give us should be accurate, particularly nationality and passport validity where you ask us to check entry requirements.</p>

          <h2 id="plans">Plans and features</h2>
          <p>The service is offered on three plans &mdash; Free, Premium and Pro &mdash; with the features described on the <a href="../pricing.html">pricing page</a>. Usage limits, such as the number of trips or watched routes, form part of these terms. We may add, change or withdraw features; where a change materially reduces what a paid plan offers, we will give at least 30 days' notice and you may cancel and receive a pro-rata refund for the unused period.</p>

          <h2 id="billing">Billing</h2>
          <p><strong>Subscriptions are not currently available.</strong> No payment processor is connected to this site and no charge can be made. The following terms take effect when billing opens.</p>
          <ul>
            <li>Prices are shown in your local currency. In the UK, EU, India and Japan they include applicable tax; in the United States sales tax is added at checkout where it applies.</li>
            <li>Subscriptions renew automatically at the end of each period until cancelled. We will email you before an annual renewal.</li>
            <li>Upgrades take effect immediately, with the difference charged pro rata. Downgrades and cancellations take effect at the end of the period you have paid for.</li>
            <li>If a payment fails we may suspend paid features after notifying you and allowing a reasonable period to fix it.</li>
            <li>Refunds and withdrawal rights are set out in the <a href="refunds.html">refunds and cancellation policy</a>.</li>
          </ul>

          <h2 id="acceptable">Acceptable use</h2>
          <p>Do not use Llama to break the law, to scrape or resell our output at scale, to reverse engineer the service, to circumvent usage limits, or to submit other people's personal data without a lawful basis for doing so. Automated access is permitted only through the Pro API and within its documented limits.</p>

          <h2 id="bookings">Bookings and third parties</h2>
          <p>Llama plans trips; it does not sell travel. When you book, your contract is with the airline, railway, hotel or booking platform, on their terms. We are not a travel agent, tour operator or package organiser, and we are not liable for their performance. Some links earn us a referral fee, which we disclose where it applies and which never changes your price.</p>

          <h2 id="accuracy">Accuracy and limits</h2>
          <p>Llama uses automated systems, including AI models, and information from third parties. It can be wrong. Prices, schedules, opening hours and entry requirements change without notice.</p>
          <p><strong>Entry, visa and health requirements are advisory only.</strong> They depend on your nationality, route and circumstances, and they change frequently. Always confirm with the relevant government or embassy before you travel. We are not liable for denied boarding or refused entry.</p>

          <h2 id="ip">Intellectual property</h2>
          <p>We own the service, the software and our brand. You own the trips and content you create. You grant us the licence needed to host, process and display that content in order to provide the service. You may export and use your itineraries freely, including commercially.</p>

          <h2 id="liability">Liability</h2>
          <p>Nothing here limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited &mdash; including your non-excludable rights under UK and EU consumer law, the Indian Consumer Protection Act 2019 and the Japanese Consumer Contract Act.</p>
          <p>Subject to that, our total liability in any 12-month period is limited to the greater of the amount you paid us in that period or 100 units of your local currency, and we are not liable for indirect or consequential loss, or for loss arising from a third party's cancellation or failure to perform.</p>

          <h2 id="termination">Ending the agreement</h2>
          <p>You may close your account at any time from account settings. We may suspend or end access if you materially breach these terms, giving notice and an opportunity to fix it where the breach can be fixed. You can export your trips before closing, and we will delete your data as described in the privacy notice.</p>

          <h2 id="law">Governing law</h2>
          <p>The governing law and courts depend on the contracting entity for your market. Consumers keep the protection of the mandatory law of their country of residence and may bring proceedings there. EU consumers may also use the European Commission's online dispute resolution platform.</p>`
});

/* ── Cookies ──────────────────────────────────────────────────────────── */
const cookies = doc({
  eyebrow: 'Legal',
  title: 'Cookie policy',
  lede: 'What we store on your device, what is optional, and how to change your mind.',
  tocItems: [
    ['what', 'What we use'],
    ['categories', 'Categories'],
    ['current', 'What this build actually stores'],
    ['managing', 'Managing your choices']
  ],
  body: `
          <h2 id="what">What we use</h2>
          <p>We use a small number of cookies and equivalent browser storage. Strictly necessary items are set without consent because the site cannot work without them. Everything else is off until you accept it, and you can change your answer at any time.</p>

          <h2 id="categories">Categories</h2>
          <table>
            <thead><tr><th>Category</th><th>Purpose</th><th>Consent needed</th><th>Typical lifetime</th></tr></thead>
            <tbody>
              <tr><td>Strictly necessary</td><td>Sign-in session, security, load balancing, remembering your cookie choice</td><td>No</td><td>Session to 12 months</td></tr>
              <tr><td>Preferences</td><td>Region, currency, language and colour theme</td><td>No &mdash; set only when you choose them</td><td>12 months</td></tr>
              <tr><td>Analytics</td><td>Aggregate product usage so we can see which features are worth keeping</td><td>Yes</td><td>Up to 13 months</td></tr>
              <tr><td>Marketing</td><td>Measuring campaign performance</td><td>Yes</td><td>Up to 13 months</td></tr>
            </tbody>
          </table>

          <h2 id="current">What this build actually stores</h2>
          <p>This launch build sets no analytics or marketing cookies at all. It uses browser local storage for the following, all first-party and none shared with anyone:</p>
          <ul>
            <li><code>llama.market</code>, <code>llama.lang</code>, <code>llama.cycle</code> &mdash; your region, language and billing-period preferences.</li>
            <li><code>llama.theme</code> &mdash; light or dark colour theme.</li>
            <li><code>llama.cookieConsent</code> &mdash; the choice you made in the cookie banner.</li>
            <li><code>llama.planInterest</code>, <code>llama.contactMessages</code> &mdash; form submissions, kept in your browser only because no backend is connected.</li>
          </ul>
          <p>Clearing your browser storage for this site removes all of it.</p>

          <h2 id="managing">Managing your choices</h2>
          <p>Use the cookie banner, or clear site data in your browser to be asked again. Most browsers also let you block cookies entirely, though strictly necessary ones are required for sign-in to work. We honour Global Privacy Control signals where your browser sends them.</p>`
});

/* ── Refunds ──────────────────────────────────────────────────────────── */
const refunds = doc({
  eyebrow: 'Legal',
  title: 'Refunds and cancellation',
  lede: 'How to cancel, what you get back, and the statutory rights that apply in your market.',
  tocItems: [
    ['status', 'Current status'],
    ['cancelling', 'Cancelling'],
    ['withdrawal', 'EU and UK right of withdrawal'],
    ['guarantee', 'Money-back guarantee'],
    ['regional', 'By market'],
    ['how', 'How to request one']
  ],
  body: `
          <h2 id="status">Current status</h2>
          <div class="notice notice--warn">${ICONS.info}<div><strong>Nothing can be charged today</strong><span>Subscriptions are not yet available and no payment processor is connected to this site. This policy describes what will apply once billing opens.</span></div></div>

          <h2 id="cancelling">Cancelling</h2>
          <p>You can cancel at any time from account settings. There is no phone call, no retention offer and no cancellation fee. Cancelling stops the next renewal; your paid features continue until the end of the period you have already paid for, and your account then reverts to Free rather than being deleted. Trips you have already planned remain readable and exportable.</p>

          <h2 id="withdrawal">EU and UK right of withdrawal</h2>
          <p>If you live in the European Union or the United Kingdom, you have a statutory right to withdraw from the contract within <strong>14 days</strong> of subscribing, without giving a reason, and to receive a full refund.</p>
          <p>Because a subscription gives you immediate access to digital content, you will be asked at checkout to consent to the service starting straight away and to acknowledge that you lose the right of withdrawal once it has been fully performed. Where you have used the service during the withdrawal period, we may deduct a proportionate amount for what you used. In practice, for a first subscription within 14 days we refund in full.</p>

          <h2 id="guarantee">Money-back guarantee</h2>
          <p>In markets without a statutory withdrawal right, we offer the same thing contractually: a full refund within 14 days of your first subscription payment, for any reason. This is in addition to, and does not limit, your rights under local consumer law.</p>

          <h2 id="regional">By market</h2>
          <table>
            <thead><tr><th>Market</th><th>What applies</th><th>Tax on refunds</th></tr></thead>
            <tbody>
              <tr><td>United Kingdom</td><td>14-day statutory right of withdrawal</td><td>VAT refunded proportionally</td></tr>
              <tr><td>Germany</td><td>14-day statutory right of withdrawal (Widerrufsrecht)</td><td>MwSt. refunded proportionally</td></tr>
              <tr><td>France</td><td>14-day statutory right of withdrawal (droit de r&eacute;tractation)</td><td>TVA refunded proportionally</td></tr>
              <tr><td>United States</td><td>14-day money-back guarantee</td><td>Sales tax refunded where charged</td></tr>
              <tr><td>India</td><td>14-day money-back guarantee</td><td>GST refunded with a credit note</td></tr>
              <tr><td>Japan</td><td>14-day money-back guarantee</td><td>Consumption tax refunded proportionally</td></tr>
            </tbody>
          </table>

          <h2 id="how">How to request one</h2>
          <p>Email <a href="mailto:billing@llama.example">billing@llama.example</a> from the address on the account, or use the cancellation form in account settings. We acknowledge within one working day and process approved refunds within 14 days to the original payment method. Renewals are also refundable in full if you contact us within 14 days of the charge and have not used paid features in that period.</p>
          <p>If something has gone wrong that is our fault &mdash; an outage during your trip, a failed alert you were relying on &mdash; tell us. We would rather refund it than argue about the policy.</p>`
});

module.exports = { privacy, terms, cookies, refunds };
