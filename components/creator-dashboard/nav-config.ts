// components/creator-dashboard/nav-config.ts
//
// The ONE list of creator-dashboard destinations. Sidebar.tsx (desktop) and
// MobileChrome.tsx (the bottom tab bar and its two sheets) both read it, so a
// route can never exist in one and not the other. It used to be a private
// function inside Sidebar.tsx; moving it here changed nothing about the
// desktop render — same items, same order, same labels, same icons.

import type { getDashboardStrings } from "@/lib/i18n/dashboard-strings";

type SidebarStrings = ReturnType<typeof getDashboardStrings>["sidebar"];

export type NavKey =
  | "overview"
  | "brands-hiring"
  | "outreach"
  | "calculator"
  | "negotiate"
  | "contract"
  | "edit"
  | "media-kit";

export interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  /** Emoji, desktop sidebar only. The mobile chrome uses lucide icons per key. */
  icon: string;
  exact?: boolean;
}

/**
 * A function of the string table rather than a module-level constant, so the
 * three localized labels resolve per render alongside the five that don't.
 *
 * The split is deliberate and is the whole rule for this file: NAVIGATION
 * CHROME follows the creator's language, TOOL NAMES follow their destinations.
 * Overview, Brands Hiring and Outreach lead to pages that are Spanish, so their
 * labels are translated. The five below them lead to pages that are still
 * English, so their labels stay English literals — a label that disagrees with
 * its own destination is worse than an untranslated one, the same call
 * lib/outreach/ui-strings.ts:24-27 made for "Brands Hiring". Translating those
 * five tools is what should remove the inconsistency; until then, English here
 * is the honest answer.
 */
export function navItems(t: SidebarStrings): NavItem[] {
  return [
    { key: "overview", href: "/creator-dashboard", label: t.navOverview, icon: "📊", exact: true },
    { key: "brands-hiring", href: "/creator-dashboard/brands-hiring", label: t.navBrandsHiring, icon: "🏢" },
    // Not in PREVIEWABLE_ROUTES, so the admin preview leaves this href alone
    // and an admin clicking it bounces out of the preview — same as every
    // other non-previewable route.
    { key: "outreach", href: "/creator-dashboard/outreach", label: t.navOutreach, icon: "✉️" },
    // ── English by design below this line — see the note above. ──
    { key: "calculator", href: "/creator-dashboard/calculator", label: "Rate Calculator", icon: "🧮" },
    { key: "negotiate", href: "/creator-dashboard/negotiate", label: "Negotiation", icon: "🤝" },
    { key: "contract", href: "/creator-dashboard/contract", label: "Contract Builder", icon: "📄" },
    { key: "edit", href: "/creator-dashboard/edit", label: "Edit Profile", icon: "✏️" },
    { key: "media-kit", href: "/creator-dashboard/media-kit", label: "Media Kit", icon: "📎" },
  ];
}

/**
 * Overview and Brands Hiring are the two routes the admin preview actually
 * covers, so those two (and only those two) get rewritten to their
 * preview-route equivalents — every other item keeps its real href.
 */
const PREVIEWABLE_ROUTES: Partial<Record<NavKey, string>> = {
  overview: "",
  "brands-hiring": "/brands-hiring",
};

export function resolveHref(item: Pick<NavItem, "key" | "href">, previewHandle: string | undefined): string {
  if (!previewHandle) return item.href;
  const suffix = PREVIEWABLE_ROUTES[item.key];
  if (suffix == null) return item.href;
  return `/admin/preview/creator/${previewHandle}${suffix}`;
}

/** Same rule for the sidebar and the tab bar: exact for Overview, prefix for the rest. */
export function isActiveHref(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}
