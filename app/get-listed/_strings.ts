import type { Locale } from '@/app/claim/[handle]/_strings';
import type { RequestPlatform } from '@/lib/creator-requests/shared';

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

  /**
   * The three handle-field strings all take the SELECTED platform, because all
   * three genuinely differ: TikTok handles are written with the `@` and
   * Instagram's are not, and the hint has to name the domain whose links are
   * accepted or it is telling the creator nothing they can act on.
   *
   * `RequestPlatform`, not a boolean — a third platform is then a compile
   * error here rather than a silent "not TikTok, so Instagram".
   */
  handleLabel: (platform: RequestPlatform) => string;
  handlePlaceholder: (platform: RequestPlatform) => string;
  handleHelp: (platform: RequestPlatform) => string;

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
    /** Names the platform the creator actually picked, so the rule it states is the right one. */
    handleInvalid: (platform: RequestPlatform) => string;
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
    "We don't have your profile yet. Tell us your handle and we'll take a look — we review every request by hand and add creators who fit the database.",

  platformLabel: 'Platform',

  handleLabel: (platform) => (platform === 'tiktok' ? 'TikTok handle' : 'Instagram handle'),
  // TikTok handles are written with the @ everywhere TikTok shows them;
  // Instagram's are not. The @ is stripped on the way in either way.
  handlePlaceholder: (platform) => (platform === 'tiktok' ? '@yourhandle' : 'yourhandle'),
  handleHelp: (platform) =>
    platform === 'tiktok'
      ? 'Your username or a tiktok.com link — either works.'
      : 'Your username or an instagram.com link — either works.',

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
    handleRequired: 'Enter your handle.',
    handleInvalid: (platform) =>
      `That doesn't look like a ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} handle. Letters, numbers, periods and underscores only.`,
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
    'Todavía no tenemos tu perfil. Dinos tu usuario y lo revisamos — revisamos cada solicitud a mano y agregamos creadores que encajan en la base de datos.',

  platformLabel: 'Plataforma',

  handleLabel: (platform) => (platform === 'tiktok' ? 'Usuario de TikTok' : 'Usuario de Instagram'),
  handlePlaceholder: (platform) => (platform === 'tiktok' ? '@tuusuario' : 'tuusuario'),
  handleHelp: (platform) =>
    platform === 'tiktok'
      ? 'Tu nombre de usuario o un enlace de tiktok.com — cualquiera sirve.'
      : 'Tu nombre de usuario o un enlace de instagram.com — cualquiera sirve.',

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
    handleRequired: 'Escribe tu usuario.',
    handleInvalid: (platform) =>
      `Eso no parece un usuario de ${platform === 'tiktok' ? 'TikTok' : 'Instagram'}. Solo letras, números, puntos y guiones bajos.`,
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
export function requestErrorMessage(
  locale: Locale,
  reason: string | null | undefined,
  platform: RequestPlatform,
): string {
  const t = getGetListedStrings(locale).errors;
  switch (reason) {
    case 'handle_required':
      return t.handleRequired;
    case 'handle_invalid':
    // invalid_platform cannot come from this form — the <select> offers only
    // the two the route accepts — so it means a hand-rolled POST. Showing the
    // handle rule is the least confusing thing available.
    case 'invalid_platform':
      return t.handleInvalid(platform);
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
