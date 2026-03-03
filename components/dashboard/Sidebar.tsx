"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

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

        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
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