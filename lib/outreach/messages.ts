/**
 * en/es message generation for the creator cold-outreach tool
 * (app/creator-dashboard/outreach).
 *
 * Structure follows lib/i18n/nav-strings.ts and app/claim/[handle]/_strings.ts:
 * one interface both locales must satisfy, held in a `Record<Locale, T>`, so a
 * missing Spanish key is a compile error rather than a silent English
 * fallback. Interpolation is by FUNCTION, not by {{token}} substitution — the
 * negotiation template system (lib/negotiation-templates.ts +
 * lib/negotiation-template-matcher.ts) does the latter, but it is monolingual
 * and its personalizeTemplate() hardcodes seven negotiation-specific tokens, so
 * there was nothing to reuse without translating the whole English-only deck.
 *
 * Message ASSEMBLY deliberately lives OUTSIDE the locale table (which parts, in
 * what order, separated how). Every locale builds the same six-part first
 * message, so the order belongs in one place rather than being duplicated and
 * allowed to drift.
 *
 * This file is ONLY what the creator sends. Every word wrapped around the
 * message — the page title, the section headings, the per-message timing
 * labels — is chrome and lives in lib/outreach/ui-strings.ts. Both tables are
 * driven by the same language toggle, so the page and the message it contains
 * can never end up in different languages.
 *
 * Product rules this file is bound by:
 *  - Nothing is stated as absolute. The relevance line is phrased as the
 *    creator's own observation ("I've noticed you work with creators around my
 *    size"), never as a readout of the bracket numbers behind it.
 *  - No fabricated numbers. Every figure is passed in from live data, and any
 *    figure we do not have is omitted rather than defaulted — there is no
 *    fallback constant anywhere in this file.
 *  - Region and recency are additive only. Their absence removes a clause; it
 *    never adds a hedge or a negative.
 *
 * Spanish is neutral: no vos, no vosotros. A cold first contact with a brand is
 * addressed in formal plural (ustedes/les), which reads correctly to both a
 * LatAm and a Spain audience.
 */

import type { Locale } from '@/app/claim/[handle]/_strings';

export type OutreachStep = 1 | 2 | 3;

/**
 * The creator's own details, as strings, because every one of them is editable
 * in the UI before the message is generated.
 *
 * `followers` and `engagement` are pre-formatted for display by the caller and
 * are free text by the time they arrive here — a creator may type "1.2M" or
 * "125k". An empty string means "we don't have this / the creator cleared it",
 * and the clause that would have used it is dropped entirely.
 */
export type OutreachIdentity = {
  /**
   * FIRST name only, e.g. "Andrea" — a DM opening with a full legal name reads
   * like a form letter. Resolved by the caller through the same chain the
   * Overview page uses, so the two screens agree on who the creator is.
   *
   * Empty when no name resolves at all, and empty is a supported value rather
   * than a caller error: the identify line then names the creator ONCE, by
   * handle, instead of printing the same identifier on both sides of a
   * parenthesis. The sign-off falls back to the handle too — see signatureOf().
   */
  name: string;
  /** Without a leading @; the templates add it. */
  handle: string;
  followers: string;
  /** The percentage WITHOUT its sign, e.g. "2.4". The templates add the %. */
  engagement: string;
};

/**
 * What the creator signs off as. Their first name when we have one, otherwise
 * their handle — never an empty string, which is why the locale tables can take
 * this as a plain required value and never branch on it.
 */
function signatureOf(identity: OutreachIdentity): string {
  return identity.name || `@${identity.handle}`;
}

/**
 * What we detected about the brand. Only the two additive signals are used —
 * region and recency.
 *
 * distinctCreators / repeatRatio / the follower bracket are deliberately NOT
 * threaded in. They are what makes the relevance line true, but quoting them at
 * a brand would turn the creator's observation into a data readout, which is
 * exactly the phrasing this tool is meant to avoid.
 */
export type OutreachBrandContext = {
  brandName: string;
  /** True only for the 'active' recency bucket (<= 28 days). 'window' and 'neutral' both omit the clause. */
  recentlyActive: boolean;
  /**
   * The creator's own country, from MatchedBrand.regionMatch.label, when this
   * brand is tagged to it. Null means no region clause — never a negative one.
   */
  regionLabel: string | null;
};

export type OutreachMessage = {
  step: OutreachStep;
  body: string;
};

interface OutreachStrings {
  /** Part 1 of 6. */
  greeting: (brandName: string) => string;
  /**
   * Part 2 of 6 — who the creator is. Drops whichever stats are missing; never
   * invents one. With no name, names the creator by handle alone rather than
   * repeating the handle either side of a parenthesis.
   */
  identify: (identity: OutreachIdentity) => string;
  /** Part 3 of 6 — evidence-based relevance, in the creator's voice. */
  relevance: (recentlyActive: boolean, regionLabel: string | null) => string;
  /**
   * Part 4 of 6 — the one clearly-marked placeholder the creator must replace.
   * The square brackets are load-bearing: they are what makes it obvious this
   * line is not finished, and the only thing in the message the data cannot fill.
   */
  placeholder: string;
  /** Part 5 of 6 — the ask. Low pressure by construction: no deadline, no urgency, no close. */
  ask: string;
  /** Part 6 of 6. Receives signatureOf(), so it is never handed an empty string. */
  signoff: (signature: string) => string;
  /** Whole message. Brief, warm, references the first, offers the media kit. */
  followUpOne: (brandName: string, signature: string) => string;
  /** Whole message. Graceful exit — leaves the door open, and does not ask again. */
  followUpTwo: (brandName: string, signature: string, handle: string) => string;
}

const en: OutreachStrings = {
  greeting: (brandName) => `Hi ${brandName},`,

  identify: ({ name, handle, followers, engagement }) => {
    const stats = [
      followers ? `${followers} followers on Instagram` : null,
      engagement ? `around ${engagement}% engagement` : null,
    ].filter(Boolean);

    const who = name ? `${name} (@${handle})` : `@${handle}`;

    return stats.length > 0 ? `I'm ${who} — ${stats.join(', ')}.` : `I'm ${who}.`;
  },

  relevance: (recentlyActive, regionLabel) => {
    const base = recentlyActive
      ? "I've noticed you've been working recently with creators around my size"
      : "I've noticed you work with creators around my size";
    return regionLabel ? `${base}, including in ${regionLabel}.` : `${base}.`;
  },

  placeholder: '[mention something recent you noticed about them]',

  ask: "If you're planning any creator collaborations soon, I'd love to be considered. No rush — happy to share more whenever it's useful.",

  signoff: (signature) => `— ${signature}`,

  followUpOne: (brandName, signature) =>
    [
      `Hi ${brandName}, just following up on my message from last week — no problem at all if it got buried.`,
      '',
      'If it helps, I can send over my media kit with my audience numbers and recent collaborations.',
      '',
      `— ${signature}`,
    ].join('\n'),

  followUpTwo: (brandName, signature, handle) =>
    [
      `Hi ${brandName}, I'll leave it here so I'm not cluttering your inbox.`,
      '',
      `If creator collaborations come up later on, I'd be glad to hear from you — @${handle} is the best place to reach me. All the best with what you're building.`,
      '',
      `— ${signature}`,
    ].join('\n'),
};

const es: OutreachStrings = {
  greeting: (brandName) => `Hola ${brandName}:`,

  identify: ({ name, handle, followers, engagement }) => {
    const stats = [
      followers ? `${followers} seguidores en Instagram` : null,
      // "engagement" is left as-is: it is the standard term in creator and
      // marketing Spanish on both sides of the Atlantic, and "interacción"
      // would read like a translation.
      engagement ? `un engagement de alrededor del ${engagement}%` : null,
    ].filter(Boolean);

    const who = name ? `${name} (@${handle})` : `@${handle}`;

    return stats.length > 0 ? `Soy ${who} — ${stats.join(', ')}.` : `Soy ${who}.`;
  },

  relevance: (recentlyActive, regionLabel) => {
    const base = recentlyActive
      ? 'He visto que últimamente trabajan con creadores de mi tamaño'
      : 'He visto que trabajan con creadores de mi tamaño';
    return regionLabel ? `${base}, incluso en ${regionLabel}.` : `${base}.`;
  },

  placeholder: '[menciona algo reciente que hayas visto de ellos]',

  // "Sin compromiso" rather than "sin apuro" (LatAm) or "sin prisa" (Spain) —
  // neutral to both, and it carries the low-pressure intent more directly.
  ask: 'Si tienen pensada alguna colaboración con creadores próximamente, me encantaría que me tuvieran en cuenta. Sin compromiso — con gusto les comparto más detalles cuando les sirva.',

  signoff: (signature) => `— ${signature}`,

  followUpOne: (brandName, signature) =>
    [
      `Hola ${brandName}: les escribo para retomar mi mensaje de la semana pasada — sin problema si se perdió entre los mensajes.`,
      '',
      'Si les sirve, puedo enviarles mi media kit con los números de mi audiencia y mis colaboraciones recientes.',
      '',
      `— ${signature}`,
    ].join('\n'),

  followUpTwo: (brandName, signature, handle) =>
    [
      `Hola ${brandName}: lo dejo aquí para no llenarles la bandeja de entrada.`,
      '',
      `Si más adelante surge alguna colaboración con creadores, me encantaría saber de ustedes — me encuentran en @${handle}. Mucho éxito con lo que están construyendo.`,
      '',
      `— ${signature}`,
    ].join('\n'),
};

const TABLE: Record<Locale, OutreachStrings> = { en, es };

export function getOutreachStrings(locale: Locale): OutreachStrings {
  return TABLE[locale];
}

/**
 * The six-part first message. Locale-independent assembly: each locale supplies
 * the parts, this decides the order and the spacing.
 *
 * Blank lines between parts are what keep it readable in an Instagram DM, where
 * there is no subject line and the preview truncates early — which is also why
 * the identify line sits immediately after the greeting rather than at the end.
 */
function firstMessage(
  t: OutreachStrings,
  identity: OutreachIdentity,
  brand: OutreachBrandContext,
  signature: string,
): string {
  return [
    t.greeting(brand.brandName),
    '',
    t.identify(identity),
    '',
    t.relevance(brand.recentlyActive, brand.regionLabel),
    '',
    t.placeholder,
    '',
    t.ask,
    '',
    t.signoff(signature),
  ].join('\n');
}

/**
 * The full three-message sequence, in order. All three are generated up front
 * and shown together — the creator is meant to see the follow-ups exist before
 * committing to the first message, not discover them later.
 */
export function buildOutreachSequence(
  locale: Locale,
  identity: OutreachIdentity,
  brand: OutreachBrandContext,
): OutreachMessage[] {
  const t = getOutreachStrings(locale);
  // Resolved once, here, so all three messages sign off identically — and so a
  // creator with no resolvable name signs as their handle rather than as "— ".
  const signature = signatureOf(identity);

  return [
    { step: 1, body: firstMessage(t, identity, brand, signature) },
    { step: 2, body: t.followUpOne(brand.brandName, signature) },
    { step: 3, body: t.followUpTwo(brand.brandName, signature, identity.handle) },
  ];
}
