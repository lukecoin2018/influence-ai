"use client";

import { useState } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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