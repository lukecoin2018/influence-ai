"use client";

// Place at: components/creator-dashboard/Sidebar.tsx

import { useState } from "react";
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
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

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
        {/* Logo + toggle */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          borderBottom: "1px solid #F3F4F6",
          minHeight: "64px",
          flexShrink: 0,
        }}>
          {isOpen && (
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "8px",
                backgroundColor: "#FFD700", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontSize: "16px", fontWeight: 800, color: "#3A3A3A" }}>I</span>
              </div>
              <span style={{ fontSize: "15px", fontWeight: 700, color: "#3A3A3A", whiteSpace: "nowrap" }}>
                InfluenceIT
              </span>
            </Link>
          )}

          {!isOpen && (
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              backgroundColor: "#FFD700", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto",
            }}>
              <span style={{ fontSize: "16px", fontWeight: 800, color: "#3A3A3A" }}>I</span>
            </div>
          )}

{!isOpen && (
  <button
    onClick={onToggle}
    style={{
      margin: "16px auto 8px",
      width: "36px", height: "36px", borderRadius: "8px",
      border: "1px solid #E5E7EB", backgroundColor: "#F9FAFB",
      cursor: "pointer", display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
    }}
  >
    <span style={{ fontSize: "14px", color: "#6B7280" }}>▶</span>
  </button>
)}
        </div>

        {/* Collapse button when closed */}
        {!isOpen && (
          <button
            onClick={onToggle}
            style={{
              margin: "8px auto", width: "36px", height: "28px", borderRadius: "6px",
              border: "1px solid #E5E7EB", backgroundColor: "#F9FAFB", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            <span style={{ fontSize: "12px", color: "#6B7280" }}>▶</span>
          </button>
        )}

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
        </nav>

        {/* Bottom: user + sign out */}
        <div style={{
          padding: "12px",
          borderTop: "1px solid #F3F4F6",
          flexShrink: 0,
        }}>
          {isOpen && user?.email && (
            <p style={{
              fontSize: "11px", color: "#9CA3AF", margin: "0 0 8px 0",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              padding: "0 4px",
            }}>
              {user.email}
            </p>
          )}
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
