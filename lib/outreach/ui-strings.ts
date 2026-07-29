/**
 * en/es chrome for the outreach page (app/creator-dashboard/outreach) — every
 * word on that page that is NOT part of the message the creator sends. The
 * message bodies themselves live in lib/outreach/messages.ts.
 *
 * A DELIBERATE, SCOPED EXCEPTION to "the dashboard UI is English by design".
 * The exception is this one route and nothing else: every other creator-
 * dashboard surface stays English. It exists because this page is where a
 * creator writes to a brand in their own language, and a page that is half
 * Spanish (the message) and half English (everything around it) reads worse
 * than either language would on its own.
 *
 * Driven by the page's LANGUAGE TOGGLE, not by creator_profiles.locale. The
 * stored locale only seeds the toggle's initial value; after that the toggle
 * wins, because it is the creator's explicit choice for this particular brand
 * and the header must never disagree with the message underneath it.
 *
 * Same Record<Locale, T> shape as lib/i18n/nav-strings.ts and
 * app/claim/[handle]/_strings.ts, so a missing Spanish key is a compile error.
 *
 * Register: "tú" throughout. This addresses the CREATOR, unlike the message
 * table next door, which addresses a brand in formal plural. Neutral Spanish —
 * nothing here should read as either Iberian or region-specific.
 *
 * "Brands Hiring" is left untranslated wherever it names that page: it is the
 * English title of an English screen, and a breadcrumb that disagrees with its
 * own destination is worse than an untranslated one.
 */

import type { Locale } from '@/app/claim/[handle]/_strings';
import type { OutreachStep } from '@/lib/outreach/messages';

interface OutreachUiStrings {
  title: (brandName: string) => string;
  /** For the states with no brand to name — no ?brand=, an unmatched brand, a failed load. */
  titleNoBrand: string;
  subtitle: string;
  loading: string;

  /** When each message is due. Chrome, so the creator sees the whole sequence before sending one. */
  timing: Record<OutreachStep, string>;
  messageTitle: (step: OutreachStep) => string;

  sendTo: string;
  noHandleDetected: (brandName: string) => string;
  multipleHandles: (n: number) => string;

  yourDetails: string;
  fieldName: string;
  fieldHandle: string;
  fieldFollowers: string;
  fieldEngagement: string;
  detailsHint: string;

  sequenceIntro: string;
  resetToGenerated: string;

  copyMessage: string;
  copied: string;
  copiedOpen: (handle: string) => string;
  markAsSent: string;
  marking: string;
  markError: string;
  markedSentAt: (date: string) => string;
  markedTimes: (n: number) => string;
  markedDisclaimer: string;

  pickBrandTitle: string;
  pickBrandBody: string;
  loadFailedTitle: string;
  loadFailedBody: string;
  notMatchedTitle: (brandName: string) => string;
  notMatchedBody: string;
  instagramOnlyTitle: string;
  instagramOnlyBody: string;
  backToBrandsHiring: string;
}

const en: OutreachUiStrings = {
  title: (brandName) => `Contact ${brandName}`,
  titleNoBrand: 'Contact a brand',
  subtitle: 'A three-message sequence, spaced over about two weeks — write the first one now, and the follow-ups are ready when they are due.',
  loading: 'Loading…',

  timing: {
    1: 'Send now',
    2: '5–7 days later',
    3: '5–7 days after that, then stop',
  },
  messageTitle: (step) => (step === 1 ? 'First contact' : `Follow-up ${step - 1}`),

  sendTo: 'Send to',
  noHandleDetected: (brandName) =>
    `We haven't detected an Instagram account for ${brandName}. You can still draft and mark these messages — we just won't record which account you sent them to.`,
  multipleHandles: (n) => `We detected ${n} accounts for this brand. Accounts in your region are listed first.`,

  yourDetails: 'Your details',
  fieldName: 'Name',
  fieldHandle: 'Handle',
  fieldFollowers: 'Followers',
  fieldEngagement: 'Engagement %',
  detailsHint: "Detected from your profile. Change anything here and the messages you haven't edited update with it. Clear a field to leave it out of the message entirely.",

  sequenceIntro: 'Three messages, spaced out. Send the first one now — the follow-ups are already written, so you can see where this goes before you start.',
  resetToGenerated: 'Reset to generated',

  copyMessage: 'Copy message',
  copied: '✓ Copied!',
  copiedOpen: (handle) => `✓ Copied — open @${handle}`,
  markAsSent: 'Mark as sent',
  marking: 'Saving…',
  markError: 'Could not save that — try again.',
  markedSentAt: (date) => `Marked as sent · ${date}`,
  markedTimes: (n) => ` · ${n} times`,
  markedDisclaimer: '“Marked as sent” is your own record — we can’t detect whether a message was actually sent, so nothing here is tracked for you automatically.',

  pickBrandTitle: 'Pick a brand first',
  pickBrandBody: "Open this from any brand in Brands Hiring and we'll draft a message for that brand.",
  loadFailedTitle: "We couldn't load your brand matches",
  loadFailedBody: 'Something went wrong fetching your matches just now. Try again from Brands Hiring.',
  notMatchedTitle: (brandName) => `${brandName} isn't in your matches`,
  notMatchedBody: "This brand isn't currently detected as hiring creators your size — your matches update as we scan more brands.",
  instagramOnlyTitle: 'Instagram only, for now',
  instagramOnlyBody: "Outreach drafting uses your Instagram profile, and we haven't detected one on your account yet.",
  backToBrandsHiring: '← Back to Brands Hiring',
};

const es: OutreachUiStrings = {
  // "Escribir a" rather than "Contactar a": it sidesteps the contactar a
  // (LatAm) / contactar con (Spain) split entirely, and it is the more accurate
  // verb for what this page produces — a DM. Matches the card button that leads
  // here, so the two never disagree.
  title: (brandName) => `Escribir a ${brandName}`,
  titleNoBrand: 'Escribir a una marca',
  subtitle: 'Una secuencia de tres mensajes repartida en unas dos semanas — escribe el primero ahora y los seguimientos quedan listos para cuando toque.',
  loading: 'Cargando…',

  timing: {
    1: 'Envíalo ahora',
    2: '5–7 días después',
    3: '5–7 días más tarde, y ahí lo dejas',
  },
  messageTitle: (step) => (step === 1 ? 'Primer contacto' : `Seguimiento ${step - 1}`),

  sendTo: 'Enviar a',
  noHandleDetected: (brandName) =>
    `No detectamos una cuenta de Instagram para ${brandName}. Igual puedes redactar y marcar estos mensajes — solo que no registraremos a qué cuenta los enviaste.`,
  multipleHandles: (n) => `Detectamos ${n} cuentas para esta marca. Las cuentas de tu región aparecen primero.`,

  yourDetails: 'Tus datos',
  fieldName: 'Nombre',
  fieldHandle: 'Usuario',
  fieldFollowers: 'Seguidores',
  // Left as "Engagement": the loanword is standard in creator and marketing
  // Spanish on both sides of the Atlantic, same call as the message table.
  fieldEngagement: 'Engagement %',
  detailsHint: 'Detectado desde tu perfil. Si cambias algo aquí, se actualizan los mensajes que no hayas editado. Deja un campo vacío para que no aparezca en el mensaje.',

  sequenceIntro: 'Tres mensajes, espaciados en el tiempo. Envía el primero ahora — los seguimientos ya están escritos, así ves a dónde lleva esto antes de empezar.',
  resetToGenerated: 'Volver al original',

  copyMessage: 'Copiar mensaje',
  copied: '✓ ¡Copiado!',
  copiedOpen: (handle) => `✓ Copiado — abrir @${handle}`,
  markAsSent: 'Marcar como enviado',
  marking: 'Guardando…',
  markError: 'No se pudo guardar — inténtalo de nuevo.',
  markedSentAt: (date) => `Marcado como enviado · ${date}`,
  markedTimes: (n) => ` · ${n} veces`,
  markedDisclaimer: '“Marcado como enviado” es tu propio registro — no podemos detectar si un mensaje se envió de verdad, así que aquí no se hace ningún seguimiento automático.',

  pickBrandTitle: 'Primero elige una marca',
  pickBrandBody: 'Abre esta página desde cualquier marca en Brands Hiring y redactamos un mensaje para esa marca.',
  loadFailedTitle: 'No pudimos cargar tus marcas',
  loadFailedBody: 'Algo falló al buscar tus marcas. Inténtalo de nuevo desde Brands Hiring.',
  notMatchedTitle: (brandName) => `${brandName} no está entre tus marcas`,
  notMatchedBody: 'Ahora mismo no detectamos que esta marca esté contratando creadores de tu tamaño — tus marcas se actualizan a medida que escaneamos más.',
  instagramOnlyTitle: 'Solo Instagram, por ahora',
  instagramOnlyBody: 'Esta herramienta usa tu perfil de Instagram, y todavía no detectamos uno en tu cuenta.',
  backToBrandsHiring: '← Volver a Brands Hiring',
};

const TABLE: Record<Locale, OutreachUiStrings> = { en, es };

export function getOutreachUiStrings(locale: Locale): OutreachUiStrings {
  return TABLE[locale];
}
