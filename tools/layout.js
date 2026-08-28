/* ==========================================================================
   Shared page shell for the static-site generator.
   Emits plain HTML files - there is no runtime dependency on this script.
   See tools/build.js for the runner and tools/pages.js for page content.
   ========================================================================== */

'use strict';

/** Relative prefix for asset/page links given a page's directory depth. */
function up(depth) {
  return depth === 0 ? '' : '../'.repeat(depth);
}

const MARK_GRADIENT = `<svg class="brand__mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#12958f"/><stop offset=".55" stop-color="#0e7c7b"/><stop offset="1" stop-color="#095857"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#bm)"/><g fill="#fff"><path d="M35.2 20.6c-1.3-5.8-.5-9.6 2-9.8 2.5-.2 3.7 3.4 3.3 9.4z"/><path d="M45.6 21.4c.2-5.9 1.6-8.9 3.7-8.4 2.1.5 2.3 4.4.6 9.3z"/><path d="M34.6 19.8h6.6a9.4 9.4 0 0 1 9.4 9.4v20.9a4.6 4.6 0 0 1-4.6 4.6h-3.9a4.6 4.6 0 0 1-4.6-4.6V37.9h-8.1a8.4 8.4 0 0 1-8.4-8.4v-1.2a8.5 8.5 0 0 1 8.5-8.5z"/><rect x="11.4" y="22.6" width="22.6" height="14.6" rx="7.3"/></g><circle cx="31.6" cy="27.4" r="2.4" fill="#0e7c7b"/></svg>`;

const MARK_FLAT = `<svg class="brand__mark" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0e7c7b"/><g fill="#fff"><path d="M35.2 20.6c-1.3-5.8-.5-9.6 2-9.8 2.5-.2 3.7 3.4 3.3 9.4z"/><path d="M45.6 21.4c.2-5.9 1.6-8.9 3.7-8.4 2.1.5 2.3 4.4.6 9.3z"/><path d="M34.6 19.8h6.6a9.4 9.4 0 0 1 9.4 9.4v20.9a4.6 4.6 0 0 1-4.6 4.6h-3.9a4.6 4.6 0 0 1-4.6-4.6V37.9h-8.1a8.4 8.4 0 0 1-8.4-8.4v-1.2a8.5 8.5 0 0 1 8.5-8.5z"/><rect x="11.4" y="22.6" width="22.6" height="14.6" rx="7.3"/></g><circle cx="31.6" cy="27.4" r="2.4" fill="#0e7c7b"/></svg>`;

const NAV_ITEMS = [
  ['index.html', 'nav.home', 'Home'],
  ['features.html', 'nav.features', 'Features'],
  ['pricing.html', 'nav.pricing', 'Pricing'],
  ['about.html', 'nav.about', 'About'],
  ['contact.html', 'nav.contact', 'Contact']
];

function navLinks(depth) {
  const p = up(depth);
  return NAV_ITEMS
    .map(([href, key, fallback]) => `<a href="${p}${href}" data-i18n="${key}">${fallback}</a>`)
    .join('\n      ');
}

function header(depth) {
  const p = up(depth);
  return `<a class="skip-link" href="#main" data-i18n="a11y.skip">Skip to main content</a>

<header class="site-header">
  <div class="shell site-header__inner">
    <a class="brand" href="${p}index.html">
      ${MARK_GRADIENT}
      <span>Llama<span class="brand__llc">LLC</span></span>
    </a>

    <nav class="nav" aria-label="Primary">
      ${navLinks(depth)}
    </nav>

    <div class="header-actions">
      <div class="locale-switch">
        <button type="button" class="locale-switch__btn" aria-expanded="false" aria-haspopup="dialog">
          <span class="flag" aria-hidden="true">&#127760;</span>
          <span class="label">US &middot; USD</span>
          <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="locale-panel" role="dialog" aria-label="Region and language">
          <div class="field">
            <label for="region-select" data-i18n="switch.region">Region</label>
            <select class="select" id="region-select" data-role="region-select"></select>
          </div>
          <div class="field">
            <label for="lang-select" data-i18n="switch.language">Language</label>
            <select class="select" id="lang-select" data-role="lang-select"></select>
          </div>
          <p class="locale-panel__note" data-i18n="switch.note"></p>
        </div>
      </div>

      <button type="button" class="icon-btn theme-toggle" data-action="toggle-theme" data-i18n-attr="aria-label:a11y.theme" aria-label="Switch colour theme">
        <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
      </button>

      <a class="btn btn--outline btn--sm account-link" href="${p}account.html" data-when="signed-in" hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>
        <span data-i18n="nav.account">Account</span>
        <span class="badge badge--free" data-role="account-chip" hidden></span>
      </a>

      <a class="btn btn--primary btn--sm" href="${p}signup.html" data-when="signed-out" data-i18n="cta.startFree">Start free</a>

      <button type="button" class="icon-btn nav-toggle" data-action="toggle-nav" aria-expanded="false" aria-controls="mobile-nav" data-i18n-attr="aria-label:a11y.menu" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
      </button>
    </div>
  </div>

  <div class="shell">
    <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">
      ${navLinks(depth)}
      <div class="cluster">
        <a class="btn btn--primary" href="${p}signup.html" data-i18n="cta.startFree">Start free</a>
        <a class="btn btn--outline" href="${p}pricing.html" data-i18n="cta.seePlans">See plans</a>
      </div>
    </nav>
  </div>
</header>`;
}

function footer(depth) {
  const p = up(depth);
  return `<footer class="site-footer">
  <div class="shell">
    <div class="footer-grid">
      <div class="footer-col footer-about">
        <a class="brand" href="${p}index.html">
          ${MARK_FLAT}
          <span>Llama<span class="brand__llc">LLC</span></span>
        </a>
        <p data-i18n="footer.about">Llama is a travel planning assistant built by Llama LLC.</p>
      </div>

      <div class="footer-col">
        <h4 data-i18n="footer.product">Product</h4>
        <ul>
          <li><a href="${p}features.html" data-i18n="nav.features">Features</a></li>
          <li><a href="${p}pricing.html" data-i18n="nav.pricing">Pricing</a></li>
          <li><a href="${p}signup.html" data-i18n="cta.startFree">Start free</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4 data-i18n="footer.company">Company</h4>
        <ul>
          <li><a href="${p}about.html" data-i18n="nav.about">About</a></li>
          <li><a href="${p}about.html#careers" data-i18n="footer.careers">Careers</a></li>
          <li><a href="${p}about.html#press" data-i18n="footer.press">Press</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4 data-i18n="footer.support">Support</h4>
        <ul>
          <li><a href="${p}contact.html" data-i18n="footer.contact">Contact us</a></li>
          <li><a href="${p}account.html" data-i18n="account.title">Manage subscription</a></li>
          <li><a href="${p}contact.html#help" data-i18n="footer.help">Help centre</a></li>
          <li><a href="${p}contact.html#status" data-i18n="footer.status">System status</a></li>
        </ul>
      </div>

      <div class="footer-col">
        <h4 data-i18n="footer.legal">Legal</h4>
        <ul>
          <li><a href="${p}legal/privacy.html" data-i18n="footer.privacy">Privacy notice</a></li>
          <li><a href="${p}legal/terms.html" data-i18n="footer.terms">Terms of service</a></li>
          <li><a href="${p}legal/cookies.html" data-i18n="footer.cookies">Cookie policy</a></li>
          <li><a href="${p}legal/refunds.html" data-i18n="footer.refunds">Refunds &amp; cancellation</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <p data-i18n="footer.rights">&copy; 2026 Llama LLC. All rights reserved.</p>
      <p data-i18n="brand.tagline">Travel planning, handled.</p>
    </div>
    <p class="footer-legal-note" data-i18n="footer.entityNote"></p>
    <p class="footer-legal-note"><strong data-i18n="footer.demoNote"></strong></p>
  </div>
</footer>`;
}

function tail(depth) {
  const p = up(depth);
  return `<!-- Plan interest modal - stands in for checkout until a payment processor is connected -->
<dialog class="modal" id="plan-modal" aria-labelledby="plan-modal-title">
  <button type="button" class="modal__close" data-action="close-modal" data-i18n-attr="aria-label:a11y.close" aria-label="Close">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  </button>
  <form class="modal__body" novalidate>
    <h3 id="plan-modal-title" data-i18n="modal.title">Payments are not live yet</h3>
    <p class="muted" data-role="modal-body" style="font-size:.93rem"></p>
    <div class="form-note"><strong data-i18n="modal.planLabel">Selected plan</strong>: <span data-role="modal-plan"></span></div>
    <div class="field">
      <label for="modal-email" data-i18n="modal.emailLabel">Email address</label>
      <input class="input" type="email" id="modal-email" required autocomplete="email" data-i18n-attr="placeholder:modal.emailPh" placeholder="you@example.com">
    </div>
    <label class="checkbox-row">
      <input type="checkbox" required>
      <span data-i18n="modal.consent">Email me once when subscriptions open.</span>
    </label>
    <div class="cluster">
      <button type="submit" class="btn btn--primary" data-i18n="modal.submit">Tell me at launch</button>
      <button type="button" class="btn btn--ghost" data-action="close-modal" data-i18n="modal.cancel">Not now</button>
    </div>
  </form>
</dialog>

<div class="cookie-bar" id="cookie-bar" role="region" aria-label="Cookie consent">
  <h4 data-i18n="cookie.title">Cookies</h4>
  <p data-i18n="cookie.body">We use strictly necessary cookies to run the site.</p>
  <div class="cluster">
    <button type="button" class="btn btn--primary btn--sm" data-consent="all" data-i18n="cookie.accept">Accept all</button>
    <button type="button" class="btn btn--outline btn--sm" data-consent="essential" data-i18n="cookie.essential">Essential only</button>
    <a class="btn btn--ghost btn--sm" href="${p}legal/cookies.html" data-i18n="cookie.more">Cookie policy</a>
  </div>
</div>

<div class="toast" id="toast" role="status" aria-live="polite">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
  <span data-role="toast-text"></span>
</div>

<script src="${p}assets/js/config.js"></script>
<script src="${p}assets/js/i18n.js"></script>
<script src="${p}assets/js/app.js"></script>`;
}

/** Assemble a complete HTML document. */
function page({ depth = 0, slug, title, description, main, bodyAttrs = '' }) {
  const p = up(depth);
  return `<!doctype html>
<html lang="en" data-page="${slug}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="icon" href="${p}assets/img/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:image" content="${p}assets/img/logo.svg">
<meta name="theme-color" content="#0e7c7b">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&amp;family=Inter:wght@400;500;600;700&amp;family=Noto+Sans+JP:wght@400;500;700&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="${p}assets/css/styles.css">
</head>
<body${bodyAttrs}>

${header(depth)}

<main id="main">
${main}
</main>

${footer(depth)}

${tail(depth)}
</body>
</html>
`;
}

module.exports = { page, header, footer, tail, up };
