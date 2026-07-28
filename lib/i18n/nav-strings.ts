/**
 * en/es strings for the shared site nav (components/Navigation.tsx).
 *
 * A sibling of lib/i18n/auth-strings.ts rather than a section inside it, for
 * the same reason auth-strings is separate from the teaser table: the nav
 * renders on nearly every route, so importing auth-strings here would ship the
 * entire claim-form and bio-code deck in the shared chrome chunk on every page.
 * There is also nothing to reuse — despite the surface similarity, neither
 * "Log out" nor "Sign up" exists in auth-strings (its closest entry is
 * claimForm.submit, "Create Account"), so nothing would be shared, only paid
 * for.
 *
 * Only the `Locale` type is shared, as a type-only import — still one
 * definition of 'en' | 'es' in the codebase.
 *
 * Neutral Spanish, same register as the other two tables. "InfluenceIT" is a
 * brand name and never appears here.
 */

import type { Locale } from '@/app/claim/[handle]/_strings';

interface NavStrings {
  links: {
    creators: string;
    findCreators: string;
    compare: string;
    discover: string;
    about: string;
  };
  account: {
    myProfile: string;
    /** Shown to a brand with no company_name set — the nav's own fallback, not a brand's name. */
    dashboardFallback: string;
    logIn: string;
    signUp: string;
    /** Mobile menu only; the desktop sign-out control is icon-only and has no label. */
    logOut: string;
  };
}

const en: NavStrings = {
  links: {
    creators: 'Creators',
    findCreators: 'Find Creators',
    compare: 'Compare',
    discover: 'Discover',
    about: 'About',
  },
  account: {
    myProfile: 'My Profile',
    dashboardFallback: 'Dashboard',
    logIn: 'Log in',
    signUp: 'Sign up',
    logOut: 'Log out',
  },
};

const es: NavStrings = {
  links: {
    creators: 'Creadores',
    findCreators: 'Buscar creadores',
    compare: 'Comparar',
    // Matches the breadcrumb the Spanish discover pages already use
    // (app/es/discover/[slug]/page.tsx).
    discover: 'Descubrir',
    about: 'Nosotros',
  },
  account: {
    myProfile: 'Mi perfil',
    // "Panel" throughout, consistent with auth-strings' "Ir al panel".
    dashboardFallback: 'Panel',
    logIn: 'Iniciar sesión',
    // Same wording as auth-strings' claimForm.submit, so the nav CTA and the
    // signup button don't disagree with each other.
    signUp: 'Crear cuenta',
    logOut: 'Cerrar sesión',
  },
};

const TABLE: Record<Locale, NavStrings> = { en, es };

export function getNavStrings(locale: Locale): NavStrings {
  return TABLE[locale];
}
