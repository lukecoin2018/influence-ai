"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "📊", exact: true },
  { href: "/dashboard/budget-calculator", label: "Budget Calculator", icon: "🧮" },
  { href: "/dashboard/brief/campaign-type", label: "Campaign Brief", icon: "📋" },
  { href: "/dashboard/negotiation", label: "Negotiation", icon: "🤝" },
  { href: "/dashboard/contract", label: "Contract Builder", icon: "📄" },
  { href: "/dashboard/shortlists", label: "Shortlists", icon: "⭐" },
];

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  trial: "Free Trial",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [trialExpired, setTrialExpired] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);

  // Fetch token balance + subscription tier + realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    // Initial fetch
    supabase
      .from("brand_profiles")
      .select("token_balance, subscription_tier, trial_ends_at")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setTokenBalance(data.token_balance);
          setSubscriptionTier(data.subscription_tier || "free");

          // Check trial expiry
          if (
            data.subscription_tier === "trial" &&
            data.trial_ends_at &&
            new Date(data.trial_ends_at) < new Date()
          ) {
            setTrialExpired(true);
          }
        }
      });

    // Realtime — updates sidebar instantly when any tool deducts tokens
    const channel = supabase
      .channel("brand_token_balance")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "brand_profiles",
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
  }, [user?.id]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  // Colour the token pill based on balance level
  const getTokenStyle = (balance: number) => {
    if (balance === 0)  return { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA" };
    if (balance <= 20)  return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
    return               { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" };
  };

  const isPaidSubscriber = subscriptionTier && !["free", "trial"].includes(subscriptionTier) && !trialExpired;

  async function handleManageSubscription() {
    setManageLoading(true);
    try {
      const res = await fetch("/api/subscription/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountType: "brand" }),
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
    <aside style={{
      position: "fixed", top: 0, left: 0, height: "100vh",
      width: isOpen ? "240px" : "64px",
      backgroundColor: "#fff", borderRight: "1px solid #E5E7EB",
      display: "flex", flexDirection: "column",
      transition: "width 0.2s ease", overflow: "hidden",
      zIndex: 30, boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
    }}>

      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", borderBottom: "1px solid #F3F4F6",
        minHeight: "64px", flexShrink: 0,
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

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px", overflowY: "auto", overflowX: "hidden" }}>
        {NAV_ITEMS.map(({ href, label, icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href} title={!isOpen ? label : undefined} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: isOpen ? "9px 10px" : "9px 0",
              justifyContent: isOpen ? "flex-start" : "center",
              borderRadius: "8px", marginBottom: "2px", textDecoration: "none",
              backgroundColor: active ? "#FFFBEB" : "transparent",
              border: active ? "1px solid #FDE68A" : "1px solid transparent",
            }}>
              <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
              {isOpen && (
                <span style={{
                  fontSize: "13px", fontWeight: active ? 600 : 500,
                  color: active ? "#92400E" : "#4B5563", whiteSpace: "nowrap",
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

        {/* Zero tokens banner (expanded only) */}
        {isOpen && tokenBalance === 0 && isPaidSubscriber && (
          <div style={{
            margin: "8px 12px 0",
            padding: "8px 10px",
            borderRadius: "8px",
            backgroundColor: "#FFFBEB",
            border: "1px solid #FDE68A",
            fontSize: "12px",
            color: "#92400E",
            lineHeight: 1.4,
          }}>
            You&apos;ve used all your tokens this month. Upgrade for more.
          </div>
        )}

        {/* Trial expired banner */}
        {isOpen && trialExpired && (
          <div style={{
            margin: "8px 12px 0",
            padding: "8px 10px",
            borderRadius: "8px",
            backgroundColor: "#FEE2E2",
            border: "1px solid #FECACA",
            fontSize: "12px",
            color: "#991B1B",
            lineHeight: 1.4,
          }}>
            Your free trial has ended.
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
              color: isPaidSubscriber ? "#3AAFF4" : "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}>
              {trialExpired ? "Trial Expired" : (TIER_LABELS[subscriptionTier] || "Free") + " Plan"}
            </span>

            {isPaidSubscriber ? (
              <button
                onClick={handleManageSubscription}
                disabled={manageLoading}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#3AAFF4",
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
                href="/pricing/brands"
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#3AAFF4",
                  textDecoration: "none",
                }}
              >
                Upgrade
              </Link>
            )}
          </div>
        )}

        {/* Collapsed: upgrade icon */}
        {!isOpen && !isPaidSubscriber && (
          <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 0" }}>
            <Link href="/pricing/brands" title="Upgrade plan" style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "28px", height: "28px", borderRadius: "6px",
              backgroundColor: "#EBF5FF", textDecoration: "none",
              fontSize: "14px",
            }}>
              ⬆
            </Link>
          </div>
        )}

        {/* Token Balance */}
        <div style={{
          padding: isOpen ? "8px 12px 10px" : "8px 0 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: isOpen ? "flex-start" : "center",
        }}>
          {isOpen ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%",
              backgroundColor: getTokenStyle(tokenBalance).bg,
              border: `1px solid ${getTokenStyle(tokenBalance).border}`,
              borderRadius: "8px",
              padding: "8px 10px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "14px" }}>🪙</span>
                <span style={{ fontSize: "12px", fontWeight: 600, color: getTokenStyle(tokenBalance).text }}>
                  Tokens
                </span>
              </div>
              <span style={{
                fontSize: "13px", fontWeight: 700,
                color: getTokenStyle(tokenBalance).text,
              }}>
                {tokenBalance}
              </span>
            </div>
          ) : (
            <div title={`${tokenBalance} tokens`} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "18px" }}>🪙</span>
              <span style={{
                position: "absolute", top: "-4px", right: "-6px",
                backgroundColor: getTokenStyle(tokenBalance).bg,
                border: `1px solid ${getTokenStyle(tokenBalance).border}`,
                color: getTokenStyle(tokenBalance).text,
                fontSize: "9px", fontWeight: 700,
                borderRadius: "999px", padding: "0 3px", lineHeight: "14px",
                minWidth: "14px", textAlign: "center",
              }}>
                {tokenBalance > 99 ? "99+" : tokenBalance}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom */}
      <div style={{ padding: "12px", borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>
        <button onClick={onToggle} style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: isOpen ? "9px 10px" : "9px 0",
          justifyContent: isOpen ? "flex-start" : "center",
          borderRadius: "8px", background: "none", border: "none",
          color: "#6B7280", cursor: "pointer", width: "100%", marginBottom: "4px",
        }}>
          <span style={{ fontSize: "16px" }}>{isOpen ? "◀" : "▶"}</span>
          {isOpen && <span style={{ fontSize: "13px", fontWeight: 500 }}>Collapse</span>}
        </button>

        {isOpen && user?.email && (
          <p style={{
            fontSize: "11px", color: "#9CA3AF", margin: "4px 0 8px",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", padding: "0 4px",
          }}>{user.email}</p>
        )}

        <button
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: isOpen ? "9px 10px" : "9px 0",
            justifyContent: isOpen ? "flex-start" : "center",
            borderRadius: "8px", background: "none", border: "none",
            color: "#6B7280", cursor: "pointer", width: "100%",
          }}>
          <span style={{ fontSize: "16px" }}>🚪</span>
          {isOpen && <span style={{ fontSize: "13px", fontWeight: 500 }}>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
