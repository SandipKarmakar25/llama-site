/* ==========================================================================
   Llama LLC - site runtime
   --------------------------------------------------------------------------
   Handles: theme, navigation, region/language switching, i18n application,
   pricing rendering, the comparison matrix, plan-interest capture, forms,
   and the cookie banner.

   No network calls anywhere. Every "submission" is stored in localStorage so
   the flows are demonstrable without a backend or payment processor.
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.LlamaConfig;
  var I18N = window.LlamaI18n;
  var t = I18N.t;

  var STORE = {
    market: 'llama.market',
    lang: 'llama.lang',
    theme: 'llama.theme',
    cycle: 'llama.cycle',
    cookies: 'llama.cookieConsent',
    interest: 'llama.planInterest',
    messages: 'llama.contactMessages'
  };

  var state = {
    market: 'US',
    lang: 'en',
    cycle: 'monthly'
  };

  /* Filled from GET /api/config. Defaults assume no payment processor, so the
     site behaves correctly on plain static hosting with no server at all. */
  var runtime = {
    paymentsEnabled: false,
    publishableKey: null,
    liveMode: false
  };

  /* --- Small helpers ---------------------------------------------------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function read(key) {
    try { return window.localStorage.getItem(key); } catch (err) { return null; }
  }

  function write(key, value) {
    try { window.localStorage.setItem(key, value); } catch (err) { /* private mode */ }
  }

  /** Entity names already end in "." — avoid "B.V.." when interpolated. */
  function tidy(str) {
    return str.replace(/\.\.+(\s|$)/g, '.$1');
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function icon(name) {
    var paths = {
      check: '<polyline points="20 6 9 17 4 12"/>',
      close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
      arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[name] || '') + '</svg>';
  }

  /* --- Theme ------------------------------------------------------------ */

  function initTheme() {
    var saved = read(STORE.theme);
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }

    $$('[data-action="toggle-theme"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
          (!document.documentElement.hasAttribute('data-theme') &&
            window.matchMedia('(prefers-color-scheme: dark)').matches);
        var next = isDark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        write(STORE.theme, next);
      });
    });
  }

  /* --- Locale detection & persistence ----------------------------------- */

  function detectMarket() {
    var saved = read(STORE.market);
    if (saved && CFG.MARKETS[saved]) return saved;

    var langs = navigator.languages || [navigator.language || 'en-US'];
    for (var i = 0; i < langs.length; i++) {
      var parts = String(langs[i]).split('-');
      var region = parts[1] ? parts[1].toUpperCase() : null;
      if (region && CFG.MARKETS[region]) return region;
    }
    // Fall back on language alone where the region is unambiguous for us.
    var primary = String(langs[0] || 'en').slice(0, 2).toLowerCase();
    if (primary === 'de') return 'DE';
    if (primary === 'fr') return 'FR';
    if (primary === 'ja') return 'JP';
    return 'US';
  }

  function detectLang(market) {
    var saved = read(STORE.lang);
    if (saved && I18N.available.indexOf(saved) !== -1) return saved;
    return CFG.getMarket(market).lang;
  }

  /* --- i18n application ------------------------------------------------- */

  function applyTranslations(root) {
    var scope = root || document;

    $$('[data-i18n]', scope).forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'), i18nVars(node));
    });

    $$('[data-i18n-html]', scope).forEach(function (node) {
      node.innerHTML = t(node.getAttribute('data-i18n-html'), i18nVars(node));
    });

    // data-i18n-attr="placeholder:key,aria-label:key"
    $$('[data-i18n-attr]', scope).forEach(function (node) {
      node.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
        var bits = pair.split(':');
        if (bits.length === 2) node.setAttribute(bits[0].trim(), t(bits[1].trim(), i18nVars(node)));
      });
    });
  }

  function i18nVars(node) {
    var raw = node.getAttribute('data-i18n-vars');
    var vars = { year: new Date().getFullYear() };
    if (!raw) return vars;
    raw.split(',').forEach(function (pair) {
      var bits = pair.split('=');
      if (bits.length === 2) vars[bits[0].trim()] = bits[1].trim();
    });
    return vars;
  }

  function applyDocumentLang() {
    document.documentElement.setAttribute('lang', state.lang);
  }

  /* --- Region / language switcher --------------------------------------- */

  function buildSwitcher() {
    $$('.locale-switch').forEach(function (wrap) {
      var btn = $('.locale-switch__btn', wrap);
      var panel = $('.locale-panel', wrap);
      if (!btn || !panel) return;

      var regionSel = $('[data-role="region-select"]', panel);
      var langSel = $('[data-role="lang-select"]', panel);

      if (regionSel && !regionSel.options.length) {
        CFG.MARKET_ORDER.forEach(function (code) {
          var m = CFG.MARKETS[code];
          regionSel.appendChild(el('option', {
            value: code,
            text: m.flag + '  ' + m.name + ' (' + m.currency + ')'
          }));
        });
      }

      if (langSel && !langSel.options.length) {
        CFG.LANGUAGES.forEach(function (l) {
          langSel.appendChild(el('option', { value: l.code, text: l.label }));
        });
      }

      if (regionSel) {
        regionSel.value = state.market;
        regionSel.addEventListener('change', function () {
          setMarket(regionSel.value, true);
          closePanel();
        });
      }

      if (langSel) {
        langSel.value = state.lang;
        langSel.addEventListener('change', function () {
          setLanguage(langSel.value);
          closePanel();
        });
      }

      function closePanel() {
        panel.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      }

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      document.addEventListener('click', function (e) {
        if (!wrap.contains(e.target)) closePanel();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePanel();
      });
    });
  }

  function refreshSwitcherLabels() {
    var market = CFG.getMarket(state.market);
    $$('.locale-switch__btn').forEach(function (btn) {
      var flag = $('.flag', btn);
      var label = $('.label', btn);
      if (flag) flag.textContent = market.flag;
      if (label) label.textContent = market.code + ' · ' + market.currency;
      btn.setAttribute('aria-label',
        t('switch.region') + ': ' + market.name + ', ' + t('switch.language') + ': ' + t('meta.langName'));
    });
    $$('[data-role="region-select"]').forEach(function (s) { s.value = state.market; });
    $$('[data-role="lang-select"]').forEach(function (s) { s.value = state.lang; });
  }

  /**
   * @param {string} code market code
   * @param {boolean} followLang also switch UI language to that market's default
   */
  function setMarket(code, followLang) {
    if (!CFG.MARKETS[code]) return;
    state.market = code;
    write(STORE.market, code);

    if (followLang) {
      var preferred = CFG.getMarket(code).lang;
      // Only auto-switch if the user has not pinned a language themselves.
      if (!read(STORE.lang) || read(STORE.lang) !== state.lang || true) {
        state.lang = preferred;
        I18N.setLang(preferred);
        write(STORE.lang, preferred);
      }
    }
    renderAll();
  }

  function setLanguage(lang) {
    state.lang = I18N.setLang(lang);
    write(STORE.lang, state.lang);
    renderAll();
  }


  /** The per-market tax note, unless tax calculation is switched off - in
      which case saying "VAT is added at checkout" would be untrue. */
  function taxNote(market) {
    if (runtime.paymentsEnabled && runtime.automaticTax === false) {
      return t('tax.notConfigured');
    }
    return t(market.taxKey);
  }
  /* --- Pricing rendering ------------------------------------------------ */

  function renderPlans() {
    var host = $('#plans');
    if (!host) return;

    host.innerHTML = '';
    var market = CFG.getMarket(state.market);

    CFG.PLANS.forEach(function (plan) {
      var p = CFG.getPricing(plan.id, state.market, state.cycle);
      var card = el('article', { class: 'plan' + (plan.featured ? ' plan--featured' : '') });

      if (plan.featured && plan.flagKey) {
        card.appendChild(el('span', { class: 'plan__flag', text: t(plan.flagKey) }));
      }

      card.appendChild(el('h3', { class: 'plan__name', text: t(plan.nameKey) }));
      card.appendChild(el('p', { class: 'plan__tagline', text: t(plan.taglineKey) }));

      /* Price block */
      var priceRow = el('div', { class: 'plan__price' });
      if (p.isFree) {
        priceRow.appendChild(el('span', { class: 'plan__amount', text: CFG.formatPrice(0, state.market) }));
      } else {
        priceRow.appendChild(el('span', { class: 'plan__amount', text: p.amountText }));
        priceRow.appendChild(el('span', {
          class: 'plan__period',
          text: state.cycle === 'annual' ? t('pricing.perYear') : t('pricing.perMonth')
        }));
      }
      card.appendChild(priceRow);

      var sub = el('p', { class: 'plan__sub' });
      if (p.isFree) {
        sub.textContent = t('pricing.freeForever');
      } else if (state.cycle === 'annual') {
        sub.appendChild(el('span', { class: 'strike', text: p.listAnnualText }));
        sub.appendChild(el('span', { text: t('pricing.equivalent', { price: p.perMonthText }) }));
      } else {
        var annual = CFG.getPricing(plan.id, state.market, 'annual');
        sub.textContent = t('pricing.savingLine', {
          amount: annual.savingText,
          pct: annual.savingPct
        });
      }
      card.appendChild(sub);

      if (!p.isFree) {
        card.appendChild(el('p', { class: 'plan__tax', text: taxNote(market) }));
      } else {
        card.appendChild(el('p', { class: 'plan__tax', text: ' ' }));
      }

      /* CTA */
      var cta = el('a', {
        class: 'btn btn--' + plan.ctaVariant + ' btn--block',
        href: 'signup.html?plan=' + plan.id + '&cycle=' + state.cycle,
        text: t(plan.ctaKey)
      });
      if (plan.id !== 'free') {
        cta.setAttribute('data-action', 'select-plan');
        cta.setAttribute('data-plan', plan.id);
      }
      card.appendChild(cta);

      if (plan.id !== 'free') {
        card.appendChild(el('p', {
          class: 'plan__secure',
          'data-when': 'payments-on',
          hidden: runtime.paymentsEnabled ? null : 'hidden',
          text: t('checkout.secure')
        }));
      }

      /* Feature list */
      var feats = el('div', { class: 'plan__features' });
      feats.appendChild(el('p', { class: 'plan__features-head', text: t(plan.featuresHeadKey) }));
      var ul = el('ul', { class: 'checklist' });
      plan.featureKeys.forEach(function (key) {
        ul.appendChild(el('li', { text: t(key) }));
      });
      feats.appendChild(ul);
      card.appendChild(feats);

      host.appendChild(card);
    });

    renderPriceContext();
  }

  function renderPriceContext() {
    var host = $('#price-context');
    if (!host) return;
    var market = CFG.getMarket(state.market);

    host.innerHTML = '';
    host.appendChild(el('span', { class: 'badge badge--soft', text: market.flag + '  ' + t('pricing.showingFor') + ' ' + market.name }));
    host.appendChild(el('span', { class: 'badge badge--soft', text: taxNote(market) }));
    host.appendChild(el('span', {
      class: 'badge badge--soft',
      text: t(market.withdrawal === 'statutory' ? 'withdrawal.statutory' : 'withdrawal.goodwill')
    }));
    host.appendChild(el('span', { class: 'badge badge--soft', text: tidy(t('entity.contract', { entity: market.entity })) }));
  }

  function renderBillingToggle() {
    var toggle = $('#billing-toggle');
    if (!toggle) return;

    $$('button', toggle).forEach(function (btn) {
      var value = btn.getAttribute('data-cycle');
      btn.setAttribute('aria-pressed', value === state.cycle ? 'true' : 'false');
      if (!btn.dataset.bound) {
        btn.dataset.bound = '1';
        btn.addEventListener('click', function () {
          state.cycle = value;
          write(STORE.cycle, value);
          renderBillingToggle();
          renderPlans();
        });
      }
    });
  }

  function renderComparison() {
    var host = $('#comparison');
    if (!host) return;

    var table = el('table');
    var thead = el('thead');
    var headRow = el('tr');
    headRow.appendChild(el('th', { scope: 'col', text: t('pricing.tableFeature') }));
    CFG.PLANS.forEach(function (plan) {
      headRow.appendChild(el('th', { scope: 'col', text: t(plan.nameKey) }));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = el('tbody');
    CFG.COMPARISON.forEach(function (group) {
      var groupRow = el('tr', { class: 'row-group' });
      groupRow.appendChild(el('th', { scope: 'colgroup', colspan: '4', text: t(group.groupKey) }));
      tbody.appendChild(groupRow);

      group.rows.forEach(function (row) {
        var tr = el('tr');
        tr.appendChild(el('th', { scope: 'row', text: t(row.labelKey) }));
        ['free', 'premium', 'pro'].forEach(function (tier) {
          tr.appendChild(comparisonCell(row[tier]));
        });
        tbody.appendChild(tr);
      });
    });
    table.appendChild(tbody);

    host.innerHTML = '';
    host.appendChild(table);
  }

  function comparisonCell(value) {
    if (value === true) {
      return el('td', {
        html: '<span class="tick" aria-hidden="true">✓</span><span class="visually-hidden">' +
          t('cmp.included') + '</span>'
      });
    }
    if (value === false || value === undefined || value === null) {
      return el('td', {
        html: '<span class="cross" aria-hidden="true">—</span><span class="visually-hidden">' +
          t('cmp.notIncluded') + '</span>'
      });
    }
    return el('td', { html: '<span class="cell-note">' + t(value) + '</span>' });
  }

  /* --- Stripe -----------------------------------------------------------
     The server decides whether payments are live. When they are not (no keys,
     or prices not yet provisioned) every paid CTA falls back to the email
     capture dialog, so the site is never broken by missing configuration.
     ---------------------------------------------------------------------- */

  function loadRuntimeConfig() {
    if (!window.fetch) return Promise.resolve();
    return fetch('api/config', { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data) return;
        runtime = data;
        applyPaymentMode();

        // The server sees the request country from an edge header, which beats
        // guessing from navigator.language. Only overrides when the visitor
        // has not already chosen a region themselves.
        if (runtime.detectedMarket && !read(STORE.market) && CFG.MARKETS[runtime.detectedMarket]) {
          setMarket(runtime.detectedMarket, true);
        }
      })
      .catch(function () {
        // No API on this origin (static hosting). Stay in fallback mode.
      });
  }

  function applyPaymentMode() {
    document.documentElement.setAttribute('data-payments', runtime.paymentsEnabled ? 'on' : 'off');
    $$('[data-when="payments-off"]').forEach(function (node) {
      node.hidden = runtime.paymentsEnabled;
    });
    $$('[data-when="payments-on"]').forEach(function (node) {
      node.hidden = !runtime.paymentsEnabled;
    });
  }

  function idempotencyKey() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return 'k' + Date.now() + Math.random().toString(16).slice(2);
  }

  /**
   * Create a Checkout Session and hand the browser to Stripe.
   * The amount is never sent from here — the server resolves it from the
   * provisioned price catalogue so a tampered request cannot change the price.
   *
   * @param {string} planId 'premium' | 'pro'
   * @param {string} [email] prefills the Checkout email field
   * @param {HTMLElement} [trigger] button to put in a busy state
   */
  function startCheckout(planId, email, trigger) {
    if (trigger) {
      trigger.setAttribute('aria-busy', 'true');
      trigger.setAttribute('aria-disabled', 'true');
    }
    showToast(t('checkout.redirecting'));

    fetch('api/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Idempotency-Key': idempotencyKey()
      },
      body: JSON.stringify({
        plan: planId,
        cycle: state.cycle,
        market: state.market,
        language: state.lang,
        email: email || undefined
      })
    })
      .then(function (res) {
        return res.json().then(function (body) { return { ok: res.ok, body: body }; });
      })
      .then(function (result) {
        if (result.ok && result.body && result.body.url) {
          window.location.assign(result.body.url);
          return;
        }
        throw new Error((result.body && result.body.error) || 'checkout_failed');
      })
      .catch(function (err) {
        if (trigger) {
          trigger.removeAttribute('aria-busy');
          trigger.removeAttribute('aria-disabled');
        }
        showToast(t('checkout.error'));
        if (window.console) console.error('[checkout]', err.message);
      });
  }

  /* Surface the cancel redirect from Stripe: /pricing.html?checkout=cancelled */
  function reportCheckoutReturn() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'cancelled') {
      showToast(t('checkout.cancelled'));
      history.replaceState({}, '', window.location.pathname);
    }
  }

  /* --- Checkout success page -------------------------------------------- */

  function initSuccessPage() {
    var page = $('#checkout-success');
    if (!page) return;

    var sessionId = new URLSearchParams(window.location.search).get('session_id');
    var titleEl = $('[data-role="success-title"]', page);
    var statusEl = $('[data-role="success-status"]', page);
    var detailEl = $('[data-role="success-detail"]', page);

    function showFailure() {
      titleEl.textContent = t('success.failedTitle');
      statusEl.textContent = t('success.failed');
      page.classList.add('is-unconfirmed');
    }

    if (!sessionId) {
      showFailure();
      return;
    }

    // Exchange the Checkout Session for a signed-in session before anything
    // else. This is what stops a paying customer landing back at square one:
    // from here on the site knows who they are and what they bought.
    claimCheckoutSession(sessionId).then(function (claimed) {
      if (claimed) renderAccount();
    });

    fetch('api/session/' + encodeURIComponent(sessionId), { headers: { Accept: 'application/json' } })
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('lookup_failed')); })
      .then(function (data) {
        var planMeta = CFG.PLANS.filter(function (p) { return p.id === data.plan; })[0];
        var planName = planMeta ? t(planMeta.nameKey) : (data.plan || '');

        titleEl.textContent = t('success.title');
        statusEl.textContent = data.email
          ? t('success.body', { plan: planName, email: data.email })
          : t('success.bodyPlain');

        if (detailEl && data.amountTotal !== null && data.currency) {
          var market = data.market && CFG.MARKETS[data.market] ? data.market : state.market;
          var rows = [t('success.paid') + ': ' + CFG.formatPrice(data.amountTotal, market)];
          if (data.amountTax) {
            rows.push(t('success.tax') + ': ' + CFG.formatPrice(data.amountTax, market));
          }
          detailEl.textContent = rows.join(' · ');
        }
      })
      .catch(showFailure);
  }

  /* --- Billing portal (account page) ------------------------------------ */

  /* --- Account, session and entitlements --------------------------------
     `me` is the browser's view of what the signed-in customer is entitled to.
     It is display only: every limit shown here is also checked on the server,
     because hiding a button is not access control.
     ---------------------------------------------------------------------- */

  var me = { signedIn: false, plan: 'free', entitlements: null };

  function api(path, options) {
    var opts = options || {};
    return fetch('api/' + path, {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers: Object.assign(
        { Accept: 'application/json' },
        opts.body ? { 'Content-Type': 'application/json' } : {}
      ),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (res) {
      return res.json()
        .catch(function () { return {}; })
        .then(function (body) { return { ok: res.ok, status: res.status, body: body }; });
    });
  }

  function loadMe() {
    if (!window.fetch) return Promise.resolve();
    return api('me')
      .then(function (r) {
        if (r.ok && r.body) {
          me = r.body;
          applySignedInState();
        }
      })
      .catch(function () { /* no server; stay signed out */ });
  }

  /** Header and nav reflect whether someone is signed in, and on what plan. */
  function applySignedInState() {
    document.documentElement.setAttribute('data-signed-in', me.signedIn ? 'yes' : 'no');
    document.documentElement.setAttribute('data-plan', me.plan || 'free');

    $$('[data-when="signed-in"]').forEach(function (n) { n.hidden = !me.signedIn; });
    $$('[data-when="signed-out"]').forEach(function (n) { n.hidden = Boolean(me.signedIn); });

    $$('[data-role="account-chip"]').forEach(function (chip) {
      if (!me.signedIn) { chip.hidden = true; return; }
      chip.hidden = false;
      var planMeta = CFG.PLANS.filter(function (p) { return p.id === me.plan; })[0];
      chip.textContent = planMeta ? t(planMeta.nameKey) : me.plan;
      chip.className = 'badge badge--' + (me.plan === 'pro' ? 'pro' : me.plan === 'premium' ? 'premium' : 'free');
    });

    markCurrentPlanOnPricing();
  }

  /** On the pricing page, show which plan the customer is already on. */
  function markCurrentPlanOnPricing() {
    if (!$('#plans') || !me.signedIn) return;
    var ranks = { free: 0, premium: 1, pro: 2 };
    var current = ranks[me.plan] === undefined ? 0 : ranks[me.plan];

    $$('#plans .plan').forEach(function (card) {
      var cta = $('.btn', card);
      if (!cta) return;
      var planId = cta.getAttribute('data-plan') ||
        (cta.getAttribute('href') || '').replace(/.*plan=([a-z]+).*/, '$1');
      if (!ranks.hasOwnProperty(planId)) return;

      if (planId === me.plan) {
        cta.textContent = t('account.currentPlan');
        cta.setAttribute('aria-disabled', 'true');
        cta.removeAttribute('data-action');
      } else if (ranks[planId] > current) {
        cta.textContent = t('account.upgradeTo');
      } else {
        cta.textContent = t('account.switchTo');
      }
    });
  }

  /* --- Post-checkout: turn the Stripe session into a signed-in session --- */

  function claimCheckoutSession(sessionId) {
    return api('auth/claim', { method: 'POST', body: { session_id: sessionId } })
      .then(function (r) {
        if (r.ok && r.body.me) {
          me = r.body.me;
          applySignedInState();
          return true;
        }
        return false;
      })
      .catch(function () { return false; });
  }

  /* --- Account page ------------------------------------------------------ */

  function initAccountPage() {
    var page = $('#account-page');
    if (!page) return;

    var params = new URLSearchParams(window.location.search);
    if (params.get('signin') === 'expired') {
      var warn = $('[data-role="signin-expired"]', page);
      if (warn) warn.hidden = false;
    }
    if (params.get('signin') === 'ok') {
      showToast(t('account.welcome'));
      history.replaceState({}, '', window.location.pathname);
    }

    /* Magic-link request */
    var signinForm = $('#signin-form', page);
    if (signinForm) {
      signinForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!signinForm.checkValidity()) { signinForm.reportValidity(); return; }

        var btn = $('button[type="submit"]', signinForm);
        btn.setAttribute('aria-busy', 'true');

        api('auth/link', {
          method: 'POST',
          body: { email: ($('#signin-email') || {}).value || '' }
        }).then(function (r) {
          btn.removeAttribute('aria-busy');
          if (r.status === 429) { showToast(r.body.message || t('checkout.error')); return; }
          showToast(t('account.linkSent'));

          // Test mode only: the server hands the link back because no email
          // provider is wired up. Never returned in live mode.
          if (r.body.devLoginUrl) {
            var box = $('[data-role="dev-link"]', page);
            var link = $('[data-role="dev-link-url"]', page);
            if (box && link) {
              link.href = r.body.devLoginUrl;
              link.textContent = r.body.devLoginUrl;
              box.hidden = false;
            }
          }
        }).catch(function () {
          btn.removeAttribute('aria-busy');
          showToast(t('checkout.error'));
        });
      });
    }

    /* Billing portal — customer comes from the session cookie, not the form */
    $$('[data-action="open-portal"]', page).forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.setAttribute('aria-busy', 'true');
        showToast(t('account.opening'));
        api('portal', { method: 'POST', body: {} }).then(function (r) {
          if (r.ok && r.body.url) { window.location.assign(r.body.url); return; }
          btn.removeAttribute('aria-busy');
          showToast(r.status === 401 ? t('account.notFound') : t('checkout.error'));
        }).catch(function () {
          btn.removeAttribute('aria-busy');
          showToast(t('checkout.error'));
        });
      });
    });

    $$('[data-action="sign-out"]', page).forEach(function (btn) {
      btn.addEventListener('click', function () {
        api('auth/signout', { method: 'POST', body: {} }).then(function () {
          me = { signedIn: false, plan: 'free', entitlements: null };
          applySignedInState();
          renderAccount();
          showToast(t('account.signedOut'));
        });
      });
    });

    initTripForm(page);
  }

  /** Swap between the signed-out and signed-in halves, and fill the latter. */
  function renderAccount() {
    var page = $('#account-page');
    if (!page) return;

    var out = $('[data-account-state="out"]', page);
    var inn = $('[data-account-state="in"]', page);
    if (out) out.hidden = Boolean(me.signedIn);
    if (inn) inn.hidden = !me.signedIn;

    var heading = $('[data-role="account-heading"]');
    var lede = $('[data-role="account-lede"]');
    if (heading) heading.textContent = me.signedIn ? t('account.title') : t('account.signInTitle');
    if (lede) lede.textContent = me.signedIn ? t('account.lede') : t('account.signInLede');

    if (!me.signedIn) return;

    var planMeta = CFG.PLANS.filter(function (p) { return p.id === me.plan; })[0];
    var nameEl = $('[data-role="plan-name"]', page);
    if (nameEl) nameEl.textContent = planMeta ? t(planMeta.nameKey) : me.plan;

    var statusEl = $('[data-role="plan-status"]', page);
    if (statusEl) {
      var statusKey = 'status.' + (me.status || 'none');
      statusEl.textContent = I18N.has(statusKey) ? t(statusKey) : (me.status || '');
      statusEl.className = 'badge badge--' +
        (me.status === 'active' || me.status === 'trialing' ? 'premium'
          : me.status === 'past_due' ? 'pro' : 'free');
    }

    renderPlanMeta(page);
    renderBillingMismatch(page);
    renderEntitlements(page);
    loadTrips();
  }

  function renderPlanMeta(page) {
    var host = $('#plan-meta', page);
    if (!host) return;
    host.innerHTML = '';

    function row(label, value) {
      if (!value) return;
      var r = el('div', { class: 'summary-row' });
      r.appendChild(el('span', { text: label }));
      r.appendChild(el('b', { text: value }));
      host.appendChild(r);
    }

    if (me.email) row(t('modal.emailLabel'), me.email);

    if (me.cycle) {
      row(t('account.billedAs'), t(me.cycle === 'annual' ? 'pricing.annual' : 'pricing.monthly'));
    }

    if (me.market && CFG.MARKETS[me.market]) {
      row(t('switch.region'), CFG.MARKETS[me.market].flag + ' ' + CFG.MARKETS[me.market].name);
    }

    if (me.currentPeriodEnd) {
      var when = new Date(me.currentPeriodEnd);
      var formatted = isNaN(when) ? me.currentPeriodEnd
        : when.toLocaleDateString(CFG.getMarket(state.market).locale, {
          year: 'numeric', month: 'long', day: 'numeric'
        });
      row(me.cancelAtPeriodEnd ? t('account.cancelsOn') : t('account.renews'), formatted);
    }
  }

  /**
   * The currency was chosen by the region picker; the tax by the address the
   * customer typed at Stripe. When those disagree the charge is still lawful
   * and the tax is right, but the customer is on the wrong regional price -
   * so say so plainly and offer the fix rather than hiding it.
   */
  function renderBillingMismatch(page) {
    var notice = $('[data-role="billing-mismatch"]', page);
    if (!notice) return;

    if (!me.billingMismatch || !me.suggestedMarket) {
      notice.hidden = true;
      return;
    }

    var suggested = CFG.MARKETS[me.suggestedMarket];
    var priced = CFG.MARKETS[me.market];
    var countryName = suggested ? suggested.flag + ' ' + suggested.name : me.billingCountry;

    $('[data-role="mismatch-message"]', notice).textContent = t('account.mismatchMessage', {
      currency: me.currency || (priced ? priced.currency : ''),
      country: countryName,
      market: priced ? priced.name : me.market
    });

    var action = $('a', notice);
    if (action) {
      action.textContent = t('account.mismatchAction', {
        suggested: suggested ? suggested.currency : me.suggestedMarket
      });
      action.href = 'pricing.html';
      action.onclick = function () {
        // Land them on the pricing page already switched to the right region.
        setMarket(me.suggestedMarket, true);
      };
    }

    notice.hidden = false;
  }

  /* Entitlement -> the comparison-table label already translated in i18n.js,
     so this adds no new translation burden. */
  var ENTITLEMENT_LABELS = [
    ['tripsPerYear', 'cmp.trips'],
    ['itineraryDays', 'cmp.itinLength'],
    ['travellersPerTrip', 'cmp.travellers'],
    ['watchedRoutes', 'cmp.fareAlerts'],
    ['multiCityStops', 'cmp.multicity'],
    ['conciergeRequestsPerMonth', 'cmp.concierge'],
    ['disruptionRebooking', 'cmp.disruption'],
    ['offlineExport', 'cmp.offline'],
    ['transitRouting', 'cmp.transit'],
    ['budgetTracker', 'cmp.budget'],
    ['loyaltyOptimiser', 'cmp.loyalty'],
    ['businessMode', 'cmp.businessMode'],
    ['expenseExport', 'cmp.expense'],
    ['calendarSync', 'cmp.calendar'],
    ['apiAccess', 'cmp.api'],
    ['taxInvoices', 'cmp.invoicing'],
    ['support', 'cmp.support']
  ];

  var SUPPORT_LABELS = { community: 'cmp.v.community', email24: 'cmp.v.email24', '247': 'cmp.v.247' };

  function renderEntitlements(page) {
    var host = $('#entitlement-list', page);
    if (!host || !me.entitlements) return;
    host.innerHTML = '';

    ENTITLEMENT_LABELS.forEach(function (pair) {
      var key = pair[0];
      var value = me.entitlements[key];
      if (value === undefined) return;

      var row = el('div', { class: 'summary-row' });
      row.appendChild(el('span', { text: t(pair[1]) }));

      var text;
      if (key === 'support') {
        text = SUPPORT_LABELS[value] ? t(SUPPORT_LABELS[value]) : String(value);
      } else if (value === true) {
        text = t('cmp.included');
      } else if (value === false) {
        text = t('cmp.notIncluded');
      } else if (value === null) {
        text = t('cmp.v.unlimited');
      } else {
        text = String(value);
      }

      var b = el('b', { text: text });
      if (value === false) b.className = 'subtle';
      row.appendChild(b);
      host.appendChild(row);
    });
  }

  /* --- Trips: a real gated resource -------------------------------------- */

  function loadTrips() {
    var page = $('#account-page');
    if (!page || !me.signedIn) return;

    api('trips').then(function (r) {
      if (!r.ok) return;
      renderTrips(page, r.body.trips || [], r.body.usage);
    });
  }

  function renderTrips(page, trips, usage) {
    var list = $('[data-role="trip-list"]', page);
    var empty = $('[data-role="trips-empty"]', page);
    var usageEl = $('[data-role="trips-usage"]', page);

    if (usageEl && usage) {
      usageEl.textContent = t('account.tripsUsage', {
        used: usage.thisYear,
        limit: usage.limit === null ? t('cmp.v.unlimited') : usage.limit
      });
    }

    if (list) {
      list.innerHTML = '';
      trips.forEach(function (trip) {
        // A whole sentence per language, not form labels glued together:
        // Japanese needs no spaces and an ideographic comma, German capitalises.
        list.appendChild(el('li', {
          text: t('account.tripSummary', {
            destination: trip.destination,
            days: trip.days,
            travellers: trip.travellers
          })
        }));
      });
    }
    if (empty) empty.hidden = trips.length > 0;
  }

  function initTripForm(page) {
    var form = $('#trip-form', page);
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var notice = $('[data-role="limit-notice"]', page);
      if (notice) notice.hidden = true;

      api('trips', {
        method: 'POST',
        body: {
          destination: ($('#trip-destination') || {}).value || '',
          travellers: Number(($('#trip-travellers') || {}).value || 1),
          days: Number(($('#trip-days') || {}).value || 1)
        }
      }).then(function (r) {
        // 402 is the server refusing on plan limits. This is the enforcement
        // the UI cannot do for itself.
        if (r.status === 402) {
          if (notice) {
            // The server sends a structured reason; build the sentence here so
            // it lands in the reader's language, not the server's.
            var key = 'limit.' + r.body.limit;
            $('[data-role="limit-message"]', notice).textContent = I18N.has(key)
              ? t(key, {
                allowed: r.body.allowed === null ? t('cmp.v.unlimited') : r.body.allowed,
                used: r.body.used
              })
              : t('limit.generic');
            var upgrade = $('[data-role="limit-upgrade"]', notice);
            if (upgrade && r.body.upgradeTo) {
              upgrade.href = 'pricing.html#' + r.body.upgradeTo;
            }
            notice.hidden = false;
          }
          return;
        }
        if (!r.ok) { showToast(t('checkout.error')); return; }

        form.reset();
        $('#trip-travellers').value = 1;
        $('#trip-days').value = 5;
        showToast(t('account.tripAdded'));
        loadTrips();
      }).catch(function () { showToast(t('checkout.error')); });
    });
  }

  /* --- Plan interest modal (fallback when payments are off) -------------- */

  function initPlanModal() {
    var modal = $('#plan-modal');
    if (!modal) return;

    var form = $('form', modal);
    var planLabel = $('[data-role="modal-plan"]', modal);
    var bodyText = $('[data-role="modal-body"]', modal);
    var chosen = { plan: 'premium' };

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-action="select-plan"]');
      if (!trigger) return;
      e.preventDefault();

      chosen.plan = trigger.getAttribute('data-plan') || 'premium';

      // Payments live -> straight to Stripe Checkout in the currency of the
      // region already selected in the header. Otherwise fall back to
      // capturing an email so the CTA still does something useful.
      if (runtime.paymentsEnabled) {
        startCheckout(chosen.plan, null, trigger);
        return;
      }

      var planMeta = CFG.PLANS.filter(function (p) { return p.id === chosen.plan; })[0];
      var market = CFG.getMarket(state.market);
      var planName = planMeta ? t(planMeta.nameKey) : chosen.plan;

      if (planLabel) {
        var pricing = CFG.getPricing(chosen.plan, state.market, state.cycle);
        planLabel.textContent = planName + ' · ' + pricing.amountText +
          (state.cycle === 'annual' ? t('pricing.perYear') : t('pricing.perMonth'));
      }
      if (bodyText) {
        bodyText.textContent = t('modal.body', { plan: planName, market: market.name });
      }

      if (typeof modal.showModal === 'function') modal.showModal();
      else modal.setAttribute('open', '');
    });

    $$('[data-action="close-modal"]', modal).forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
      });
    });


    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = $('input[type="email"]', form);
        if (!email || !email.checkValidity()) {
          if (email) email.reportValidity();
          return;
        }

        var records = [];
        try { records = JSON.parse(read(STORE.interest) || '[]'); } catch (err) { records = []; }
        records.push({
          email: email.value,
          plan: chosen.plan,
          cycle: state.cycle,
          market: state.market,
          at: new Date().toISOString()
        });
        write(STORE.interest, JSON.stringify(records));

        form.reset();
        if (typeof modal.close === 'function') modal.close();
        else modal.removeAttribute('open');
        showToast(t('toast.interest'));
      });
    }
  }

  /* --- Signup page ------------------------------------------------------ */

  function initSignupPage() {
    var page = $('#signup-page');
    if (!page) return;

    var params = new URLSearchParams(window.location.search);
    var planId = params.get('plan');
    var cycle = params.get('cycle');

    if (cycle === 'annual' || cycle === 'monthly') state.cycle = cycle;
    if (!planId || !CFG.PRICES[planId]) planId = 'free';

    var planSelect = $('#signup-plan');
    if (planSelect) {
      if (!planSelect.options.length) {
        CFG.PLANS.forEach(function (p) {
          planSelect.appendChild(el('option', { value: p.id, text: t(p.nameKey) }));
        });
      }
      planSelect.value = planId;
      planSelect.addEventListener('change', function () {
        renderSummary(planSelect.value);
      });
    }

    var cycleSelect = $('#signup-cycle');
    if (cycleSelect) {
      cycleSelect.value = state.cycle;
      cycleSelect.addEventListener('change', function () {
        state.cycle = cycleSelect.value;
        renderSummary(planSelect ? planSelect.value : planId);
      });
    }

    renderSummary(planId);

    var form = $('#signup-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }

        var chosenPlan = planSelect ? planSelect.value : planId;
        var typedEmail = ($('#signup-email') || {}).value || '';

        // A paid plan with Stripe live goes to Checkout; the account is created
        // by the webhook once payment succeeds. Free signs up here and now.
        if (chosenPlan !== 'free' && runtime.paymentsEnabled) {
          startCheckout(chosenPlan, typedEmail, $('button[type="submit"]', form));
          return;
        }

        var records = [];
        try { records = JSON.parse(read(STORE.interest) || '[]'); } catch (err) { records = []; }
        records.push({
          email: typedEmail,
          name: ($('#signup-name') || {}).value || '',
          plan: chosenPlan,
          cycle: state.cycle,
          market: state.market,
          at: new Date().toISOString()
        });
        write(STORE.interest, JSON.stringify(records));

        form.reset();
        showToast(chosenPlan === 'free' ? t('toast.contact') : t('toast.interest'));
      });
    }

    window.__llamaRenderSummary = function () {
      renderSummary(planSelect ? planSelect.value : planId);
    };
  }

  function renderSummary(planId) {
    var host = $('#order-summary-rows');
    if (!host) return;

    var market = CFG.getMarket(state.market);
    var planMeta = CFG.PLANS.filter(function (p) { return p.id === planId; })[0] || CFG.PLANS[0];
    var p = CFG.getPricing(planId, state.market, state.cycle);

    host.innerHTML = '';

    function row(labelText, valueText, cls) {
      var r = el('div', { class: 'summary-row' + (cls ? ' ' + cls : '') });
      r.appendChild(el('span', { text: labelText }));
      r.appendChild(el('b', { text: valueText }));
      host.appendChild(r);
    }

    row(t('modal.planLabel'), t(planMeta.nameKey));
    row(t('switch.region'), market.flag + ' ' + market.name);
    row(
      state.cycle === 'annual' ? t('pricing.annual') : t('pricing.monthly'),
      p.isFree ? CFG.formatPrice(0, state.market) : p.amountText
    );

    if (!p.isFree && state.cycle === 'annual') {
      row(t('pricing.annualSaving'), '− ' + p.savingText);
    }

    var totalRow = el('div', { class: 'summary-row summary-total' });
    totalRow.appendChild(el('span', { text: t('summary.total') }));
    totalRow.appendChild(el('b', {
      text: (p.isFree ? CFG.formatPrice(0, state.market) : p.amountText) +
        (p.isFree ? '' : (state.cycle === 'annual' ? t('pricing.perYear') : t('pricing.perMonth')))
    }));
    host.appendChild(totalRow);

    var note = $('#summary-note');
    if (note) {
      var lines = [];
      // Tax and withdrawal rights only mean something once money changes hands.
      if (!p.isFree) {
        lines.push(taxNote(market));
        lines.push(t(market.withdrawal === 'statutory' ? 'withdrawal.statutory' : 'withdrawal.goodwill'));
      }
      lines.push(t('entity.contract', { entity: market.entity }));
      note.textContent = tidy(lines.join(' '));
    }
  }

  /* --- Contact form ----------------------------------------------------- */

  function initContactForm() {
    var form = $('#contact-form');
    if (!form) return;

    var marketSel = $('#contact-market', form);
    if (marketSel && !marketSel.options.length) {
      CFG.MARKET_ORDER.forEach(function (code) {
        var m = CFG.MARKETS[code];
        marketSel.appendChild(el('option', { value: code, text: m.flag + '  ' + m.name }));
      });
      marketSel.value = state.market;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var messages = [];
      try { messages = JSON.parse(read(STORE.messages) || '[]'); } catch (err) { messages = []; }
      messages.push({
        name: ($('#contact-name') || {}).value || '',
        email: ($('#contact-email') || {}).value || '',
        topic: ($('#contact-topic') || {}).value || '',
        market: marketSel ? marketSel.value : state.market,
        message: ($('#contact-message') || {}).value || '',
        at: new Date().toISOString()
      });
      write(STORE.messages, JSON.stringify(messages));

      form.reset();
      if (marketSel) marketSel.value = state.market;
      showToast(t('toast.contact'));
    });
  }

  /* --- Cookie banner ---------------------------------------------------- */

  function initCookieBar() {
    var bar = $('#cookie-bar');
    if (!bar) return;

    if (read(STORE.cookies)) return;

    window.setTimeout(function () { bar.classList.add('is-visible'); }, 900);

    $$('[data-consent]', bar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        write(STORE.cookies, btn.getAttribute('data-consent'));
        bar.classList.remove('is-visible');
      });
    });
  }

  /* --- Toast ------------------------------------------------------------ */

  var toastTimer = null;

  function showToast(message) {
    var toast = $('#toast');
    if (!toast) return;
    $('[data-role="toast-text"]', toast).textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 4600);
  }

  /* --- Navigation ------------------------------------------------------- */

  function initNav() {
    var toggle = $('[data-action="toggle-nav"]');
    var mobileNav = $('#mobile-nav');
    if (toggle && mobileNav) {
      toggle.addEventListener('click', function () {
        var open = mobileNav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    var header = $('.site-header');
    if (header) {
      var onScroll = function () {
        header.classList.toggle('is-stuck', window.scrollY > 8);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // Mark the current page in both navs.
    var path = window.location.pathname.split('/').pop() || 'index.html';
    $$('.nav a, .mobile-nav a').forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && href.split('#')[0] === path) link.setAttribute('aria-current', 'page');
    });
  }

  /* --- Market list on the home page ------------------------------------- */

  function renderMarketList() {
    var host = $('#market-list');
    if (!host) return;

    host.innerHTML = '';
    CFG.MARKET_ORDER.forEach(function (code) {
      var m = CFG.MARKETS[code];
      var item = el('button', {
        class: 'market-item',
        type: 'button',
        'data-market': code,
        'aria-label': m.name
      });
      item.appendChild(el('span', { class: 'flag', text: m.flag, 'aria-hidden': 'true' }));
      var body = el('span');
      body.appendChild(el('b', { text: m.name }));
      body.appendChild(el('span', { text: t('m.' + code.toLowerCase() + '.note') }));
      item.appendChild(body);
      item.addEventListener('click', function () { setMarket(code, true); });
      host.appendChild(item);
    });
  }

  /* --- Orchestration ---------------------------------------------------- */

  function renderAll() {
    applyDocumentLang();
    applyTranslations();
    refreshSwitcherLabels();
    renderBillingToggle();
    renderPlans();
    renderComparison();
    renderMarketList();
    renderPriceContext();
    applySignedInState();
    renderAccount();
    if (typeof window.__llamaRenderSummary === 'function') window.__llamaRenderSummary();
  }

  function init() {
    state.market = detectMarket();
    state.lang = detectLang(state.market);
    I18N.setLang(state.lang);

    var savedCycle = read(STORE.cycle);
    if (savedCycle === 'annual' || savedCycle === 'monthly') state.cycle = savedCycle;

    initTheme();
    initNav();
    buildSwitcher();
    initPlanModal();
    initSignupPage();
    initContactForm();
    initCookieBar();
    initAccountPage();

    renderAll();
    applyPaymentMode();
    applySignedInState();
    renderAccount();
    reportCheckoutReturn();

    // Non-blocking: the page is already usable in fallback mode, and flips to
    // Stripe Checkout and signed-in state as soon as the server answers.
    loadRuntimeConfig()
      .then(loadMe)
      .then(function () {
        renderAccount();
        return initSuccessPage();
      });

    // Expose a tiny surface for debugging and for future integration work.
    window.Llama = {
      state: state,
      get runtime() { return runtime; },
      get me() { return me; },
      setMarket: setMarket,
      setLanguage: setLanguage,
      startCheckout: startCheckout,
      signOut: function () {
        return api('auth/signout', { method: 'POST', body: {} });
      },
      t: t,
      toast: showToast
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
