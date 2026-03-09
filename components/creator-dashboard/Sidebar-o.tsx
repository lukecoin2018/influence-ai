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
}

const NAV_ITEMS = [
  { href: "/creator-dashboard", label: "Overview", icon: "📊", exact: true },
  { href: "/creator-dashboard/calculator", label: "Rate Calculator", icon: "🧮" },
  { href: "/creator-dashboard/negotiate", label: "Negotiation", icon: "🤝" },
  { href: "/creator-dashboard/contract", label: "Contract Builder", icon: "📄" },
  { href: "/creator-dashboard/edit", label: "Edit Profile", icon: "✏️" },
  { href: "/creator-dashboard/media-kit", label: "Media Kit", icon: "📎" },
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  // Fetch creator token balance + realtime subscription
  useEffect(() => {
    if (!user) return;

    // Initial fetch
    supabase
      .from("creator_profiles")
      .select("token_balance")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setTokenBalance(data?.token_balance ?? 0));

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
          setTokenBalance((payload.new as any).token_balance ?? 0);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

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

          {NAV_ITEMS.map(({ href, label, icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
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

          {/* Token balance badge */}
          {tokenBalance !== null && (
            <div
              title={!isOpen ? `${tokenBalance} tokens` : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: isOpen ? "9px 10px" : "9px 0",
                justifyContent: isOpen ? "flex-start" : "center",
                borderRadius: "8px",
                marginTop: "8px",
                backgroundColor: tokenBalance <= 30 ? "#FEF2F2" : "#F0FDF4",
                border: `1px solid ${tokenBalance <= 30 ? "#FECACA" : "#BBF7D0"}`,
              }}
            >
              <span style={{ fontSize: "16px", flexShrink: 0 }}>💰</span>
              {isOpen && (
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: tokenBalance <= 30 ? "#DC2626" : "#15803D",
                      whiteSpace: "nowrap",
                    }}>
                      {tokenBalance} tokens
                    </span>
                    {tokenBalance <= 30 && (
                      <Link
                        href="/pricing/creators"
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#DC2626",
                          textDecoration: "none",
                          whiteSpace: "nowrap",
                          opacity: 0.8,
                        }}
                      >
                        + Add tokens
                      </Link>
                    )}
                  </div>
                  {tokenBalance <= 30 && (
                    <span style={{ fontSize: "10px", color: "#DC2626", whiteSpace: "nowrap" }}>
                      Running low
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

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
