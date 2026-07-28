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
    emailAutoVerified: string;
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
    verificationFailed: string;
    /** Shown when /api/creators/regenerate-code fails and no code can be displayed. */
    codeRegenerationFailed: string;
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
    emailAutoVerified: "Email matches — you'll be auto-verified!",
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
    emailAutoVerified: 'El correo coincide — te verificaremos automáticamente',
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
  },
};

const TABLE: Record<Locale, AuthStrings> = { en, es };

export function getAuthStrings(locale: Locale): AuthStrings {
  return TABLE[locale];
}
