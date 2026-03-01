import React from "react";
import { DashboardShell } from "@/components/creator-dashboard/DashboardShell";

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}