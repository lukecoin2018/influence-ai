"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

/**
 * The brand dashboard chrome: sidebar and its open/closed state. Previously
 * app/dashboard/layout.tsx — unchanged apart from this comment and the rename.
 * It is now rendered by that layout, which is a server component that requires
 * a session before any of this renders. This file has never contained an auth
 * check and still doesn't; the gate lives in the layout.
 */
export default function DashboardChrome({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#FAFAFA" }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <main style={{
        marginLeft: sidebarOpen ? "240px" : "64px",
        transition: "margin-left 0.2s ease",
        flex: 1, minHeight: "100vh",
      }}>
        {children}
      </main>
    </div>
  );
}