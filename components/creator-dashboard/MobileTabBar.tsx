"use client";

// components/creator-dashboard/MobileTabBar.tsx
//
// The five-tab bottom bar. Three tabs navigate (Overview, Brands, Outreach —
// the same hrefs as the desktop sidebar, from nav-config.ts), two open a sheet
// (Tools, Profile — the sheets live in MobileChrome.tsx, which owns the open
// state and passes it in). Mobile-only by construction: rendered inside the
// `.cd-mobile` wrapper that sidebar.css hides at the desktop breakpoint.

import type { ReactNode } from "react";
import Link from "next/link";
import { Home, Building2, Send, Sparkles, CircleUser } from "lucide-react";
import { TAB_BAR_HEIGHT } from "./Sheet";

export type SheetName = "tools" | "profile";

export interface TabLink {
  key: string;
  href: string;
  label: string;
  active: boolean;
}

interface MobileTabBarProps {
  navLabel: string;
  /** Overview, Brands, Outreach — in that order, hrefs already resolved for the admin preview. */
  links: [TabLink, TabLink, TabLink];
  toolsLabel: string;
  profileLabel: string;
  openSheet: SheetName | null;
  onOpenSheet: (sheet: SheetName) => void;
  /** A route tab was tapped — the owner closes whichever sheet is open. */
  onNavigate: () => void;
}

const ICON_SIZE = 22;
const ICON_STROKE = 1.75;

const LINK_ICONS: Record<string, ReactNode> = {
  overview: <Home size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
  "brands-hiring": <Building2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
  outreach: <Send size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  height: "50px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "3px",
  background: "none",
  border: "none",
  padding: 0,
  margin: 0,
  cursor: "pointer",
  textDecoration: "none",
  minWidth: 0,
};

function TabBody({ icon, label, active }: { icon: ReactNode; label: string; active: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          width: "56px", height: "30px", borderRadius: "15px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: active ? "#FFD700" : "transparent",
          color: active ? "#3A3A3A" : "#6B7280",
          transition: "background-color 0.15s",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.01em", lineHeight: 1.2,
          color: active ? "#3A3A3A" : "#9CA3AF",
          whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
        }}
      >
        {label}
      </span>
    </>
  );
}

export function MobileTabBar({ navLabel, links, toolsLabel, profileLabel, openSheet, onOpenSheet, onNavigate }: MobileTabBarProps) {
  // While a sheet is open, its tab is the active one and the route tabs go
  // quiet — the sheet is what the creator is looking at.
  const sheetOpen = openSheet !== null;

  return (
    <nav
      aria-label={navLabel}
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 30,
        height: TAB_BAR_HEIGHT,
        padding: "6px 8px env(safe-area-inset-bottom, 0px)",
        boxSizing: "border-box",
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderTop: "1px solid #E5E7EB",
        display: "flex",
        alignItems: "flex-start",
      }}
    >
      {links.map((link) => {
        const active = !sheetOpen && link.active;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            style={tabStyle}
          >
            <TabBody icon={LINK_ICONS[link.key]} label={link.label} active={active} />
          </Link>
        );
      })}

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={openSheet === "tools"}
        onClick={() => onOpenSheet("tools")}
        style={tabStyle}
      >
        <TabBody
          icon={<Sparkles size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
          label={toolsLabel}
          active={openSheet === "tools"}
        />
      </button>

      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={openSheet === "profile"}
        onClick={() => onOpenSheet("profile")}
        style={tabStyle}
      >
        <TabBody
          icon={<CircleUser size={ICON_SIZE} strokeWidth={ICON_STROKE} />}
          label={profileLabel}
          active={openSheet === "profile"}
        />
      </button>
    </nav>
  );
}
