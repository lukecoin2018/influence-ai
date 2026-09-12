"use client";

// components/creator-dashboard/MobileTopBar.tsx
//
// The 52px mobile header: logo tile + wordmark linking to "/" (this is the
// mobile "back to site"; on desktop the sidebar's logo tile plays that role),
// and the tokens pill on the right, which opens the Profile sheet. Variant A
// from the design — B (no pill) is this file minus one element.
//
// Sticky rather than fixed: it is rendered at the top of the dashboard's
// <main>, which is in normal document flow, so `position: sticky` keeps it at
// the viewport top without the content needing a matching top padding. The
// optional `banner` slot (the admin preview's compact banner) stacks above it
// inside the same sticky block.

import type { ReactNode } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { isPaidTier } from "./tokens";

interface MobileTopBarProps {
  tokenBalance: number | null;
  subscriptionTier: string;
  tokensLabel: string;
  onOpenProfile: () => void;
  banner?: ReactNode;
}

export function MobileTopBar({ tokenBalance, subscriptionTier, tokensLabel, onOpenProfile, banner }: MobileTopBarProps) {
  const zero = tokenBalance === 0;
  // Mirrors the sidebar's two zero-token banners: a free creator is asked to
  // subscribe, a paid one to buy more. English by design — token chrome.
  const zeroLabel = isPaidTier(subscriptionTier) ? "Buy more" : "Subscribe";

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20 }}>
      {banner}
      <header
        style={{
          height: "52px",
          padding: "0 16px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", color: "#3A3A3A" }}>
          <span
            aria-hidden="true"
            style={{
              width: "28px", height: "28px", borderRadius: "8px", background: "#FFD700",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "15px", fontWeight: 800, color: "#3A3A3A",
            }}
          >
            I
          </span>
          <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.01em" }}>InfluenceIT</span>
        </Link>

        {/* Hidden until the balance has loaded — and for good when the signed-in
            user has no creator_profiles row (the admin preview), the same rule
            the sidebar token box follows. Nothing here is ever a placeholder
            number. */}
        {tokenBalance !== null && (
          <button
            type="button"
            aria-label={tokensLabel}
            aria-haspopup="dialog"
            onClick={onOpenProfile}
            style={{
              display: "inline-flex", alignItems: "center", height: "44px", padding: 0,
              marginRight: "-6px", background: "none", border: "none", cursor: "pointer", color: "inherit",
            }}
          >
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: "6px", height: "32px",
                padding: "0 12px 0 10px", borderRadius: "999px",
                border: `1.5px solid ${zero ? "#FECACA" : "#FFD700"}`,
                background: zero ? "#FEF2F2" : "#FFFBEB",
                color: zero ? "#B91C1C" : "#3A3A3A",
                fontSize: "13px", fontWeight: 700,
              }}
            >
              <Coins size={16} strokeWidth={2} aria-hidden="true" />
              <span>{zero ? zeroLabel : tokenBalance}</span>
            </span>
          </button>
        )}
      </header>
    </div>
  );
}
