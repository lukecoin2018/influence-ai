"use client";

// components/creator-dashboard/MobileChrome.tsx
//
// Everything a phone sees around the dashboard content: the top bar, the
// bottom tab bar, and the Tools and Profile sheets. One component, rendered by
// both app/creator-dashboard/layout.tsx and AdminPreviewShell.tsx at the top
// of their <main>, so the preview gets the real chrome rather than a copy.
//
// Mobile-only by construction: the `.cd-mobile` wrapper is `display: none`
// at the desktop breakpoint (sidebar.css). It is still MOUNTED on desktop —
// the stylesheet decides, not JS, for the same no-flash reason sidebar.css
// exists — so nothing in here may fetch or subscribe on mount. The token
// balance arrives as props from the shell's single useCreatorTokens() call;
// the Profile sheet's identity row is fetched lazily on first open, which
// only ever happens on a phone.

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator, Handshake, FileText, Pencil, Paperclip, Globe, LogOut, Coins, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { formatCount } from "@/lib/formatters";
import { useLocale } from "@/lib/i18n/use-locale";
import { getDashboardStrings } from "@/lib/i18n/dashboard-strings";
import type { Locale } from "@/app/claim/[handle]/_strings";
import { navItems, resolveHref, isActiveHref, type NavItem, type NavKey } from "./nav-config";
import { TIER_LABELS, isPaidTier, openSubscriptionPortal } from "./tokens";
import { Sheet, SheetRow } from "./Sheet";
import { MobileTabBar, type SheetName, type TabLink } from "./MobileTabBar";
import { MobileTopBar } from "./MobileTopBar";

interface MobileChromeProps {
  /** creator_profiles.creator_id of the dashboard's creator (the previewed one, in the admin preview). null while unknown. */
  creatorId: string | null;
  tokenBalance: number | null;
  subscriptionTier: string;
  /** Set inside AdminPreviewShell — rewrites the two previewable hrefs, and names the identity row. */
  previewHandle?: string;
  /** The admin preview's compact banner; stacks above the top bar. */
  banner?: ReactNode;
}

/**
 * English by design, and literals rather than string-table keys: these name
 * and describe the three English tools, and lib/i18n/dashboard-strings.ts's
 * header keeps anything that does so out of the table on purpose (a label
 * must not disagree with its destination). Same rule as the sidebar labels.
 */
const TOOL_DESCRIPTIONS: Partial<Record<NavKey, string>> = {
  calculator: "What brands should pay for your size",
  negotiate: "Scripts and counters for brand offers",
  contract: "Draft a deal agreement in minutes",
};

const TOOL_ICONS: Partial<Record<NavKey, ReactNode>> = {
  calculator: <Calculator size={20} strokeWidth={1.75} color="#3A3A3A" />,
  negotiate: <Handshake size={20} strokeWidth={1.75} color="#3A3A3A" />,
  contract: <FileText size={20} strokeWidth={1.75} color="#3A3A3A" />,
  edit: <Pencil size={18} strokeWidth={1.75} color="#3A3A3A" />,
  "media-kit": <Paperclip size={18} strokeWidth={1.75} color="#3A3A3A" />,
};

const TOOLS_KEYS: NavKey[] = ["calculator", "negotiate", "contract"];
const PROFILE_KEYS: NavKey[] = ["edit", "media-kit"];

const chevron = <ChevronRight size={18} strokeWidth={2} color="#9CA3AF" aria-hidden="true" />;

const rowButtonReset: React.CSSProperties = {
  display: "block", width: "100%", background: "none", border: "none", padding: 0, margin: 0,
  cursor: "pointer", textDecoration: "none", color: "inherit", font: "inherit",
};

interface Identity {
  handle: string | null;
  followers: number | null;
}

export function MobileChrome({ creatorId, tokenBalance, subscriptionTier, previewHandle, banner }: MobileChromeProps) {
  const pathname = usePathname();
  const { user, creatorProfile, patchCreatorProfile } = useAuth();
  const locale = useLocale();
  const t = getDashboardStrings(locale);
  const [openSheet, setOpenSheet] = useState<SheetName | null>(null);
  const close = () => setOpenSheet(null);

  // A route change (browser back/forward, or anything that navigates without
  // going through a row or tab handler) lands on a closed sheet. State is
  // adjusted during render rather than in an effect — the pattern React
  // documents for deriving state from a changed prop — so there is no extra
  // commit with a stale open sheet.
  const [sheetPathname, setSheetPathname] = useState(pathname);
  if (sheetPathname !== pathname) {
    setSheetPathname(pathname);
    setOpenSheet(null);
  }

  const items = navItems(t.sidebar);
  const byKey = (key: NavKey): NavItem => items.find((i) => i.key === key)!;
  const tabFor = (key: NavKey, label: string): TabLink => {
    const item = byKey(key);
    const href = resolveHref(item, previewHandle);
    return { key, href, label, active: isActiveHref(pathname, href, item.exact) };
  };

  // Escape closes; body scroll is locked while a sheet is up so the content
  // behind the scrim does not scroll under a thumb.
  useEffect(() => {
    if (!openSheet) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenSheet(null); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openSheet]);

  // Identity row: @handle + follower count, from v_creator_summary — the same
  // view the Overview reads. Fetched once, on the first Profile-sheet open,
  // never on mount (see the header). NULL-tolerant throughout: the row shows
  // the preview handle or nothing, never a placeholder count.
  const [identity, setIdentity] = useState<Identity | null>(null);
  useEffect(() => {
    if (openSheet !== "profile" || identity !== null || !creatorId) return;
    let cancelled = false;
    supabase
      .from("v_creator_summary")
      .select("instagram_handle, tiktok_handle, total_followers")
      .eq("creator_id", creatorId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setIdentity({
          handle: data?.instagram_handle ?? data?.tiktok_handle ?? null,
          followers: typeof data?.total_followers === "number" ? data.total_followers : null,
        });
      });
    return () => { cancelled = true; };
  }, [openSheet, identity, creatorId]);

  // Language: persisted on creator_profiles.locale — the column useLocale()
  // already reads — and patched into AuthContext at the same time so the whole
  // dashboard switches on this render rather than after a reload. In the admin
  // preview there is no creator_profiles row for the signed-in user, so this
  // is a no-op there, by design.
  const [localeSaving, setLocaleSaving] = useState(false);
  async function setLocale(next: Locale) {
    if (next === locale || !user || !creatorProfile || localeSaving) return;
    const prev = creatorProfile.locale ?? null;
    setLocaleSaving(true);
    // useLocale() ranks a ?locale= query above the stored value, so a creator
    // who arrived with one in the URL would see this toggle do nothing. Drop
    // it first — synchronously, via the native History API the app router
    // syncs with — so the re-render the patch below triggers reads a clean URL.
    const url = new URL(window.location.href);
    if (url.searchParams.has("locale")) {
      url.searchParams.delete("locale");
      window.history.replaceState(window.history.state, "", url.toString());
    }
    patchCreatorProfile({ locale: next });
    const { error } = await supabase.from("creator_profiles").update({ locale: next }).eq("id", user.id);
    if (error) {
      console.error("locale update failed:", error);
      patchCreatorProfile({ locale: prev });
    }
    setLocaleSaving(false);
  }

  const [manageLoading, setManageLoading] = useState(false);
  async function handleManage() {
    setManageLoading(true);
    await openSubscriptionPortal();
    setManageLoading(false);
  }

  const paid = isPaidTier(subscriptionTier);
  const zero = tokenBalance === 0;
  const handle = previewHandle ?? identity?.handle ?? null;
  const avatarLetter = (creatorProfile?.display_name ?? handle ?? "").trim().charAt(0).toUpperCase() || "I";

  return (
    <div className="cd-mobile">
      <MobileTopBar
        tokenBalance={tokenBalance}
        subscriptionTier={subscriptionTier}
        tokensLabel={t.mobileNav.tokensAria}
        onOpenProfile={() => setOpenSheet("profile")}
        banner={banner}
      />

      {/* ── Tools sheet ──────────────────────────────────────────────── */}
      <Sheet open={openSheet === "tools"} onClose={close} label={t.mobileNav.toolsTitle} closeLabel={t.mobileNav.close}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "#6B7280", padding: "4px 4px 8px" }}>
          {t.mobileNav.toolsTitle}
        </div>
        {TOOLS_KEYS.map((key) => {
          const item = byKey(key);
          return (
            <Link key={key} href={resolveHref(item, previewHandle)} onClick={close} style={rowButtonReset}>
              <SheetRow icon={TOOL_ICONS[key]} iconBg="#FFF9E0" title={item.label} description={TOOL_DESCRIPTIONS[key]} trailing={chevron} minHeight={60} />
            </Link>
          );
        })}
      </Sheet>

      {/* ── Profile sheet ────────────────────────────────────────────── */}
      <Sheet open={openSheet === "profile"} onClose={close} label={t.mobileNav.tabProfile} closeLabel={t.mobileNav.close}>
        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 4px 14px" }}>
          <span
            aria-hidden="true"
            style={{
              width: "44px", height: "44px", borderRadius: "50%", background: "#F3F4F6", border: "1px solid #E5E7EB",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 800, flexShrink: 0,
            }}
          >
            {avatarLetter}
          </span>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
            <span style={{ fontSize: "15px", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {handle ? `@${handle}` : "—"}
            </span>
            <span style={{ fontSize: "13px", color: "#6B7280" }}>
              {identity?.followers != null ? t.mobileNav.followers(formatCount(identity.followers)) : " "}
            </span>
          </span>
        </div>

        {/* Tokens + plan. English by design — token chrome, see tokens.ts.
            Same three states as the sidebar box: balance, zero+free
            (Subscribe), zero+paid (Buy more); paid creators get Manage. */}
        {tokenBalance !== null && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", borderRadius: "12px",
              background: zero ? "#FEF2F2" : "#FFFBEB",
              border: `1px solid ${zero ? "#FECACA" : "#FFD700"}`,
            }}
          >
            <Coins size={20} strokeWidth={1.75} color={zero ? "#B91C1C" : "#3A3A3A"} aria-hidden="true" />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 }}>
              <span style={{ fontSize: "15px", fontWeight: 700, color: zero ? "#B91C1C" : "#3A3A3A" }}>Tokens {tokenBalance}</span>
              <span style={{ fontSize: "13px", color: "#6B7280" }}>{(TIER_LABELS[subscriptionTier] || "Free") + " plan"}</span>
            </span>
            {paid && !zero ? (
              <button
                type="button"
                onClick={handleManage}
                disabled={manageLoading}
                style={{
                  display: "inline-flex", alignItems: "center", height: "32px", padding: "0 14px", borderRadius: "999px",
                  background: "#FF4D94", color: "#fff", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer",
                }}
              >
                {manageLoading ? "..." : "Manage"}
              </button>
            ) : (
              <Link
                href="/pricing/creators"
                onClick={close}
                style={{
                  display: "inline-flex", alignItems: "center", height: "32px", padding: "0 14px", borderRadius: "999px",
                  background: zero ? "#DC2626" : "#FF4D94", color: "#fff", fontSize: "13px", fontWeight: 700, textDecoration: "none",
                }}
              >
                {zero ? (paid ? "Buy more" : "Subscribe") : "Upgrade"}
              </Link>
            )}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", paddingTop: "6px" }}>
          {PROFILE_KEYS.map((key) => {
            const item = byKey(key);
            return (
              <Link key={key} href={resolveHref(item, previewHandle)} onClick={close} style={rowButtonReset}>
                <SheetRow icon={TOOL_ICONS[key]} iconBg="#F3F4F6" title={item.label} trailing={chevron} minHeight={52} />
              </Link>
            );
          })}

          {/* Language names stay in their own language in both locales — that
              is how a language picker is read. Segmented, not a navigation row. */}
          <SheetRow
            icon={<Globe size={18} strokeWidth={1.75} color="#3A3A3A" />}
            iconBg="#F3F4F6"
            title={t.mobileNav.language}
            minHeight={52}
            trailing={
              <span role="group" aria-label={t.mobileNav.language} style={{ display: "inline-flex", padding: "3px", borderRadius: "999px", background: "#F3F4F6", gap: "2px" }}>
                {(["en", "es"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={locale === l}
                    onClick={() => setLocale(l)}
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", height: "30px", minWidth: "44px",
                      padding: "0 10px", borderRadius: "999px", border: "none", cursor: "pointer",
                      background: locale === l ? "#3A3A3A" : "transparent",
                      color: locale === l ? "#fff" : "#6B7280",
                      fontSize: "12px", fontWeight: 700,
                    }}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </span>
            }
          />
        </div>

        {/* Same sign-out as the sidebar's button (Sidebar.tsx). */}
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          style={{
            width: "100%", border: "none", borderTop: "1px solid #F3F4F6", background: "none", marginTop: "4px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", height: "48px",
            color: "#6B7280", fontSize: "14px", fontWeight: 500, cursor: "pointer", font: "inherit",
          }}
        >
          <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>{t.sidebar.signOut}</span>
        </button>
      </Sheet>

      <MobileTabBar
        navLabel={t.mobileNav.navLabel}
        links={[
          tabFor("overview", t.mobileNav.tabOverview),
          tabFor("brands-hiring", t.mobileNav.tabBrands),
          tabFor("outreach", t.mobileNav.tabOutreach),
        ]}
        toolsLabel={t.mobileNav.tabTools}
        profileLabel={t.mobileNav.tabProfile}
        openSheet={openSheet}
        onOpenSheet={setOpenSheet}
        onNavigate={close}
      />
    </div>
  );
}
