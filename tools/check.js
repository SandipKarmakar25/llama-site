/* Smoke checks: internal links resolve, i18n keys exist, locales are complete. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = require('path').resolve(__dirname, '..');
let problems = 0;
const fail = (m) => { console.log('  FAIL ' + m); problems++; };

/* --- collect html files --- */
const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'tools' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(ROOT);

console.log('HTML files: ' + htmlFiles.length);

/* --- 1. internal link + asset resolution --- */
console.log('\n[1] internal links & assets');
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
    const target = path.resolve(dir, ref.split('#')[0]);
    if (!fs.existsSync(target)) fail(path.relative(ROOT, file) + ' -> missing ' + ref);
  }
}

/* --- 2. in-page anchors exist --- */
console.log('[2] in-page anchors');
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const dir = path.dirname(file);
  for (const m of html.matchAll(/href="([^"]*)#([^"]+)"/g)) {
    const [, page, anchor] = m;
    if (page === '') { // same page
      if (!ids.has(anchor)) fail(path.relative(ROOT, file) + ' -> #' + anchor + ' not found');
    } else if (!/^https?:/.test(page)) {
      const target = path.resolve(dir, page);
      if (fs.existsSync(target)) {
        const other = fs.readFileSync(target, 'utf8');
        if (!new RegExp('\\sid="' + anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"').test(other)) {
          fail(path.relative(ROOT, file) + ' -> ' + page + '#' + anchor + ' anchor missing');
        }
      }
    }
  }
}

/* --- 3. i18n keys used in HTML exist in English --- */
console.log('[3] i18n keys');
const i18nSrc = fs.readFileSync(path.join(ROOT, 'assets/js/i18n.js'), 'utf8');
const sandbox = { window: {} };
new Function('window', i18nSrc)(sandbox.window);
const STRINGS = sandbox.window.LlamaI18n.STRINGS;
const en = STRINGS.en;

const usedKeys = new Set();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)) usedKeys.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    m[1].split(',').forEach((pair) => {
      const bits = pair.split(':');
      if (bits.length === 2) usedKeys.add(bits[1].trim());
    });
  }
}
for (const k of usedKeys) if (!(k in en)) fail('HTML uses unknown i18n key: ' + k);
console.log('  keys referenced in HTML: ' + usedKeys.size);

/* --- 4. keys referenced from config/app exist --- */
console.log('[4] keys referenced from JS');
const cfgSrc = fs.readFileSync(path.join(ROOT, 'assets/js/config.js'), 'utf8');
new Function('window', cfgSrc)(sandbox.window);
const CFG = sandbox.window.LlamaConfig;

const jsKeys = new Set();
CFG.PLANS.forEach((p) => {
  [p.nameKey, p.taglineKey, p.ctaKey, p.featuresHeadKey, p.flagKey].forEach((k) => k && jsKeys.add(k));
  p.featureKeys.forEach((k) => jsKeys.add(k));
});
CFG.COMPARISON.forEach((g) => {
  jsKeys.add(g.groupKey);
  g.rows.forEach((r) => {
    jsKeys.add(r.labelKey);
    ['free', 'premium', 'pro'].forEach((t) => { if (typeof r[t] === 'string') jsKeys.add(r[t]); });
  });
});
Object.values(CFG.MARKETS).forEach((m) => jsKeys.add(m.taxKey));
CFG.MARKET_ORDER.forEach((c) => jsKeys.add('m.' + c.toLowerCase() + '.note'));
[
  'pricing.perMonth','pricing.perYear','pricing.equivalent','pricing.savingLine','pricing.freeForever',
  'pricing.showingFor','pricing.tableFeature','pricing.saveTag','pricing.monthly','pricing.annual',
  'withdrawal.statutory','withdrawal.goodwill','entity.contract','cmp.included','cmp.notIncluded',
  'modal.body','modal.planLabel','switch.region','switch.language','meta.langName',
  'toast.interest','toast.contact'
].forEach((k) => jsKeys.add(k));

for (const k of jsKeys) if (!(k in en)) fail('JS references unknown i18n key: ' + k);
console.log('  keys referenced from JS: ' + jsKeys.size);

/* --- 5. translation completeness --- */
console.log('[5] translation coverage');
const allUsed = new Set([...usedKeys, ...jsKeys]);
for (const lang of Object.keys(STRINGS)) {
  const missing = [...allUsed].filter((k) => !(k in STRINGS[lang]));
  const pct = (((allUsed.size - missing.length) / allUsed.size) * 100).toFixed(1);
  console.log('  ' + lang + ': ' + pct + '% of in-use keys (' + missing.length + ' fall back to English)');
  if (missing.length) console.log('     ' + missing.slice(0, 12).join(', ') + (missing.length > 12 ? ' …' : ''));
}

/* --- 6. pricing sanity --- */
console.log('[6] pricing sanity');
for (const code of CFG.MARKET_ORDER) {
  const row = [];
  for (const plan of ['premium', 'pro']) {
    const m = CFG.getPricing(plan, code, 'monthly');
    const y = CFG.getPricing(plan, code, 'annual');
    if (y.raw.annual >= m.raw.monthly * 12) fail(code + '/' + plan + ': annual not cheaper than monthly');
    if (y.savingPct < 15 || y.savingPct > 25) fail(code + '/' + plan + ': saving ' + y.savingPct + '% outside 15-25%');
    row.push(plan + ' ' + m.amountText + '/mo, ' + y.amountText + '/yr (-' + y.savingPct + '%)');
  }
  console.log('  ' + code + '  ' + row.join('   |   '));
}

/* --- 7. duplicate ids --- */
console.log('[7] duplicate element ids');
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
  if (dupes.length) fail(path.relative(ROOT, file) + ' duplicate ids: ' + [...new Set(dupes)].join(', '));
}

console.log('\n' + (problems ? problems + ' PROBLEM(S)' : 'All checks passed.'));
