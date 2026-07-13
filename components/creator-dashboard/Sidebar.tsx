"use client";

// Place at: components/creator-dashboard/Sidebar.tsx

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  /**
   * Set only when rendered inside AdminPreviewShell. Overview and Brands
   * Hiring are the two routes the admin preview actually covers, so those
   * two (and only those two) get rewritten to their preview-route
   * equivalents — every other nav item keeps its real href and bounces the
   * admin back out on click, same as before this route existed.
   */
  previewHandle?: string;
}

const NAV_ITEMS = [
  { key: "overview", href: "/creator-dashboard", label: "Overview", icon: "📊", exact: true },
  { key: "brands-hiring", href: "/creator-dashboard/brands-hiring", label: "Brands Hiring", icon: "🏢" },
  { href: "/creator-dashboard/calculator", label: "Rate Calculator", icon: "🧮" },
  { href: "/creator-dashboard/negotiate", label: "Negotiation", icon: "🤝" },
  { href: "/creator-dashboard/contract", label: "Contract Builder", icon: "📄" },
  { href: "/creator-dashboard/edit", label: "Edit Profile", icon: "✏️" },
  { href: "/creator-dashboard/media-kit", label: "Media Kit", icon: "📎" },
];

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

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  active: "Active",
};

export function Sidebar({ isOpen, onToggle, previewHandle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [manageLoading, setManageLoading] = useState(false);

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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: isOpen ? "240px" : "64px",
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
          {isOpen && (
            <span style={{ fontSize: "15px", fontWeight: 700, color: "#3A3A3A", whiteSpace: "nowrap", marginLeft: "8px" }}>
              InfluenceIT
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto", overflowX: "hidden" }}>
          {isOpen && (
            <p style={{
              fontSize: "10px", fontWeight: 600, color: "#9CA3AF",
              textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "8px 8px 4px", margin: 0,
            }}>
              Menu
            </p>
          )}

          {NAV_ITEMS.map((item) => {
            const { label, icon, exact } = item;
            const href = resolveHref(item, previewHandle);
            const active = isActive(href, exact);
            return (
              <Link
                key={item.key ?? href}
                href={href}
                title={!isOpen ? label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: isOpen ? "9px 10px" : "9px 0",
                  justifyContent: isOpen ? "flex-start" : "center",
                  borderRadius: "8px",
                  marginBottom: "2px",
                  textDecoration: "none",
                  backgroundColor: active ? "#FFFBEB" : "transparent",
                  border: active ? "1px solid #FDE68A" : "1px solid transparent",
                  transition: "background-color 0.15s",
                }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
                {isOpen && (
                  <span style={{
                    fontSize: "13px",
                    fontWeight: active ? 600 : 500,
                    color: active ? "#92400E" : "#4B5563",
                    whiteSpace: "nowrap",
                  }}>
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Subscription + Tokens Section */}
        <div style={{ borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>

          {/* Zero tokens banner — subscribed creators get buy more option */}
          {isOpen && tokenBalance === 0 && isPaidSubscriber && (
            <div style={{
              margin: "8px 12px 0",
              padding: "8px 10px",
              borderRadius: "8px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              fontSize: "12px",
              color: "#991B1B",
              lineHeight: 1.4,
              display: "flex",
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
          {isOpen && tokenBalance === 0 && !isPaidSubscriber && (
            <div style={{
              margin: "8px 12px 0",
              padding: "8px 10px",
              borderRadius: "8px",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              fontSize: "12px",
              color: "#991B1B",
              lineHeight: 1.4,
              display: "flex",
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
          {isOpen && (
            <div style={{
              padding: "8px 12px 0",
              display: "flex",
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
          )}

          {/* Collapsed: upgrade icon for free users */}
          {!isOpen && !isPaidSubscriber && (
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
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
              title={!isOpen ? `${tokenBalance} tokens` : undefined}
              style={{
                padding: isOpen ? "8px 12px 10px" : "8px 0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: isOpen ? "flex-start" : "center",
              }}
            >
              {isOpen ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
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
              ) : (
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              )}
            </div>
          )}
        </div>

        {/* Bottom: collapse + email + sign out */}
        <div style={{
          padding: "12px",
          borderTop: "1px solid #F3F4F6",
          flexShrink: 0,
        }}>
          {/* Collapse toggle */}
          <button
            onClick={onToggle}
            title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: isOpen ? "9px 10px" : "9px 0",
              justifyContent: isOpen ? "flex-start" : "center",
              borderRadius: "8px", background: "none", border: "none",
              color: "#6B7280", cursor: "pointer", width: "100%",
              marginBottom: "4px",
            }}
          >
            <span style={{ fontSize: "16px" }}>{isOpen ? "◀" : "▶"}</span>
            {isOpen && (
              <span style={{ fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap" }}>
                Collapse
              </span>
            )}
          </button>

          {/* Email */}
          {isOpen && user?.email && (
            <p style={{
              fontSize: "11px", color: "#9CA3AF", margin: "4px 0 8px 0",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              padding: "0 4px",
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
            title={!isOpen ? "Sign out" : undefined}
            style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: isOpen ? "9px 10px" : "9px 0",
              justifyContent: isOpen ? "flex-start" : "center",
              borderRadius: "8px", background: "none", border: "none",
              color: "#6B7280", cursor: "pointer", width: "100%",
            }}
          >
            <span style={{ fontSize: "16px" }}>🚪</span>
            {isOpen && (
              <span style={{ fontSize: "13px", fontWeight: 500, whiteSpace: "nowrap" }}>
                Sign out
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
