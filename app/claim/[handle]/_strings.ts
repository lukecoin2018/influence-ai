/**
 * en/es string table for the claim teaser (app/claim/[handle] and its
 * localized twin app/es/claim/[handle]). One shared shape for both locales
 * so a missing Spanish key is a type error, not a silent English fallback.
 * Spanish is native Latin American Spanish, not machine-translated — every
 * string here is meant to be reviewed/edited by the founder before ship.
 */

export type Locale = 'en' | 'es';

interface ClaimStrings {
  topBar: {
    preparedFor: (handle: string) => string;
  };
  headline: {
    brandWord: (n: number) => string;
    /** Text after the highlighted "{n} {brandWord}" span. */
    suffix: string;
    sub: (followersFormatted: string) => string;
  };
  categoryPills: {
    moreCategories: (n: number) => string;
    incentiveOne: (first: string) => string;
    incentiveTwo: (first: string, second: string) => string;
  };
  badge: {
    repeatHirer: string;
    program: string;
    sighting: string;
  };
  badgeLegend: {
    program: string;
    repeatHirer: string;
    sighting: string;
  };
  blurredRow: {
    hiddenBrand: string;
    creatorsDetected: (n: number) => string;
  };
  recencyCompact: {
    active: string;
    window: string;
    neutral: string;
  };
  recencyFull: {
    unknown: string;
    neutral: (months: number) => string;
    active: (weeks: number) => string;
    window: (weeks: number) => string;
  };
  moreBrandsSection: {
    moreBrands: (n: number) => string;
  };
  claimCta: {
    seeAll: (n: number) => string;
    sub: (strongestMatchName: string, n: number) => string;
  };
  brandMatchCard: {
    hiresYourSize: string;
    followersAround: (x: string) => string;
    followersRange: (x: string, y: string) => string;
    /** Text after the big styled creator-count number (line 1 of the two-line stat). */
    creatorsDetectedLine1: (n: number) => string;
    hiringYourSizeLine2: string;
    youMarker: string;
    regionMatch: (label: string) => string;
    actOnItNow: (name: string) => string;
    draftOutreach: string;
    calculateRate: string;
  };
  zeroMatch: {
    headlineNamed: (name: string) => string;
    headlineAnon: string;
    subWithFollowers: (followersFormatted: string) => string;
    subNoFollowers: string;
    creatorsIndexed: string;
    realDealsDetected: string;
    claimAnyway: string;
    sub: string;
  };
  retry: {
    title: string;
    body: (handle: string) => string;
    tryAgain: string;
  };
  footer: {
    privacy: string;
    terms: string;
  };
  notFound: {
    title: string;
    body: string;
    backHome: string;
  };
}

const en: ClaimStrings = {
  topBar: {
    preparedFor: (handle) => `Prepared for @${handle}`,
  },
  headline: {
    brandWord: (n) => (n === 1 ? 'brand' : 'brands'),
    suffix: "we've detected hiring creators your size.",
    sub: (followers) => `Real hires we detected around ${followers} followers. Your strongest match, in full:`,
  },
  categoryPills: {
    moreCategories: (n) => `+ ${n} more categor${n === 1 ? 'y' : 'ies'}`,
    incentiveOne: (first) => `Claim your profile to filter by category — see just the ${first} ones.`,
    incentiveTwo: (first, second) => `Claim your profile to filter by category — see just the ${first} ones, or just ${second}.`,
  },
  badge: {
    repeatHirer: 'Repeat hirer',
    program: 'Program',
    sighting: 'Sighting',
  },
  badgeLegend: {
    program: 'hires multiple creators your size, ongoing',
    repeatHirer: 'works with creators repeatedly, often ambassador-style',
    sighting: 'spotted hiring your size at least once',
  },
  blurredRow: {
    hiddenBrand: 'Hidden brand',
    creatorsDetected: (n) => `${n} creator${n === 1 ? '' : 's'} detected`,
  },
  recencyCompact: {
    active: 'hiring right now',
    window: 'hired in the last few months',
    neutral: 'detected a while back',
  },
  recencyFull: {
    unknown: 'Recency unknown',
    neutral: (months) => `Last detected ${months} month${months === 1 ? '' : 's'} ago`,
    active: (weeks) => `Hiring right now — last detected ${weeks} week${weeks === 1 ? '' : 's'} ago`,
    window: (weeks) => `Last hired ${weeks} week${weeks === 1 ? '' : 's'} ago — often a good window to reach out`,
  },
  moreBrandsSection: {
    moreBrands: (n) => `+ ${n} more brand${n === 1 ? '' : 's'} we've detected hiring creators your size`,
  },
  claimCta: {
    seeAll: (n) => `Claim your profile to see all ${n}`,
    sub: (name, n) => `Free for creators. Every count above is a real, detected hirer — ${name} is 1 of ${n}.`,
  },
  brandMatchCard: {
    hiresYourSize: 'Hires creators your size',
    followersAround: (x) => `around ${x} followers`,
    followersRange: (x, y) => `${x} – ${y} followers`,
    creatorsDetectedLine1: (n) => `creator${n === 1 ? '' : 's'} detected`,
    hiringYourSizeLine2: 'hiring your size',
    youMarker: 'You',
    regionMatch: (label) => `Hiring in your region — ${label}`,
    actOnItNow: (name) => `Act on it now — both tools are pre-filled with ${name}'s context:`,
    draftOutreach: 'Draft outreach',
    calculateRate: 'Calculate my rate',
  },
  zeroMatch: {
    headlineNamed: (name) => `${name}, we haven't detected a brand match for you yet.`,
    headlineAnon: "we haven't detected a brand match for you yet.",
    subWithFollowers: (followers) => `We looked at real hires around ${followers} followers and came up empty — that can change as we scan more brands and creators.`,
    subNoFollowers: 'We came up empty this time — that can change as we scan more brands and creators.',
    creatorsIndexed: 'creators indexed',
    realDealsDetected: 'real brand deals detected',
    claimAnyway: 'Claim your profile anyway',
    sub: "Free for creators. We rescan regularly — claiming means you'll see new matches the moment we detect them.",
  },
  retry: {
    title: 'This is taking longer than expected',
    body: (handle) => `We couldn't load @${handle}'s matches in time. This is usually temporary.`,
    tryAgain: 'Try again',
  },
  footer: {
    privacy: 'Privacy',
    terms: 'Terms',
  },
  notFound: {
    title: "We don't have this creator yet",
    body: "We couldn't find a creator with that handle in our database.",
    backHome: 'Back to InfluenceIT',
  },
};

const es: ClaimStrings = {
  topBar: {
    preparedFor: (handle) => `Preparado para @${handle}`,
  },
  headline: {
    brandWord: (n) => (n === 1 ? 'marca' : 'marcas'),
    suffix: 'que detectamos contratando creadores de tu tamaño.',
    sub: (followers) => `Contrataciones reales que detectamos cerca de ${followers} seguidores. Tu mejor match, completo:`,
  },
  categoryPills: {
    moreCategories: (n) => `+ ${n} categoría${n === 1 ? '' : 's'} más`,
    incentiveOne: (first) => `Reclama tu perfil para filtrar por categoría — mira solo las de ${first}.`,
    incentiveTwo: (first, second) => `Reclama tu perfil para filtrar por categoría — mira solo las de ${first}, o solo las de ${second}.`,
  },
  badge: {
    repeatHirer: 'Contrata seguido',
    program: 'Programa',
    sighting: 'Detectado',
  },
  badgeLegend: {
    program: 'contrata a varios creadores de tu tamaño de forma continua',
    repeatHirer: 'trabaja con creadores de forma repetida, a menudo como embajadores',
    sighting: 'vimos que contrató a alguien de tu tamaño al menos una vez',
  },
  blurredRow: {
    hiddenBrand: 'Marca oculta',
    creatorsDetected: (n) => `${n} creador${n === 1 ? '' : 'es'} detectado${n === 1 ? '' : 's'}`,
  },
  recencyCompact: {
    active: 'contratando ahora mismo',
    window: 'contrató en los últimos meses',
    neutral: 'detectado hace tiempo',
  },
  recencyFull: {
    unknown: 'Fecha reciente desconocida',
    neutral: (months) => `Última detección hace ${months} mes${months === 1 ? '' : 'es'}`,
    active: (weeks) => `Contratando ahora mismo — detectado hace ${weeks} semana${weeks === 1 ? '' : 's'}`,
    window: (weeks) => `Última contratación hace ${weeks} semana${weeks === 1 ? '' : 's'} — suele ser un buen momento para contactar`,
  },
  moreBrandsSection: {
    moreBrands: (n) => `+ ${n} marca${n === 1 ? '' : 's'} más que detectamos contratando creadores de tu tamaño`,
  },
  claimCta: {
    seeAll: (n) => `Reclama tu perfil para ver las ${n}`,
    sub: (name, n) => `Gratis para creadores. Cada número de arriba es un contratante real que detectamos — ${name} es 1 de ${n}.`,
  },
  brandMatchCard: {
    hiresYourSize: 'Contrata creadores de tu tamaño',
    followersAround: (x) => `cerca de ${x} seguidores`,
    followersRange: (x, y) => `${x} – ${y} seguidores`,
    creatorsDetectedLine1: (n) => `creador${n === 1 ? '' : 'es'} detectado${n === 1 ? '' : 's'}`,
    hiringYourSizeLine2: 'contratando tu tamaño',
    youMarker: 'Tú',
    regionMatch: (label) => `Contratando en tu región — ${label}`,
    actOnItNow: (name) => `Actúa ahora — ambas herramientas ya vienen con el contexto de ${name}:`,
    draftOutreach: 'Redactar mensaje',
    calculateRate: 'Calcular mi tarifa',
  },
  zeroMatch: {
    headlineNamed: (name) => `${name}, todavía no detectamos un match de marca para ti.`,
    headlineAnon: 'todavía no detectamos un match de marca para ti.',
    subWithFollowers: (followers) => `Revisamos contrataciones reales cerca de ${followers} seguidores y no encontramos nada — eso puede cambiar a medida que escaneamos más marcas y creadores.`,
    subNoFollowers: 'Esta vez no encontramos nada — eso puede cambiar a medida que escaneamos más marcas y creadores.',
    creatorsIndexed: 'creadores indexados',
    realDealsDetected: 'acuerdos de marca reales detectados',
    claimAnyway: 'Reclama tu perfil de todas formas',
    sub: 'Gratis para creadores. Volvemos a escanear con frecuencia — al reclamar tu perfil verás nuevos matches en cuanto los detectemos.',
  },
  retry: {
    title: 'Esto está tardando más de lo esperado',
    body: (handle) => `No pudimos cargar los matches de @${handle} a tiempo. Esto suele ser temporal.`,
    tryAgain: 'Intentar de nuevo',
  },
  footer: {
    privacy: 'Privacidad',
    terms: 'Términos',
  },
  notFound: {
    title: 'Todavía no tenemos a este creador',
    body: 'No encontramos ningún creador con ese usuario en nuestra base de datos.',
    backHome: 'Volver a InfluenceIT',
  },
};

const TABLE: Record<Locale, ClaimStrings> = { en, es };

export function getClaimStrings(locale: Locale): ClaimStrings {
  return TABLE[locale];
}
