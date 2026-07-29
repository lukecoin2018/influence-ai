/**
 * en/es strings for the creator-dashboard CHROME: the sidebar, the layout's
 * verification gate, the Overview page and the Brands Hiring page.
 *
 * A fourth sibling of lib/i18n/auth-strings.ts, lib/i18n/nav-strings.ts and
 * lib/outreach/ui-strings.ts rather than a section inside any of them:
 *
 *  - auth-strings is 14 KB of claim-funnel copy (claimForm, bioCode, verify,
 *    errors). The sidebar renders on every dashboard route, so importing that
 *    here would ship the whole funnel deck into the dashboard's shared chunk —
 *    the exact cost nav-strings.ts:5-11 was split out to avoid.
 *  - nav-strings serves components/Navigation.tsx, which renders on nearly
 *    every PUBLIC route including the statically prerendered /discover trees.
 *    Dashboard-only copy has no business there.
 *  - lib/outreach/ui-strings.ts is scoped to one route by its own header, and
 *    is driven by that page's language TOGGLE rather than by
 *    creator_profiles.locale. Different locale source; keep them apart.
 *
 * One file, not one per load boundary. Splitting sidebar+layout (all 10
 * dashboard routes) from the two page bodies (their own route each) would save
 * roughly 1.5 KB gzipped on the five English tool routes — noise against the
 * Supabase client, AuthContext and lucide-react those routes already ship.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ──────────────────────────────────────────
 *
 * Anything that names or describes one of the five legacy tools that stay
 * English (Rate Calculator, Negotiation, Contract Builder, Edit Profile, Media
 * Kit) is absent by design, and stays a literal at its call site. Same call
 * lib/outreach/ui-strings.ts:24-27 made for "Brands Hiring": a label that
 * disagrees with its own destination is worse than an untranslated one.
 * Translating those tools is what should remove the inconsistency.
 *
 * That covers, and it is the complete list:
 *  - the five tool names in the sidebar nav (Sidebar.tsx NAV_ITEMS)
 *  - the whole Creator Tools card block on the Overview, titles, descriptions
 *    and the "Open tool →" CTA — the block names and describes English
 *    destinations, so it reads as one English unit
 *  - both "Edit Profile" controls on the Overview's profile card
 *  - the entire sidebar token box and plan badge. Tokens exist to gate those
 *    same English tools, so the token chrome belongs with them. This is also
 *    why TIER_LABELS[tier] + " Plan" needs no key: that concatenation stays
 *    English, so its baked-in English word order never has to survive a
 *    translation.
 *
 * ── REGISTER ───────────────────────────────────────────────────────────────
 *
 * "tú" throughout, same as lib/outreach/ui-strings.ts — this addresses the
 * creator. Neutral Spanish: nothing here should read as either Iberian or
 * region-specific. Gendered adjectives addressed AT the creator are avoided
 * outright ("Hola de nuevo", never "Bienvenido/a"), since we do not know a
 * creator's gender and never will.
 *
 * Vocabulary is aligned with the Spanish surfaces a creator reaches from here,
 * so the dashboard never disagrees with them: "panel" (auth-strings
 * standaloneVerify.goToDashboard), "biografía" not "bio" (auth-strings
 * bioCode), "Verificar ahora" (auth-strings bioCode.verifyButton), and
 * "Escribir a" not "contactar" for outreach — which sidesteps the contactar a
 * (LatAm) / contactar con (Spain) split, as ui-strings.ts:129-132 explains.
 *
 * Same Record<Locale, T> shape as the other three tables, so a missing Spanish
 * key is a compile error. Only the Locale type is shared, as a type-only
 * import — still one definition of 'en' | 'es' in the codebase.
 *
 * EVERY `en` VALUE BELOW IS BYTE-IDENTICAL TO THE LITERAL IT REPLACED. This
 * change must not alter one word of the English dashboard.
 */

import type { Locale } from '@/app/claim/[handle]/_strings';

/**
 * The Spanish name of the Brands Hiring page, in one place. It is the sidebar
 * nav label, the Overview hero's eyebrow and the page's own h1, and those three
 * must never drift apart. Chosen over the more literal "Marcas contratando"
 * because it reads as natural Spanish rather than a gloss, and it still fits
 * the sidebar (see the width note on `sidebar` below).
 *
 * NOTE for whoever localizes the outreach page next: lib/outreach/ui-strings.ts
 * deliberately left "Brands Hiring" in English wherever it names this page
 * (:118, :120, :125, :173, :175, :180), on the reasoning that a breadcrumb must
 * not disagree with its destination. That destination is now Spanish, so those
 * five strings are the ones that disagree. They are out of scope here — one
 * concern per branch — but they should point at this constant.
 */
const BRANDS_HIRING_ES = 'Marcas que contratan';

interface DashboardStrings {
  common: {
    loading: string;
  };

  /**
   * The sidebar is a fixed 240px box with `overflow: hidden` and
   * `whiteSpace: nowrap` on its labels, so an over-long string CLIPS rather
   * than wrapping — silently, with no visual overflow to catch in review.
   * Usable label width is roughly 186px at 13px, so keep anything here under
   * about 24 characters. Prefer a shorter phrasing that fits over a more
   * literal one that does not. The two `*Tooltip` keys are native `title`
   * attributes, which render outside the box and are not constrained.
   */
  sidebar: {
    navOverview: string;
    navBrandsHiring: string;
    navOutreach: string;
    menu: string;
    collapse: string;
    collapseTooltip: string;
    expandTooltip: string;
    /** One key, two sites: the expanded label and the collapsed `title`. */
    signOut: string;
  };

  layout: {
    backToSite: string;
    /**
     * The verification gate. Its CTA leads to /creator-dashboard/verify, which
     * is ALREADY bilingual off creator_profiles.locale
     * (app/creator-dashboard/verify/page.tsx:36) — so this modal going Spanish
     * makes the two agree, where before a Spanish creator got an English modal
     * in front of a Spanish page.
     */
    verifyGateTitle: string;
    verifyGateBody: string;
    verifyGateCta: string;
    verifyGateTime: string;
  };

  overview: {
    loadingDashboard: string;
    /** First name only — the caller splits it. */
    welcome: (firstName: string) => string;
    subtitle: string;

    brandsHiringEyebrow: string;
    heroZero: string;
    /**
     * The hero headline is one sentence split across a highlighted pink <span>
     * (the count) and the text after it, so it needs two keys — the same
     * decomposition app/claim/[handle]/_strings.ts:19-23 uses for the teaser
     * headline. `heroBrandWord` carries the plural; `heroSuffix` is everything
     * after it. Do not merge them: the count has to stay inside its own span.
     */
    heroBrandWord: (n: number) => string;
    heroSuffix: string;
    /**
     * Duplicated from _strings.ts categoryPills.moreCategories rather than
     * imported, deliberately. Reusing that key would pull the 11.7 KB claim
     * teaser table into the Overview chunk for one string, and couple the
     * dashboard to the teaser's table. Keep the two wordings in step by hand.
     */
    moreCategories: (n: number) => string;
    viewAll: string;

    statFollowers: string;
    statEngagement: string;
    statAvgLikes: string;
    statBrandInquiries: string;

    profilePreview: string;
    statusVerified: string;
    statusPending: string;
    statusUnclaimed: string;
    viewPublicProfile: string;

    brandInterest: string;
    /** Whole sentence per locale: the English plural marker carries the verb with it ("s have" / " has"), which no key swap survives. */
    inquiriesInterest: (n: number) => string;
    brandsCanFindYou: string;
    pendingVerificationBody: string;
    claimToSeeDetails: string;
    noInquiries: string;
    /** Shown when an inquiry has no brand_profiles.company_name — our own fallback, not a brand's name. */
    brandFallback: string;
    /** Same, for a missing campaign_type. */
    campaignFallback: string;
    /**
     * NOT copy: the BCP-47 tag passed to toLocaleDateString for inquiry dates.
     * It lives here so it cannot be forgotten when the copy around it is
     * translated — a hardcoded 'en-GB' left an English "5 Aug" sitting in an
     * otherwise Spanish list.
     */
    inquiryDateLocale: string;
  };

  brandsHiring: {
    loadingMatches: string;
    title: string;
    countLine: (n: number) => string;
    detectingSub: string;
    noMatchesCard: string;
    /**
     * The LABEL of the "All" filter chip only. The chip's identity is the
     * untranslated ALL_CATEGORY sentinel in BrandsHiring.tsx, which is compared
     * against consolidated bucket names and must never be translated.
     */
    filterAll: string;
    /** Takes the already-localized bucket label (via categoryBucketLabel), never the raw bucket identity. */
    noCategoryMatches: (categoryLabel: string) => string;
  };
}

const en: DashboardStrings = {
  common: {
    loading: 'Loading...',
  },

  sidebar: {
    navOverview: 'Overview',
    navBrandsHiring: 'Brands Hiring',
    navOutreach: 'Outreach',
    menu: 'Menu',
    collapse: 'Collapse',
    collapseTooltip: 'Collapse sidebar',
    expandTooltip: 'Expand sidebar',
    signOut: 'Sign out',
  },

  layout: {
    backToSite: '← Back to site',
    verifyGateTitle: 'Verify your profile to continue',
    verifyGateBody:
      'Add your verification code to your Instagram or TikTok bio to prove you own this account and unlock your dashboard.',
    verifyGateCta: 'Verify Now →',
    verifyGateTime: 'Takes less than 2 minutes',
  },

  overview: {
    loadingDashboard: 'Loading your dashboard...',
    welcome: (firstName) => `Welcome back, ${firstName} 👋`,
    subtitle: "Here's an overview of your creator profile and tools.",

    brandsHiringEyebrow: 'Brands Hiring',
    heroZero: "We're detecting brands hiring creators your size — check back as we scan more.",
    heroBrandWord: (n) => (n === 1 ? 'brand' : 'brands'),
    heroSuffix: "we've detected hiring creators your size",
    moreCategories: (n) => `+ ${n} more categor${n === 1 ? 'y' : 'ies'}`,
    viewAll: 'View all →',

    statFollowers: 'Followers',
    statEngagement: 'Engagement',
    statAvgLikes: 'Avg Likes',
    statBrandInquiries: 'Brand Inquiries',

    profilePreview: 'Profile Preview',
    statusVerified: 'Verified',
    statusPending: 'Pending',
    statusUnclaimed: 'Unclaimed',
    viewPublicProfile: 'View Public Profile ↗',

    brandInterest: 'Brand Interest',
    inquiriesInterest: (n) =>
      n === 1 ? '1 brand has expressed interest' : `${n} brands have expressed interest`,
    brandsCanFindYou: 'Brands can find you here',
    pendingVerificationBody:
      'Your profile is pending verification. Full details will be visible once verified.',
    claimToSeeDetails: 'Claim your profile to see full details.',
    noInquiries: 'No brand inquiries yet. Make sure your profile is complete to attract brands.',
    brandFallback: 'A brand',
    campaignFallback: 'Campaign',
    inquiryDateLocale: 'en-GB',
  },

  brandsHiring: {
    loadingMatches: 'Loading your brand matches...',
    title: 'Brands Hiring',
    countLine: (n) => `${n} brand${n === 1 ? '' : 's'} we've detected hiring creators your size.`,
    detectingSub: "We're detecting brands for your size — check back as we scan more.",
    noMatchesCard:
      'No brand matches detected yet — this updates automatically as we scan more brands.',
    filterAll: 'All',
    noCategoryMatches: (categoryLabel) =>
      `No ${categoryLabel} brands detected — try a different category.`,
  },
};

const es: DashboardStrings = {
  common: {
    // Three dots, not the … character, matching auth-strings' 'Cargando...'
    // and the English literal this replaces.
    loading: 'Cargando...',
  },

  sidebar: {
    // "Resumen" over "Vista general": shorter, and it is what the page's own
    // subtitle calls itself ("un resumen de tu perfil").
    navOverview: 'Resumen',
    navBrandsHiring: BRANDS_HIRING_ES,
    // "Escribir a marcas", not "Contactar marcas" — same verb choice as the
    // outreach page title and the brand card's button, and it avoids the
    // contactar a / contactar con split entirely.
    navOutreach: 'Escribir a marcas',
    menu: 'Menú',
    // "Contraer" alone; "Contraer barra lateral" would be 22 characters in a
    // ~24-character box next to a 16px icon. The full phrase goes in the
    // tooltip below, which has no width limit.
    collapse: 'Contraer',
    collapseTooltip: 'Contraer barra lateral',
    expandTooltip: 'Expandir barra lateral',
    // Same wording as nav-strings.ts account.logOut, so the site nav above the
    // dashboard and the sidebar inside it never disagree.
    signOut: 'Cerrar sesión',
  },

  layout: {
    backToSite: '← Volver al sitio',
    verifyGateTitle: 'Verifica tu perfil para continuar',
    // "biografía" not "bio", "código", "panel" — the vocabulary the verify page
    // this modal leads to already uses (auth-strings bioCode / claimForm).
    verifyGateBody:
      'Agrega tu código de verificación a tu biografía de Instagram o TikTok para comprobar que esta cuenta es tuya y desbloquear tu panel.',
    // Matches auth-strings bioCode.verifyButton's "Verificar ahora".
    verifyGateCta: 'Verificar ahora →',
    verifyGateTime: 'Toma menos de 2 minutos',
  },

  overview: {
    loadingDashboard: 'Cargando tu panel...',
    // "Hola de nuevo", never "Bienvenido/a": we do not know the creator's
    // gender, and this greeting needs no agreement at all.
    welcome: (firstName) => `Hola de nuevo, ${firstName} 👋`,
    subtitle: 'Este es un resumen de tu perfil de creador y tus herramientas.',

    brandsHiringEyebrow: BRANDS_HIRING_ES,
    heroZero:
      'Estamos detectando marcas que contratan creadores de tu tamaño — vuelve a revisar mientras escaneamos más.',
    heroBrandWord: (n) => (n === 1 ? 'marca' : 'marcas'),
    heroSuffix: 'que detectamos contratando creadores de tu tamaño',
    moreCategories: (n) => `+ ${n} categoría${n === 1 ? '' : 's'} más`,
    // Feminine plural: it stands for "todas las marcas".
    viewAll: 'Ver todas →',

    statFollowers: 'Seguidores',
    // Loanword left as-is, standard in creator and marketing Spanish on both
    // sides of the Atlantic — same call as ui-strings.ts:154-156.
    statEngagement: 'Engagement',
    // "Likes" likewise; "Me gusta promedio" is both longer and clunkier.
    statAvgLikes: 'Likes promedio',
    statBrandInquiries: 'Consultas de marcas',

    profilePreview: 'Vista previa del perfil',
    // Agrees with "perfil" (masculine), not with the creator — no gender
    // assumption in either.
    statusVerified: 'Verificado',
    statusPending: 'Pendiente',
    statusUnclaimed: 'Sin reclamar',
    viewPublicProfile: 'Ver perfil público ↗',

    brandInterest: 'Interés de marcas',
    // Whole sentence per branch: Spanish conjugates the verb with the number
    // ("ha" / "han"), which the English "s have" / " has" trick cannot express.
    inquiriesInterest: (n) =>
      n === 1 ? '1 marca ha mostrado interés' : `${n} marcas han mostrado interés`,
    brandsCanFindYou: 'Las marcas pueden encontrarte aquí',
    pendingVerificationBody:
      'Tu perfil está pendiente de verificación. Verás todos los detalles cuando esté verificado.',
    claimToSeeDetails: 'Reclama tu perfil para ver todos los detalles.',
    noInquiries: 'Todavía no hay consultas de marcas. Completa tu perfil para atraer marcas.',
    brandFallback: 'Una marca',
    campaignFallback: 'Campaña',
    // Neutral 'es' rather than 'es-ES' or 'es-419': it gives "5 ago" in both,
    // and picking a country here would contradict the neutral-Spanish rule.
    inquiryDateLocale: 'es',
  },

  brandsHiring: {
    loadingMatches: 'Cargando tus marcas...',
    title: BRANDS_HIRING_ES,
    countLine: (n) =>
      n === 1
        ? '1 marca que detectamos contratando creadores de tu tamaño.'
        : `${n} marcas que detectamos contratando creadores de tu tamaño.`,
    detectingSub:
      'Estamos detectando marcas para tu tamaño — vuelve a revisar mientras escaneamos más.',
    noMatchesCard:
      'Todavía no detectamos marcas para ti — esto se actualiza automáticamente a medida que escaneamos más.',
    // "Todas", feminine plural, agreeing with the "marcas" it filters.
    filterAll: 'Todas',
    // Spanish puts the category after the noun and needs a preposition the
    // English template has no slot for, so this is a whole sentence, not a
    // prefix with the label pasted in front.
    noCategoryMatches: (categoryLabel) =>
      `No detectamos marcas de ${categoryLabel} — prueba con otra categoría.`,
  },
};

const TABLE: Record<Locale, DashboardStrings> = { en, es };

export function getDashboardStrings(locale: Locale): DashboardStrings {
  return TABLE[locale];
}
