/* ==========================================================================
   Llama LLC - market, currency and plan configuration
   --------------------------------------------------------------------------
   Single source of truth for anything commercial. When a payment processor is
   wired up later, the `planId` values below are what you map to its price IDs.
   Nothing here touches a network; all figures are static and local.
   ========================================================================== */

(function (global) {
  'use strict';

  /* --- Currencies ------------------------------------------------------- */
  var CURRENCIES = {
    USD: { code: 'USD', symbol: '$',  decimals: 2, locale: 'en-US' },
    GBP: { code: 'GBP', symbol: '£', decimals: 2, locale: 'en-GB' },
    EUR: { code: 'EUR', symbol: '€', decimals: 2, locale: 'de-DE' },
    INR: { code: 'INR', symbol: '₹', decimals: 0, locale: 'en-IN' },
    JPY: { code: 'JPY', symbol: '¥', decimals: 0, locale: 'ja-JP' }
  };

  /* --- Markets ----------------------------------------------------------
     `taxKey`      -> i18n key for the price footnote
     `withdrawal`  -> 'statutory' = EU/UK 14-day right of withdrawal,
                      'goodwill'  = contractual 14-day refund promise
     `entity`      -> which Llama entity contracts with the customer
     ---------------------------------------------------------------------- */
  var MARKETS = {
    US: {
      code: 'US', name: 'United States', flag: '🇺🇸',
      currency: 'USD', lang: 'en', locale: 'en-US',
      taxKey: 'tax.us', taxIncluded: false,
      withdrawal: 'goodwill', entity: 'Llama LLC (Delaware, USA)',
      privacyLaw: 'CCPA/CPRA', dialCode: '+1'
    },
    GB: {
      code: 'GB', name: 'United Kingdom', flag: '🇬🇧',
      currency: 'GBP', lang: 'en', locale: 'en-GB',
      taxKey: 'tax.gb', taxIncluded: false,
      withdrawal: 'statutory', entity: 'Llama Travel Technologies UK Ltd.',
      privacyLaw: 'UK GDPR', dialCode: '+44'
    },
    DE: {
      code: 'DE', name: 'Deutschland', flag: '🇩🇪',
      currency: 'EUR', lang: 'de', locale: 'de-DE',
      taxKey: 'tax.de', taxIncluded: false,
      withdrawal: 'statutory', entity: 'Llama Travel Technologies B.V.',
      privacyLaw: 'EU GDPR', dialCode: '+49'
    },
    FR: {
      code: 'FR', name: 'France', flag: '🇫🇷',
      currency: 'EUR', lang: 'fr', locale: 'fr-FR',
      taxKey: 'tax.fr', taxIncluded: false,
      withdrawal: 'statutory', entity: 'Llama Travel Technologies B.V.',
      privacyLaw: 'EU GDPR', dialCode: '+33'
    },
    IN: {
      code: 'IN', name: 'India', flag: '🇮🇳',
      currency: 'INR', lang: 'en', locale: 'en-IN',
      taxKey: 'tax.in', taxIncluded: false,
      withdrawal: 'goodwill', entity: 'Llama Travel Tech India Pvt. Ltd.',
      privacyLaw: 'DPDP Act 2023', dialCode: '+91'
    },
    JP: {
      code: 'JP', name: '日本', flag: '🇯🇵',
      currency: 'JPY', lang: 'ja', locale: 'ja-JP',
      taxKey: 'tax.jp', taxIncluded: false,
      withdrawal: 'goodwill', entity: 'Llama Travel Technologies KK',
      privacyLaw: 'APPI', dialCode: '+81'
    }
  };

  var MARKET_ORDER = ['US', 'GB', 'DE', 'FR', 'IN', 'JP'];
  var LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'ja', label: '日本語' }
  ];

  /* --- Plans -------------------------------------------------------------
     Prices are per market, already in local currency. They are NET figures:
     tax is calculated from the billing address and added at checkout, which
     is Stripe's default behaviour. The total a customer pays is therefore
     higher than the number shown here.
     Annual figures are the amount charged once per year, before tax.
     ---------------------------------------------------------------------- */
  var PRICES = {
    free:    { US: { m: 0,    y: 0     }, GB: { m: 0,    y: 0     }, DE: { m: 0,    y: 0     },
               FR: { m: 0,    y: 0     }, IN: { m: 0,    y: 0     }, JP: { m: 0,    y: 0     } },
    premium: { US: { m: 12,   y: 115   }, GB: { m: 10,   y: 96    }, DE: { m: 12,   y: 115   },
               FR: { m: 12,   y: 115   }, IN: { m: 499,  y: 4790  }, JP: { m: 1800, y: 17280 } },
    pro:     { US: { m: 29,   y: 279   }, GB: { m: 25,   y: 240   }, DE: { m: 29,   y: 279   },
               FR: { m: 29,   y: 279   }, IN: { m: 1299, y: 12470 }, JP: { m: 4400, y: 42240 } }
  };

  /* Plan metadata. `featureKeys` drive the pricing-card bullet lists. */
  var PLANS = [
    {
      id: 'free',
      planId: 'llama_free',
      nameKey: 'plan.free.name',
      taglineKey: 'plan.free.tagline',
      ctaKey: 'cta.startFree',
      ctaVariant: 'outline',
      featured: false,
      featuresHeadKey: 'plan.free.head',
      featureKeys: [
        'f.trips.3', 'f.itinerary.basic', 'f.guides.basic',
        'f.search.links', 'f.packing', 'f.web', 'f.support.community'
      ]
    },
    {
      id: 'premium',
      planId: 'llama_premium',
      nameKey: 'plan.premium.name',
      taglineKey: 'plan.premium.tagline',
      ctaKey: 'cta.choosePremium',
      ctaVariant: 'primary',
      featured: true,
      flagKey: 'plan.mostPopular',
      featuresHeadKey: 'plan.premium.head',
      featureKeys: [
        'f.trips.unlimited', 'f.itinerary.full', 'f.fareAlerts.20',
        'f.disruption', 'f.offline', 'f.collab.4', 'f.entryReqs',
        'f.transit', 'f.budget', 'f.support.priority'
      ]
    },
    {
      id: 'pro',
      planId: 'llama_pro',
      nameKey: 'plan.pro.name',
      taglineKey: 'plan.pro.tagline',
      ctaKey: 'cta.choosePro',
      ctaVariant: 'accent',
      featured: false,
      featuresHeadKey: 'plan.pro.head',
      featureKeys: [
        'f.fareAlerts.unlimited', 'f.collab.12', 'f.business',
        'f.loyalty', 'f.multicity', 'f.concierge', 'f.support.247',
        'f.integrations', 'f.invoicing'
      ]
    }
  ];

  /* --- Full comparison matrix (pricing page table) -----------------------
     value: true | false | i18n key string  -> rendered per tier
     ---------------------------------------------------------------------- */
  var COMPARISON = [
    {
      groupKey: 'cmp.group.planning',
      rows: [
        { labelKey: 'cmp.trips',        free: 'cmp.v.3peryear', premium: 'cmp.v.unlimited', pro: 'cmp.v.unlimited' },
        { labelKey: 'cmp.itinLength',   free: 'cmp.v.5days',    premium: 'cmp.v.unlimited', pro: 'cmp.v.unlimited' },
        { labelKey: 'cmp.dayOptimise',  free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.multicity',    free: false,            premium: 'cmp.v.upto3',     pro: 'cmp.v.unlimited' },
        { labelKey: 'cmp.guides',       free: 'cmp.v.basic',    premium: 'cmp.v.full',      pro: 'cmp.v.full' },
        { labelKey: 'cmp.packing',      free: true,             premium: true,              pro: true }
      ]
    },
    {
      groupKey: 'cmp.group.booking',
      rows: [
        { labelKey: 'cmp.search',       free: true,             premium: true,              pro: true },
        { labelKey: 'cmp.fareAlerts',   free: false,            premium: 'cmp.v.20routes',  pro: 'cmp.v.unlimited' },
        { labelKey: 'cmp.hotelWatch',   free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.disruption',   free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.loyalty',      free: false,            premium: false,             pro: true },
        { labelKey: 'cmp.reservations', free: false,            premium: true,              pro: true }
      ]
    },
    {
      groupKey: 'cmp.group.onTrip',
      rows: [
        { labelKey: 'cmp.offline',      free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.transit',      free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.entryReqs',    free: 'cmp.v.summary',  premium: 'cmp.v.perTraveller', pro: 'cmp.v.perTraveller' },
        { labelKey: 'cmp.budget',       free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.concierge',    free: false,            premium: false,             pro: 'cmp.v.5permonth' }
      ]
    },
    {
      groupKey: 'cmp.group.collab',
      rows: [
        { labelKey: 'cmp.travellers',   free: 'cmp.v.1',        premium: 'cmp.v.4',         pro: 'cmp.v.12' },
        { labelKey: 'cmp.sharedBudget', free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.profiles',     free: false,            premium: false,             pro: true },
        { labelKey: 'cmp.businessMode', free: false,            premium: false,             pro: true },
        { labelKey: 'cmp.expense',      free: false,            premium: false,             pro: true }
      ]
    },
    {
      groupKey: 'cmp.group.platform',
      rows: [
        { labelKey: 'cmp.web',          free: true,             premium: true,              pro: true },
        { labelKey: 'cmp.mobile',       free: true,             premium: true,              pro: true },
        { labelKey: 'cmp.calendar',     free: false,            premium: true,              pro: true },
        { labelKey: 'cmp.api',          free: false,            premium: false,             pro: true },
        { labelKey: 'cmp.support',      free: 'cmp.v.community', premium: 'cmp.v.email24',  pro: 'cmp.v.247' },
        { labelKey: 'cmp.invoicing',    free: false,            premium: false,             pro: true }
      ]
    }
  ];

  /* --- Helpers ---------------------------------------------------------- */

  function getMarket(code) {
    return MARKETS[code] || MARKETS.US;
  }

  function getCurrencyFor(marketCode) {
    return CURRENCIES[getMarket(marketCode).currency];
  }

  /**
   * Format a bare number as currency for a market.
   * @param {number} amount
   * @param {string} marketCode
   * @param {{decimals?:number}} [opts] override decimal places
   */
  function formatPrice(amount, marketCode, opts) {
    var market = getMarket(marketCode);
    var cur = CURRENCIES[market.currency];
    var decimals = opts && typeof opts.decimals === 'number' ? opts.decimals : cur.decimals;

    // Whole amounts read better without trailing zeros on the card.
    if (decimals === 2 && Math.abs(amount - Math.round(amount)) < 0.005) decimals = 0;

    try {
      return new Intl.NumberFormat(market.locale, {
        style: 'currency',
        currency: cur.code,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(amount);
    } catch (err) {
      return cur.symbol + amount.toFixed(decimals);
    }
  }

  /**
   * Everything a pricing card needs for one plan in one market/cycle.
   * @param {string} planId  'free' | 'premium' | 'pro'
   * @param {string} marketCode
   * @param {string} cycle   'monthly' | 'annual'
   */
  function getPricing(planId, marketCode, cycle) {
    var row = (PRICES[planId] || PRICES.free)[marketCode] || PRICES[planId].US;
    var isAnnual = cycle === 'annual';
    var cur = getCurrencyFor(marketCode);

    var monthly = row.m;
    var annual = row.y;
    var amount = isAnnual ? annual : monthly;
    var perMonth = isAnnual ? annual / 12 : monthly;

    // Floor the saving so the headline can never overstate the discount.
    var savingPct = monthly > 0 ? Math.floor((1 - annual / (monthly * 12)) * 100) : 0;
    var savingAbs = monthly > 0 ? monthly * 12 - annual : 0;

    return {
      isFree: monthly === 0,
      cycle: isAnnual ? 'annual' : 'monthly',
      raw: { monthly: monthly, annual: annual, amount: amount, perMonth: perMonth },
      amountText: formatPrice(amount, marketCode),
      monthlyText: formatPrice(monthly, marketCode),
      annualText: formatPrice(annual, marketCode),
      perMonthText: formatPrice(perMonth, marketCode, { decimals: cur.decimals }),
      listAnnualText: formatPrice(monthly * 12, marketCode),
      savingPct: savingPct,
      savingText: formatPrice(savingAbs, marketCode)
    };
  }

  global.LlamaConfig = {
    CURRENCIES: CURRENCIES,
    MARKETS: MARKETS,
    MARKET_ORDER: MARKET_ORDER,
    LANGUAGES: LANGUAGES,
    PLANS: PLANS,
    PRICES: PRICES,
    COMPARISON: COMPARISON,
    getMarket: getMarket,
    getCurrencyFor: getCurrencyFor,
    formatPrice: formatPrice,
    getPricing: getPricing
  };
})(window);
