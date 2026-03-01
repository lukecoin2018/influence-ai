"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/creator-dashboard/Sidebar";

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#FAFAFA" }}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(prev => !prev)} />
      <main style={{
        flex: 1,
        marginLeft: sidebarOpen ? "240px" : "64px",
        transition: "margin-left 0.2s ease",
        minWidth: 0,
      }}>
        <div style={{
          height: "64px", backgroundColor: "#fff", borderBottom: "1px solid #E5E7EB",
          display: "flex", alignItems: "center", justifyContent: "flex-end",
          padding: "0 24px", position: "sticky", top: 0, zIndex: 10,
        }}>
          <a href="/" style={{
            fontSize: "13px", fontWeight: 500, color: "#6B7280", textDecoration: "none",
            padding: "6px 12px", borderRadius: "8px", border: "1px solid #E5E7EB",
            backgroundColor: "#F9FAFB",
          }}>
            ← Back to site
          </a>
        </div>
        <div style={{ padding: "32px 32px 80px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}