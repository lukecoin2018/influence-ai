"use client";

// components/creator-dashboard/Sheet.tsx
//
// One bottom sheet, two instances (Tools and Profile, in MobileChrome.tsx).
// Mobile-only by construction: it is rendered inside the `.cd-mobile` wrapper,
// which sidebar.css hides at the desktop breakpoint.
//
// Always mounted, never conditionally rendered: the slide is a CSS transform
// transition and an unmounted element cannot animate out. While closed it is
// `inert` (no focus, no taps) and `visibility: hidden` after the slide ends,
// so it costs nothing and catches nothing. No animation library — see the
// spec in design-handoff/mobile-nav.

import type { ReactNode } from "react";

/** The tab bar's height: 56px of content plus the home-indicator inset. The sheet sits directly on top of it. */
export const TAB_BAR_HEIGHT = "calc(56px + env(safe-area-inset-bottom, 0px))";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog. */
  label: string;
  /** Accessible name of the scrim button. */
  closeLabel: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, label, closeLabel, children }: SheetProps) {
  return (
    <>
      {/* Scrim. A button, so it is a real tap target with a name — and so a
          keyboard user can dismiss with Enter as well as Escape. */}
      <button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        inert={!open}
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: TAB_BAR_HEIGHT,
          zIndex: 25,
          border: "none",
          padding: 0,
          margin: 0,
          background: "rgba(20,18,12,0.45)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
          cursor: "default",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        inert={!open}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: TAB_BAR_HEIGHT,
          zIndex: 26,
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -8px 24px rgba(20,18,12,0.10)",
          padding: "0 16px 12px",
          maxHeight: "calc(100dvh - 56px - env(safe-area-inset-bottom, 0px) - 40px)",
          overflowY: "auto",
          transform: open ? "translateY(0)" : "translateY(110%)",
          visibility: open ? "visible" : "hidden",
          transition: open
            ? "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)"
            : "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), visibility 0s linear 0.25s",
        }}
      >
        {/* Drag handle — decorative; the sheet closes on scrim tap, Escape or row navigation. */}
        <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "2px", background: "#D1D5DB" }} />
        </div>
        {children}
      </div>
    </>
  );
}

/** A tappable list row: 40px icon square, title, optional description, chevron. Shared by both sheets. */
export function SheetRow({
  icon,
  iconBg,
  title,
  description,
  trailing,
  minHeight,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  description?: string;
  trailing: ReactNode;
  minHeight: number;
}) {
  return (
    <span
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        minHeight: `${minHeight}px`,
        padding: description ? "8px 4px" : "6px 4px",
        color: "#3A3A3A",
        textAlign: "left",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: "40px", height: "40px", borderRadius: "12px", background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
        <span style={{ fontSize: "15px", fontWeight: description ? 700 : 600 }}>{title}</span>
        {description && <span style={{ fontSize: "13px", color: "#6B7280" }}>{description}</span>}
      </span>
      {trailing}
    </span>
  );
}
