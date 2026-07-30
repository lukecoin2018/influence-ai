"use client";

// Place at: components/creator-dashboard/Sidebar.tsx

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLocale } from "@/lib/i18n/use-locale";
import { getDashboardStrings } from "@/lib/i18n/dashboard-strings";
import "./sidebar.css";

type SidebarStrings = ReturnType<typeof getDashboardStrings>["sidebar"];

interface SidebarProps {
  /**
   * `null` means "nobody has chosen" — the default state, in which sidebar.css
   * decides from the viewport and this component renders no width at all. A
   * boolean is an explicit choice by the creator and overrides the viewport.
   * Read it for tooltips and aria only; never for layout, or the server render
   * reintroduces the flash the stylesheet exists to remove.
   */
  isOpen: boolean | null;
  /** Receives the next state, because inverting `null` needs the viewport. */
  onToggle: (next: boolean) => void;
  /**
   * Set only when rendered inside AdminPreviewShell. Overview and Brands
   * Hiring are the two routes the admin preview actually covers, so those
   * two (and only those two) get rewritten to their preview-route
   * equivalents — every other nav item keeps its real href and bounces the
   * admin back out on click, same as before this route existed.
   */
  previewHandle?: string;
}

/**
 * A function of the string table rather than a module-level constant, so the
 * three localized labels resolve per render alongside the five that don't.
 *
 * The split is deliberate and is the whole rule for this file: NAVIGATION
 * CHROME follows the creator's language, TOOL NAMES follow their destinations.
 * Overview, Brands Hiring and Outreach lead to pages that are (or become, in
 * this same change) Spanish, so their labels are translated. The five below
 * them lead to pages that are still English, so their labels stay English
 * literals — a label that disagrees with its own destination is worse than an
 * untranslated one, the same call lib/outreach/ui-strings.ts:24-27 made for
 * "Brands Hiring". Translating those five tools is what should remove the
 * inconsistency; until then, English here is the honest answer.
 */
function navItems(t: SidebarStrings) {
  return [
    { key: "overview", href: "/creator-dashboard", label: t.navOverview, icon: "📊", exact: true },
    { key: "brands-hiring", href: "/creator-dashboard/brands-hiring", label: t.navBrandsHiring, icon: "🏢" },
    // No `key`, so the admin preview leaves this href alone and an admin clicking
    // it bounces out of the preview — same as every other non-previewable route.
    { href: "/creator-dashboard/outreach", label: t.navOutreach, icon: "✉️" },
    // ── English by design below this line — see the note above. ──
    { href: "/creator-dashboard/calculator", label: "Rate Calculator", icon: "🧮" },
    { href: "/creator-dashboard/negotiate", label: "Negotiation", icon: "🤝" },
    { href: "/creator-dashboard/contract", label: "Contract Builder", icon: "📄" },
    { href: "/creator-dashboard/edit", label: "Edit Profile", icon: "✏️" },
    { href: "/creator-dashboard/media-kit", label: "Media Kit", icon: "📎" },
  ];
}

const PREVIEWABLE_ROUTES: Record<string, string> = {
  overview: "",
  "brands-hiring": "/brands-hiring",
};

function resolveHref(item: { key?: string; href: string }, previewHandle: string | undefined): string {
  if (!previewHandle || !item.key) return item.href;
  const suffix = PREVIEWABLE_ROUTES[item.key];
  if (suffix == null) return item.href;
  return `/admin/preview/creator/${previewHandle}${suffix}`;
}

/**
 * English in both locales, along with the rest of the token/plan box below.
 * Tokens exist to gate the five English tools, so the token chrome belongs with
 * them. That is also why `TIER_LABELS[tier] + " Plan"` needs no string key: the
 * concatenation's baked-in English word order never has to survive a
 * translation, because it is never translated.
 */
const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  active: "Active",
};

/**
 * Mirrors sidebar.css's `@media (min-width: 1024px)` so the toggle can invert
 * the default state, and so `title` names the action it will actually perform.
 *
 * Nothing here feeds layout — the stylesheet owns that — so the post-hydration
 * correction on a phone costs an attribute, not a reflow. The subscribe/
 * getSnapshot pair is the same useSyncExternalStore shape as
 * lib/i18n/use-locale.ts, for the same reason: no effect, no second paint.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeToDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    // Server render and hydration. `true` is the honest answer for a no-JS
    // client: the CSS still collapses the sidebar on a phone, but the toggle
    // is a link-free button that does nothing without JS anyway.
    () => true
  );
}

export function Sidebar({ isOpen, onToggle, previewHandle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  // Client component, so it resolves its own strings rather than receiving them
  // as a prop — same approach as components/Navigation.tsx.
  const t = getDashboardStrings(useLocale()).sidebar;
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [manageLoading, setManageLoading] = useState(false);
  const isDesktop = useIsDesktop();
  // Tooltips and aria only — see the note on SidebarProps.isOpen.
  const effectiveOpen = isOpen ?? isDesktop;
  const toggle = useCallback(() => onToggle(!effectiveOpen), [onToggle, effectiveOpen]);

  // Fetch creator token balance + subscription tier + realtime subscription
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    supabase
      .from("creator_profiles")
      .select("token_balance, subscription_tier")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setTokenBalance(data.token_balance ?? 0);
          setSubscriptionTier(data.subscription_tier || "free");
        }
      });

    // Realtime — updates sidebar instantly when any tool deducts tokens
    const channel = supabase
      .channel("creator_token_balance")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "creator_profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          setTokenBalance(newData.token_balance ?? 0);
          if (newData.subscription_tier) {
            setSubscriptionTier(newData.subscription_tier);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const isPaidSubscriber = subscriptionTier && !["free"].includes(subscriptionTier);

  async function handleManageSubscription() {
    setManageLoading(true);
    try {
      const res = await fetch("/api/subscription/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: "creator" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setManageLoading(false);
    }
  }

  return (
    <>
      {/* Mobile overlay. Always mounted now; sidebar.css decides whether it
          shows, so it costs nothing on the server render. */}
      <div
        className="cd-overlay fixed inset-0 z-20"
        style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
        onClick={() => onToggle(false)}
      />

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: "var(--cd-sidebar-w, 240px)",
          backgroundColor: "#fff",
          borderRight: "1px solid #E5E7EB",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          overflow: "hidden",
          zIndex: 30,
          boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          borderBottom: "1px solid #F3F4F6",
          minHeight: "64px",
          flexShrink: 0,
        }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "8px",
            backgroundColor: "#FFD700", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: "16px", fontWeight: 800, color: "#3A3A3A" }}>I</span>
          </div>
          <span style={{
            fontSize: "15px", fontWeight: 700, color: "#3A3A3A", whiteSpace: "nowrap",
            marginLeft: "8px", display: "var(--cd-expanded-inline, inline)",
          }}>
            InfluenceIT
          </span>
        </div>

        {/* Collapse toggle. Directly under the logo, and above the nav, because
            on a phone the sidebar now starts collapsed and this is the control
            that reveals the menu — at the bottom of a 100vh column it sat below
            the fold, so the creator had to scroll to find the way in. */}
        <div style={{ padding: "8px 8px 0", flexShrink: 0 }}>
          <button
            onClick={toggle}
            title={effectiveOpen ? t.collapseTooltip : t.expandTooltip}
            aria-expanded={effectiveOpen}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "var(--cd-item-pad, 9px 10px)",
              justifyContent: "var(--cd-item-justify, flex-start)",
              borderRadius: "8px", background: "none", border: "none",
              color: "#6B7280", cursor: "pointer", width: "100%",
            }}
          >
            <span style={{ fontSize: "16px", display: "var(--cd-expanded-inline, inline)" }}>◀</span>
            <span style={{ fontSize: "16px", display: "var(--cd-collapsed-inline, none)" }}>▶</span>
            <span style={{
              fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap",
              display: "var(--cd-expanded-inline, inline)",
            }}>
              {t.collapse}
            </span>
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto", overflowX: "hidden" }}>
          <p style={{
            fontSize: "10px", fontWeight: 600, color: "#9CA3AF",
            textTransform: "uppercase", letterSpacing: "0.08em",
            padding: "8px 8px 4px", margin: 0,
            display: "var(--cd-expanded-block, block)",
          }}>
            {t.menu}
          </p>

          {navItems(t).map((item) => {
            const { label, icon, exact } = item;
            const href = resolveHref(item, previewHandle);
            const active = isActive(href, exact);
            return (
              <Link
                key={item.key ?? href}
                href={href}
                title={!effectiveOpen ? label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "var(--cd-item-pad, 9px 10px)",
                  justifyContent: "var(--cd-item-justify, flex-start)",
                  borderRadius: "8px",
                  marginBottom: "2px",
                  textDecoration: "none",
                  backgroundColor: active ? "#FFFBEB" : "transparent",
                  border: active ? "1px solid #FDE68A" : "1px solid transparent",
                  transition: "background-color 0.15s",
                }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
                <span style={{
                  fontSize: "13px",
                  fontWeight: active ? 600 : 500,
                  color: active ? "#92400E" : "#4B5563",
                  whiteSpace: "nowrap",
                  display: "var(--cd-expanded-inline, inline)",
                }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Subscription + Tokens Section */}
        <div style={{ borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>

          {/* Zero tokens banner — subscribed creators get buy more option */}
          {tokenBalance === 0 && isPaidSubscriber && (
            <div style={{
              margin: "8px 12px 0",
              padding: "8px 10px",
              borderRadius: "8px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              fontSize: "12px",
              color: "#991B1B",
              lineHeight: 1.4,
              display: "var(--cd-expanded-flex, flex)",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span>No tokens left</span>
              <Link href="/pricing/creators" style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#DC2626",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                Buy more
              </Link>
            </div>
          )}

          {/* Zero tokens banner — free creators get subscribe prompt */}
          {tokenBalance === 0 && !isPaidSubscriber && (
            <div style={{
              margin: "8px 12px 0",
              padding: "8px 10px",
              borderRadius: "8px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              fontSize: "12px",
              color: "#991B1B",
              lineHeight: 1.4,
              display: "var(--cd-expanded-flex, flex)",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <span>No tokens left</span>
              <Link href="/pricing/creators" style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#DC2626",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                Subscribe
              </Link>
            </div>
          )}

          {/* Plan badge + Manage/Upgrade */}
          <div style={{
            padding: "8px 12px 0",
            display: "var(--cd-expanded-flex, flex)",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{
              fontSize: "11px",
              fontWeight: 600,
              color: isPaidSubscriber ? "#FF4D94" : "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}>
              {(TIER_LABELS[subscriptionTier] || "Free") + " Plan"}
            </span>

            {isPaidSubscriber ? (
              <button
                onClick={handleManageSubscription}
                disabled={manageLoading}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#FF4D94",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {manageLoading ? "..." : "Manage"}
              </button>
            ) : (
              <Link
                href="/pricing/creators"
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#FF4D94",
                  textDecoration: "none",
                }}
              >
                Upgrade
              </Link>
            )}
          </div>

          {/* Collapsed: upgrade icon for free users */}
          {!isPaidSubscriber && (
            <div style={{ display: "var(--cd-collapsed-flex, none)", justifyContent: "center", padding: "8px 0 0" }}>
              <Link href="/pricing/creators" title="Upgrade plan" style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "28px", height: "28px", borderRadius: "6px",
                backgroundColor: "#FFF0F6", textDecoration: "none",
                fontSize: "14px",
              }}>
                ⬆
              </Link>
            </div>
          )}

          {/* Token balance */}
          {tokenBalance !== null && (
            <div
              title={!effectiveOpen ? `${tokenBalance} tokens` : undefined}
              style={{
                padding: "var(--cd-token-pad, 8px 12px 10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "var(--cd-item-justify, flex-start)",
              }}
            >
              <div style={{
                display: "var(--cd-expanded-flex, flex)", alignItems: "center", justifyContent: "space-between",
                width: "100%",
                backgroundColor: tokenBalance === 0 ? "#FEE2E2" : tokenBalance <= 30 ? "#FEF3C7" : "#F0FDF4",
                border: `1px solid ${tokenBalance === 0 ? "#FECACA" : tokenBalance <= 30 ? "#FDE68A" : "#BBF7D0"}`,
                borderRadius: "8px",
                padding: "8px 10px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "14px" }}>💰</span>
                  <span style={{
                    fontSize: "12px", fontWeight: 600,
                    color: tokenBalance === 0 ? "#991B1B" : tokenBalance <= 30 ? "#92400E" : "#166534",
                  }}>
                    Tokens
                  </span>
                </div>
                <span style={{
                  fontSize: "13px", fontWeight: 700,
                  color: tokenBalance === 0 ? "#991B1B" : tokenBalance <= 30 ? "#92400E" : "#166534",
                }}>
                  {tokenBalance}
                </span>
              </div>

              <div style={{ position: "relative", display: "var(--cd-collapsed-flex, none)", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "18px" }}>💰</span>
                <span style={{
                  position: "absolute", top: "-4px", right: "-6px",
                  backgroundColor: tokenBalance === 0 ? "#FEE2E2" : tokenBalance <= 30 ? "#FEF3C7" : "#F0FDF4",
                  border: `1px solid ${tokenBalance === 0 ? "#FECACA" : tokenBalance <= 30 ? "#FDE68A" : "#BBF7D0"}`,
                  color: tokenBalance === 0 ? "#991B1B" : tokenBalance <= 30 ? "#92400E" : "#166534",
                  fontSize: "9px", fontWeight: 700,
                  borderRadius: "999px", padding: "0 3px", lineHeight: "14px",
                  minWidth: "14px", textAlign: "center",
                }}>
                  {tokenBalance > 99 ? "99+" : tokenBalance}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom: email + sign out. The collapse toggle used to live here; it
            is now the first control under the logo. */}
        <div style={{
          padding: "12px",
          borderTop: "1px solid #F3F4F6",
          flexShrink: 0,
        }}>
          {/* Email */}
          {user?.email && (
            <p style={{
              fontSize: "11px", color: "#9CA3AF", margin: "0 0 8px 0",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              padding: "0 4px",
              display: "var(--cd-expanded-block, block)",
            }}>
              {user.email}
            </p>
          )}

          {/* Sign out */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/';
            }}
            title={!effectiveOpen ? t.signOut : undefined}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "var(--cd-item-pad, 9px 10px)",
              justifyContent: "var(--cd-item-justify, flex-start)",
              borderRadius: "8px", background: "none", border: "none",
              color: "#6B7280", cursor: "pointer", width: "100%",
            }}
          >
            <span style={{ fontSize: "16px" }}>🚪</span>
            <span style={{
              fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap",
              display: "var(--cd-expanded-inline, inline)",
            }}>
              {t.signOut}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
