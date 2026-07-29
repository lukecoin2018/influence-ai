"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/creator-dashboard/Sidebar";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/use-locale";
import { getDashboardStrings } from "@/lib/i18n/dashboard-strings";

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isVerifyPage = pathname === '/creator-dashboard/verify';
  // The gate's CTA leads to /creator-dashboard/verify, which already reads
  // creator_profiles.locale itself — so this makes the modal agree with the page
  // behind it, rather than putting an English modal in front of a Spanish one.
  const t = getDashboardStrings(useLocale()).layout;

  useEffect(() => {
    async function checkVerification() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data } = await supabase
        .from('creator_profiles')
        .select('claim_status')
        .eq('id', user.id)
        .single();

      setClaimStatus(data?.claim_status ?? null);
      setStatusLoading(false);
    }
    checkVerification();
  }, [router]);

  const isPending = claimStatus === 'pending';

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
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px", position: "sticky", top: 0, zIndex: 10,
        }}>
          <a href="/" style={{
            fontSize: "13px", fontWeight: 500, color: "#6B7280", textDecoration: "none",
            padding: "6px 12px", borderRadius: "8px", border: "1px solid #E5E7EB",
            backgroundColor: "#F9FAFB",
          }}>
            {t.backToSite}
          </a>
        </div>

        <div style={{ padding: "32px 32px 80px", position: "relative" }}>

          {/* Greyed out children when pending — never on the verify page itself,
              since that's the one page a pending creator must be able to use. */}
          <div style={{
            opacity: isPending && !isVerifyPage ? 0.3 : 1,
            pointerEvents: isPending && !isVerifyPage ? 'none' : 'auto',
            filter: isPending && !isVerifyPage ? 'blur(1px)' : 'none',
            transition: 'opacity 0.2s',
          }}>
            {children}
          </div>

          {/* Verification lock overlay */}
          {!statusLoading && isPending && !isVerifyPage && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
              width: '100%',
              maxWidth: '460px',
              padding: '0 24px',
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '40px 36px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                border: '1px solid #E5E7EB',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                <h2 style={{
                  fontSize: '22px', fontWeight: 800, color: '#3A3A3A',
                  margin: '0 0 10px 0', letterSpacing: '-0.02em',
                }}>
                  {t.verifyGateTitle}
                </h2>
                <p style={{
                  fontSize: '14px', color: '#6B7280', margin: '0 0 28px 0',
                  lineHeight: 1.6,
                }}>
                  {t.verifyGateBody}
                </p>
                <Link
                  href="/creator-dashboard/verify"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: '#FFD700',
                    color: '#3A3A3A',
                    fontSize: '15px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  {t.verifyGateCta}
                </Link>
                <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '16px 0 0 0' }}>
                  {t.verifyGateTime}
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
