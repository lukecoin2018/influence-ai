/**
 * en/es string table for the creator claim + bio-verification surfaces:
 * the creator form and inline verify step in app/auth/signup/page.tsx, and the
 * standalone app/creator-dashboard/verify/page.tsx.
 *
 * Deliberately separate from app/claim/[handle]/_strings.ts rather than an
 * extension of it: that table's keys (topBar, headline, categoryPills,
 * brandMatchCard…) are teaser-shaped, and importing it here would pull the
 * whole teaser copy deck into the signup bundle for no benefit. Only the
 * `Locale` type is shared, as a type-only import — one definition of
 * 'en' | 'es' in the codebase, and no runtime dependency on the teaser.
 *
 * Same discipline as the teaser table: one shared interface for both locales,
 * so a missing Spanish key is a type error rather than a silent English
 * fallback. Spanish is neutral — written to read naturally to both Latin
 * American and Spanish creators, with "tú" throughout to match the teaser.
 *
 * Presentation characters (✓, 📋, ←, →, emoji) stay in the JSX. Platform names
 * (Instagram, TikTok) and the product name (InfluenceIT) are never translated.
 */

import type { Locale } from '@/app/claim/[handle]/_strings';

export type { Locale };

interface AuthStrings {
  common: {
    loading: string;
    back: string;
  };
  claimForm: {
    title: string;
    subtitle: string;
    handleLabel: string;
    handlePlaceholder: string;
    handleChecking: string;
    handleFound: string;
    handleNotFound: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    submit: string;
    submitting: string;
  };
  /**
   * The bio-code block, shared verbatim by the inline verify step and the
   * standalone verify page — the two render the same instructions. Anything
   * that genuinely differs between them lives in inlineVerify/standaloneVerify
   * below instead.
   *
   * These are the highest-friction strings in the product: someone is reading
   * them while switching to the Instagram or TikTok app. They name the exact
   * in-app labels ("Editar perfil", "Listo", "Guardar") rather than describing
   * them.
   */
  bioCode: {
    /** `platformName` is a brand name — "Instagram" or "TikTok", never translated. */
    addCodePrompt: (platformName: string) => string;
    copyCode: string;
    copied: string;
    instagram: {
      openProfile: string;
      pasteCode: string;
      save: string;
    };
    tiktok: {
      openProfile: string;
      pasteCode: string;
      save: string;
    };
    /** Final step, identical on both platforms. */
    comeBack: string;
    verifyButton: string;
    verifying: string;
  };
  inlineVerify: {
    title: string;
    subtitle: (handle: string) => string;
    /** Mentions the 24h expiry; the standalone page's equivalent deliberately does not. */
    codeNote: string;
  };
  standaloneVerify: {
    title: string;
    subtitle: (handle: string) => string;
    /** No expiry sentence here — this page silently regenerates an expired code. */
    codeNote: string;
    alreadyVerifiedTitle: string;
    alreadyVerifiedBody: string;
    goToDashboard: string;
    backToDashboard: string;
  };
  errors: {
    signupFailed: string;
    handleNotIndexed: string;
    /** Last-resort fallback for a reason code this build doesn't recognise. */
    verificationFailed: string;
    /** Shown when /api/creators/regenerate-code fails and no code can be displayed. */
    codeRegenerationFailed: string;
    /**
     * Someone else already claimed this creator. Returned by
     * /api/creators/claim, which now detects it before creating an auth user —
     * it used to surface as a raw Postgres unique-constraint error.
     */
    alreadyClaimed: string;
    /**
     * One message per failure reason returned by /api/creators/verify-bio.
     * That route returns reason codes and no user-facing prose, so these are
     * the only copy a creator ever sees on a failed check — in their language,
     * which the server's English strings used to override.
     */
    verification: {
      /**
       * The common case. Names both things that actually cause it: not
       * saving, and the platform taking a moment to serve the edited bio.
       */
      codeAbsent: string;
      /** Our side failed. Must not imply the creator did anything wrong. */
      checkUnavailable: string;
      /** Says when they can retry — never "contact support". */
      tooManyAttempts: (minutes: number) => string;
      codeExpired: string;
      invalidCode: string;
      profileNotFound: string;
      /**
       * The session went away between claiming and verifying. Only reachable
       * now that the route resolves identity from the cookie instead of from a
       * profile id in the request body.
       */
      notSignedIn: string;
      /**
       * The profile names no account we can check — creator_id is NULL, or no
       * social_profiles row resolves from it. Structurally impossible for a
       * claim made after this change; possible for a row that predates it.
       */
      handleUnresolved: string;
    };
  };
}

const en: AuthStrings = {
  common: {
    loading: 'Loading...',
    back: 'Back',
  },
  claimForm: {
    title: 'Claim Your Profile',
    subtitle: "We'll verify you own this account before activating your creator dashboard.",
    handleLabel: 'Instagram or TikTok Handle',
    handlePlaceholder: 'yourhandle',
    handleChecking: 'Checking...',
    handleFound: 'Profile found in our database',
    handleNotFound: "Profile not found. You can still sign up and we'll add you.",
    emailLabel: 'Email',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Min. 8 characters',
    submit: 'Create Account',
    submitting: 'Creating account...',
  },
  bioCode: {
    addCodePrompt: (platformName) => `Add this code to your ${platformName} bio:`,
    copyCode: 'Copy Code',
    copied: 'Copied!',
    instagram: {
      openProfile: 'Open Instagram → tap your profile → Edit Profile',
      pasteCode: 'Paste the code anywhere in your bio',
      save: 'Tap Done / Save',
    },
    tiktok: {
      openProfile: 'Open TikTok → tap your profile → Edit Profile',
      pasteCode: 'Paste the code in your bio',
      save: 'Tap Save',
    },
    comeBack: 'Come back and click Verify below',
    verifyButton: "I've added it — Verify Now",
    verifying: 'Checking your bio...',
  },
  inlineVerify: {
    title: 'Account created!',
    subtitle: (handle) => `One more step — verify you own @${handle}`,
    codeNote: 'You can remove the code from your bio once verified. Code expires in 24 hours.',
  },
  standaloneVerify: {
    title: 'Verify Your Profile',
    subtitle: (handle) => `Proving you own @${handle}`,
    codeNote: 'You can remove the code from your bio once verified.',
    alreadyVerifiedTitle: 'Already verified!',
    alreadyVerifiedBody: 'Your profile is verified and active.',
    goToDashboard: 'Go to dashboard',
    backToDashboard: 'Back to dashboard',
  },
  errors: {
    signupFailed: 'Signup failed.',
    handleNotIndexed:
      "We don't have a profile for this handle yet. We'll add you to our database and notify you when your profile is ready.",
    verificationFailed: 'Verification failed. Please try again.',
    codeRegenerationFailed:
      "We couldn't create a new verification code. Reload the page to try again.",
    alreadyClaimed:
      'Someone has already claimed this profile. If that was you, sign in instead of creating a new account.',
    verification: {
      codeAbsent:
        "We couldn't find the code in your bio yet. Check that you tapped Save — and if you just did, wait a minute and try again, because Instagram and TikTok can take a moment to show the change.",
      checkUnavailable:
        "We couldn't check your bio just now — that's a problem on our side, not yours. This didn't count as an attempt. Try again in a few minutes.",
      tooManyAttempts: (minutes) =>
        `That's a lot of tries in a short time. You can try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      codeExpired: 'This code has expired. Reload the page to get a new one.',
      invalidCode:
        "That code doesn't match the one we're expecting. Reload the page to get a fresh one.",
      profileNotFound:
        "We couldn't find your creator profile. Try signing out and back in.",
      notSignedIn:
        'Your session ended before we could check. Sign in again to finish verifying.',
      handleUnresolved:
        "We couldn't work out which account this profile belongs to, so there's nothing for us to check. Signing out and back in may help.",
    },
  },
};

const es: AuthStrings = {
  common: {
    loading: 'Cargando...',
    back: 'Atrás',
  },
  claimForm: {
    title: 'Reclama tu perfil',
    subtitle: 'Verificaremos que esta cuenta es tuya antes de activar tu panel de creador.',
    handleLabel: 'Usuario de Instagram o TikTok',
    handlePlaceholder: 'tuusuario',
    handleChecking: 'Comprobando...',
    handleFound: 'Encontramos tu perfil en nuestra base de datos',
    handleNotFound: 'No encontramos ese perfil. Puedes registrarte igual y lo agregamos.',
    emailLabel: 'Correo electrónico',
    emailPlaceholder: 'tu@ejemplo.com',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Mínimo 8 caracteres',
    submit: 'Crear cuenta',
    submitting: 'Creando tu cuenta...',
  },
  bioCode: {
    addCodePrompt: (platformName) => `Agrega este código a tu biografía de ${platformName}:`,
    copyCode: 'Copiar código',
    copied: '¡Copiado!',
    instagram: {
      openProfile: 'Abre Instagram → toca tu perfil → Editar perfil',
      pasteCode: 'Pega el código en cualquier parte de tu biografía',
      save: 'Toca Listo o Guardar',
    },
    tiktok: {
      openProfile: 'Abre TikTok → toca tu perfil → Editar perfil',
      pasteCode: 'Pega el código en tu biografía',
      save: 'Toca Guardar',
    },
    comeBack: 'Vuelve aquí y toca Verificar abajo',
    verifyButton: 'Ya lo agregué — Verificar ahora',
    verifying: 'Revisando tu biografía...',
  },
  inlineVerify: {
    title: '¡Cuenta creada!',
    subtitle: (handle) => `Un paso más — verifica que @${handle} es tuyo`,
    codeNote:
      'Puedes quitar el código de tu biografía una vez verificado. El código expira en 24 horas.',
  },
  standaloneVerify: {
    title: 'Verifica tu perfil',
    subtitle: (handle) => `Para confirmar que @${handle} es tuyo`,
    codeNote: 'Puedes quitar el código de tu biografía una vez verificado.',
    alreadyVerifiedTitle: '¡Ya estás verificado!',
    alreadyVerifiedBody: 'Tu perfil está verificado y activo.',
    goToDashboard: 'Ir al panel',
    backToDashboard: 'Volver al panel',
  },
  errors: {
    signupFailed: 'No pudimos crear tu cuenta.',
    handleNotIndexed:
      'Todavía no tenemos un perfil para ese usuario. Te agregaremos a nuestra base de datos y te avisaremos cuando tu perfil esté listo.',
    verificationFailed: 'No pudimos verificarte. Inténtalo de nuevo.',
    codeRegenerationFailed:
      'No pudimos crear un código de verificación nuevo. Recarga la página para intentarlo de nuevo.',
    alreadyClaimed:
      'Alguien ya reclamó este perfil. Si fuiste tú, inicia sesión en lugar de crear otra cuenta.',
    verification: {
      codeAbsent:
        'Todavía no encontramos el código en tu biografía. Revisa que hayas tocado Guardar — y si acabas de hacerlo, espera un minuto e inténtalo de nuevo, porque Instagram y TikTok pueden tardar un momento en mostrar el cambio.',
      checkUnavailable:
        'No pudimos revisar tu biografía en este momento — es un problema nuestro, no tuyo. Esto no contó como intento. Inténtalo de nuevo en unos minutos.',
      tooManyAttempts: (minutes) =>
        `Son muchos intentos en poco tiempo. Puedes volver a intentarlo en ${minutes} minuto${minutes === 1 ? '' : 's'}.`,
      codeExpired: 'Este código ya expiró. Recarga la página para obtener uno nuevo.',
      invalidCode:
        'Ese código no coincide con el que esperamos. Recarga la página para obtener uno nuevo.',
      profileNotFound:
        'No encontramos tu perfil de creador. Cierra sesión y vuelve a entrar.',
      notSignedIn:
        'Tu sesión se cerró antes de que pudiéramos revisar. Vuelve a iniciar sesión para terminar la verificación.',
      handleUnresolved:
        'No pudimos determinar a qué cuenta pertenece este perfil, así que no hay nada que podamos revisar. Cerrar sesión y volver a entrar puede ayudar.',
    },
  },
};

const TABLE: Record<Locale, AuthStrings> = { en, es };

export function getAuthStrings(locale: Locale): AuthStrings {
  return TABLE[locale];
}

/** The reason codes /api/creators/verify-bio can return on a failed check. */
export type VerificationReason =
  | 'not_signed_in'
  | 'profile_not_found'
  | 'handle_unresolved'
  | 'invalid_code'
  | 'code_expired'
  | 'too_many_attempts'
  | 'code_absent'
  | 'check_unavailable'
  | 'unexpected';

/** The reason codes /api/creators/claim can return on a failed claim. */
export type ClaimReason =
  | 'handle_missing'
  | 'handle_not_found'
  | 'already_claimed'
  | 'signup_failed'
  | 'unexpected';

/**
 * Maps a claim failure response to localized copy.
 *
 * The sibling of verificationErrorMessage, and it exists for the same reason:
 * that route now returns reason codes rather than `err.message`, which used to
 * put raw Postgres and Supabase text — English, and sometimes a constraint
 * name — in front of Spanish creators.
 *
 * `handle_missing` and `handle_not_found` share one message. The client blocks
 * both before it ever POSTs (see handleStatus in _SignUpForm), so a creator
 * reaching either has bypassed the form or raced a database change, and the
 * distinction wouldn't help them.
 */
export function claimErrorMessage(
  locale: Locale,
  reason: string | null | undefined
): string {
  const t = TABLE[locale].errors;

  switch (reason as ClaimReason) {
    case 'handle_missing':
    case 'handle_not_found':
      return t.handleNotIndexed;
    case 'already_claimed':
      return t.alreadyClaimed;
    case 'signup_failed':
      return t.signupFailed;
    case 'unexpected':
      return t.signupFailed;
    default:
      // Same rationale as the verify-bio mapper below: silent fallback here
      // has already cost one debugging session on the other route.
      console.warn(
        `[auth-strings] Unmapped claim reason: ${JSON.stringify(reason)}. ` +
          'Falling back to the generic message. Usually a stale client bundle ' +
          'running against a newer server — hard-reload before digging further.'
      );
      return t.signupFailed;
  }
}

/**
 * Maps a verify-bio failure response to localized copy.
 *
 * Lives here, as one function, on purpose: the two surfaces that call that
 * route — app/creator-dashboard/verify/page.tsx and the inline verify step in
 * app/auth/signup/page.tsx — previously held byte-identical error-handling
 * expressions, which is exactly the shape that gets half-fixed. Now there is
 * one place to change.
 *
 * `reason` is deliberately typed loose: it arrives from a JSON response, so an
 * older deploy, a proxy error page, or a future reason code this build doesn't
 * know about all land on the generic fallback rather than rendering
 * `undefined`.
 */
export function verificationErrorMessage(
  locale: Locale,
  reason: string | null | undefined,
  minutesRemaining?: unknown
): string {
  const t = TABLE[locale].errors;

  switch (reason as VerificationReason) {
    case 'code_absent':
      return t.verification.codeAbsent;
    case 'check_unavailable':
      return t.verification.checkUnavailable;
    case 'too_many_attempts': {
      // The server always sends a positive integer, but this is untrusted
      // JSON — fall back to the window length rather than printing NaN.
      const minutes =
        typeof minutesRemaining === 'number' && Number.isFinite(minutesRemaining)
          ? Math.max(1, Math.ceil(minutesRemaining))
          : 60;
      return t.verification.tooManyAttempts(minutes);
    }
    case 'code_expired':
      return t.verification.codeExpired;
    case 'invalid_code':
      return t.verification.invalidCode;
    case 'profile_not_found':
      return t.verification.profileNotFound;
    case 'not_signed_in':
      return t.verification.notSignedIn;
    case 'handle_unresolved':
      return t.verification.handleUnresolved;
    // Recognised, and the generic message is the right answer for it — the
    // server sends this for an unhandled 500, where there is nothing specific
    // to say. Listed explicitly so it doesn't trip the warning below.
    case 'unexpected':
      return t.verificationFailed;
    default:
      // Reaching here means the response didn't carry a reason we know, so the
      // creator gets the generic message instead of the specific one. That is
      // silent by design otherwise, and it has already cost one debugging
      // session: a browser running a pre-reason-code bundle against the new
      // server produced exactly this, and the only visible symptom was the
      // wrong copy. Name it in the console so the next occurrence is obvious.
      console.warn(
        `[auth-strings] Unmapped verify-bio reason: ${JSON.stringify(reason)}. ` +
          'Falling back to the generic message. Usually a stale client bundle ' +
          'running against a newer server — hard-reload before digging further.'
      );
      return t.verificationFailed;
  }
}
