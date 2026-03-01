import dynamic from "next/dynamic";
import React from "react";

const DashboardShell = dynamic(
  () => import("@/components/creator-dashboard/DashboardShell").then(m => m.DashboardShell),
  { ssr: false }
);

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}