import type { Locale } from '@/app/claim/[handle]/_strings';

/**
 * en/es copy for /get-listed.
 *
 * A local table in the route's own directory, the same shape and for the same
 * reason as app/claim/[handle]/_strings.ts — not a section inside
 * lib/i18n/auth-strings.ts, which is 14 KB of claim-funnel copy that this page
 * has no use for, and which CLAUDE.md asks to keep out of anything that
 * renders elsewhere.
 *
 * Bilingual because two of its three entry points are: the signup form's
 * handle-not-found line and the /es/claim/[handle] not-found page both hand a
 * Spanish-speaking creator over to this page. An English-only destination
 * there would be exactly the "label that disagrees with its destination"
 * problem CLAUDE.md warns about, in the other direction.
 *
 * ── WHAT THIS COPY MUST NOT SAY ────────────────────────────────────────────
 *
 * It replaces two strings that promised things the product cannot do — "you
 * can still sign up and we'll add you" (signup is blocked for an unknown
 * handle) and "we'll notify you when your profile is ready" (there is no
 * notification system). The rules for everything here:
 *
 *  - We review by hand and add creators who FIT. Never "we will add you".
 *  - Exactly one forward promise, and it is conditional: IF we add the handle,
 *    one more email follows. That email is RequestFulfilled, sent by the daily
 *    cron pass, so the promise is one the code actually keeps.
 *  - Instagram only, said plainly, because it is.
 *
 * Record<Locale, T>, so a missing Spanish key is a compile error.
 *
 * Neutral Spanish, "tú", no gendered greetings — same register as
 * lib/i18n/dashboard-strings.ts and lib/outreach/ui-strings.ts.
 */

export interface GetListedStrings {
  title: string;
  subtitle: string;

  platformLabel: string;
  platformInstagram: string;
  /** The disabled TikTok option. Says why, rather than just being greyed out. */
  platformTikTokSoon: string;

  handleLabel: string;
  handlePlaceholder: string;
  handleHelp: string;

  emailLabel: string;
  emailPlaceholder: string;
  emailHelp: string;

  noteLabel: string;
  noteOptional: string;
  notePlaceholder: string;
  noteCounter: (remaining: number) => string;

  submit: string;
  submitting: string;

  /** Accepted, row written, creator emailed. */
  successTitle: string;
  successBody: string;

  /** A request for this handle is already open. Nothing written, nothing sent. */
  alreadyRequestedTitle: string;
  alreadyRequestedBody: string;

  /** The handle is already in the database — this is good news, not an error. */
  existsTitle: string;
  existsBody: (handle: string) => string;
  existsCta: string;

  errors: {
    handleRequired: string;
    handleInvalid: string;
    emailRequired: string;
    emailInvalid: string;
    noteTooLong: string;
    rateLimited: string;
    /** Last resort: a 5xx, a dropped connection, or a reason code this build does not know. */
    failed: string;
  };
}

const en: GetListedStrings = {
  title: 'Ask us to add you',
  subtitle:
    "We don't have your profile yet. Tell us your handle and we'll take a look — we review every request by hand and add Instagram creators who fit the database.",

  platformLabel: 'Platform',
  platformInstagram: 'Instagram',
  platformTikTokSoon: 'TikTok — coming soon',

  handleLabel: 'Instagram handle',
  handlePlaceholder: 'yourhandle',
  handleHelp: 'Your username or a link to your profile — either works.',

  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  emailHelp: "Where we'd send your claim link if we add you.",

  noteLabel: 'Anything we should know?',
  noteOptional: 'optional',
  notePlaceholder: 'Your niche, where you post from, brands you work with…',
  noteCounter: (remaining) => `${remaining} characters left`,

  submit: 'Send request',
  submitting: 'Sending...',

  successTitle: 'Got it',
  successBody:
    "We'll review your request by hand. If we add your profile, you'll get one email with a link to claim it. Nothing to do until then.",

  alreadyRequestedTitle: 'Already on the list',
  alreadyRequestedBody:
    "There's already an open request for this handle, so we haven't added a second one. It's in the queue.",

  existsTitle: "You're already here",
  existsBody: (handle) => `We already have @${handle} in the database — no need to ask. You can claim the profile now.`,
  existsCta: 'Claim your profile',

  errors: {
    handleRequired: 'Enter your Instagram handle.',
    handleInvalid: "That doesn't look like an Instagram handle. Letters, numbers, periods and underscores only.",
    emailRequired: 'Enter your email address.',
    emailInvalid: "That email address doesn't look right.",
    noteTooLong: 'Your note is too long — 300 characters maximum.',
    rateLimited: "That's a few requests in a short time. Try again in an hour.",
    failed: "We couldn't send your request. Please try again in a moment.",
  },
};

const es: GetListedStrings = {
  title: 'Pídenos que te agreguemos',
  subtitle:
    'Todavía no tenemos tu perfil. Dinos tu usuario y lo revisamos — revisamos cada solicitud a mano y agregamos creadores de Instagram que encajan en la base de datos.',

  platformLabel: 'Plataforma',
  platformInstagram: 'Instagram',
  platformTikTokSoon: 'TikTok — próximamente',

  handleLabel: 'Usuario de Instagram',
  handlePlaceholder: 'tuusuario',
  handleHelp: 'Tu nombre de usuario o un enlace a tu perfil — cualquiera sirve.',

  emailLabel: 'Correo electrónico',
  emailPlaceholder: 'tu@ejemplo.com',
  emailHelp: 'Ahí te mandaríamos el enlace para reclamar tu perfil si te agregamos.',

  noteLabel: '¿Algo que debamos saber?',
  noteOptional: 'opcional',
  notePlaceholder: 'Tu nicho, desde dónde publicas, marcas con las que trabajas…',
  // "caracteres" is the same word in both regions; no split to sidestep here.
  noteCounter: (remaining) => `Quedan ${remaining} caracteres`,

  submit: 'Enviar solicitud',
  submitting: 'Enviando...',

  successTitle: 'Listo',
  successBody:
    'Vamos a revisar tu solicitud a mano. Si agregamos tu perfil, te llega un correo con el enlace para reclamarlo. Hasta entonces no tienes que hacer nada.',

  alreadyRequestedTitle: 'Ya está en la lista',
  alreadyRequestedBody:
    'Ya hay una solicitud abierta para este usuario, así que no agregamos otra. Está en la fila.',

  existsTitle: 'Ya estás aquí',
  existsBody: (handle) => `Ya tenemos a @${handle} en la base de datos — no hace falta pedirlo. Puedes reclamar el perfil ahora.`,
  existsCta: 'Reclamar tu perfil',

  errors: {
    handleRequired: 'Escribe tu usuario de Instagram.',
    handleInvalid: 'Eso no parece un usuario de Instagram. Solo letras, números, puntos y guiones bajos.',
    emailRequired: 'Escribe tu correo electrónico.',
    emailInvalid: 'Ese correo electrónico no parece correcto.',
    noteTooLong: 'Tu nota es muy larga — máximo 300 caracteres.',
    rateLimited: 'Son varias solicitudes en poco tiempo. Inténtalo de nuevo en una hora.',
    failed: 'No pudimos enviar tu solicitud. Inténtalo de nuevo en un momento.',
  },
};

const TABLE: Record<Locale, GetListedStrings> = { en, es };

export function getGetListedStrings(locale: Locale): GetListedStrings {
  return TABLE[locale];
}

/**
 * Maps a `reason` code from /api/creators/request to something the creator can
 * act on. Keyed off the CODE, never the HTTP status and never the route's
 * prose — the route's bodies are English and "already listed" is a legitimate
 * 200 (CLAUDE.md, "Localization").
 */
export function requestErrorMessage(locale: Locale, reason: string | null | undefined): string {
  const t = getGetListedStrings(locale).errors;
  switch (reason) {
    case 'handle_required':
      return t.handleRequired;
    case 'handle_invalid':
    case 'invalid_platform':
      return t.handleInvalid;
    case 'email_required':
      return t.emailRequired;
    case 'email_invalid':
      return t.emailInvalid;
    case 'note_too_long':
      return t.noteTooLong;
    case 'rate_limited':
      return t.rateLimited;
    default:
      // Same rationale as claimErrorMessage() in lib/i18n/auth-strings.ts: a
      // silent fallback there has already cost one debugging session.
      console.warn(`[get-listed] Unmapped request reason: ${JSON.stringify(reason)}`);
      return t.failed;
  }
}
