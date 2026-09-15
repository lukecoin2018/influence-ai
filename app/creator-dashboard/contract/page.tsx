"use client";

// Place at: app/creator-dashboard/contract/page.tsx

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ContractState, DealType, SelectedClause } from "@/lib/contract";
import { CLAUSE_LIBRARY } from "@/lib/clause-library";
import { DEAL_TYPE_PRESETS } from "@/lib/deal-types";
import { ToolHeader } from "@/components/tools/shared/ToolHeader";
import { ProgressBar } from "@/components/tools/shared/ProgressBar";
import { DealTypeSelector } from "@/components/tools/contract/DealTypeSelector";
import { SectionSelector } from "@/components/tools/contract/SectionSelector";
import { ClauseCustomizer } from "@/components/tools/contract/ClauseCustomizer";
import { ContractPreview } from "@/components/tools/contract/ContractPreview";
import { useCreatorTokenGate } from "@/hooks/useCreatorTokenGate";
import { TokenGateModal } from "@/components/shared/TokenGateModal";
import { track, useTrackOnMount } from "@/lib/dashboard/track";

type BuilderStep = 1 | 2 | 3 | 4;
const STEP_LABELS = ["Deal Type", "Sections", "Customize", "Preview"];

const initialContract: ContractState = {
  dealType: null,
  creatorName: "",
  creatorBusinessName: "",
  brandName: "",
  brandContactName: "",
  selectedSections: [],
  clauses: [],
  createdAt: new Date(),
  lastModified: new Date(),
};

function ContractPageInner() {
  const { user, creatorProfile, userRole } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  useTrackOnMount('tool_opened', { tool: 'contract' });

  const [prefillNote, setPrefillNote] = useState("");
  const [step, setStep] = useState<BuilderStep>(1);
  const [contract, setContract] = useState<ContractState>(initialContract);
  const [saving, setSaving] = useState(false);

  // Token gate — charged once when leaving step 1, same pattern as brand dashboard
  const { checking, blocked, balance, needed, checkAndCharge, dismiss } = useCreatorTokenGate();

  // Auth guard
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (userRole && userRole !== "creator") router.push("/creator-dashboard");
  }, [user, userRole, router]);

  // Pre-fill creator name
  useEffect(() => {
    if (!user) return;
    async function prefill() {
      try {
        const { data } = await supabase
          .from("v_creator_summary")
          .select("display_name")
          .eq("user_id", user!.id)
          .single();
        if (data?.display_name) {
          setContract(prev => ({ ...prev, creatorName: data.display_name }));
        }
      } catch {}
    }
    prefill();
  }, [user]);

  // Pre-fill agreed price + deliverables from negotiation via URL params
  useEffect(() => {
    const agreedPrice = searchParams.get("agreedPrice");
    const deliverables = searchParams.get("deliverables");
    if (!agreedPrice && !deliverables) return;
    setContract(prev => ({
      ...prev,
      negotiatedPrice: Number(agreedPrice),
      negotiatedDeliverables: deliverables || "",
    }));
    setPrefillNote(`✓ Pre-filled from negotiation: $${Number(agreedPrice).toLocaleString()}${deliverables ? ` · ${deliverables}` : ""}`);
  }, [searchParams]);

  // ── Step 1: Deal type selection ──────────────────────────────
  const handleSelectDealType = (dealType: DealType) => {
    setContract(prev => ({ ...prev, dealType, lastModified: new Date() }));
  };

  // ── Token charged here: step 1 → 2, mirrors brand dashboard ─────────────
  const handleDealTypeNext = async () => {
    if (!contract.dealType) return;

    const allowed = await checkAndCharge("creator_contract_builder");
    if (!allowed) return; // TokenGateModal shown via blocked state

    // Auto-select recommended sections for this deal type
    const preset = DEAL_TYPE_PRESETS.find(p => p.id === contract.dealType);
    if (preset && contract.selectedSections.length === 0) {
      setContract(prev => ({
        ...prev,
        selectedSections: preset.recommendedSections,
        lastModified: new Date(),
      }));
    }
    setStep(2);
  };

  // ── Step 2: Section selection ────────────────────────────────
  const handleToggleSection = (sectionId: string) => {
    setContract(prev => {
      const isSelected = prev.selectedSections.includes(sectionId);
      return {
        ...prev,
        selectedSections: isSelected
          ? prev.selectedSections.filter(id => id !== sectionId)
          : [...prev.selectedSections, sectionId],
        clauses: isSelected
          ? prev.clauses.filter(c => c.sectionId !== sectionId)
          : prev.clauses,
        lastModified: new Date(),
      };
    });
  };

  // ── Step 3: Clause customization ────────────────────────────
  const handleSaveClause = (clause: SelectedClause) => {
    setContract(prev => {
      const existingIndex = prev.clauses.findIndex(c => c.sectionId === clause.sectionId);
      const newClauses = existingIndex >= 0
        ? prev.clauses.map((c, i) => i === existingIndex ? clause : c)
        : [...prev.clauses, clause];
      return { ...prev, clauses: newClauses, lastModified: new Date() };
    });
  };

  // ── Step 3 → 4: Save draft and move to preview (token already spent) ─────
  const handleCustomizerNext = async () => {
    // The preview is the produced contract. Deal type and section count only —
    // never brandName, creatorName or clause text.
    track('tool_used', { tool: 'contract', deal_type: contract.dealType, section_count: contract.selectedSections.length });
    if (user) {
      setSaving(true);
      try {
        const partiesClause = contract.clauses.find(c => c.sectionId === "parties");
        await supabase.from("contracts").insert({
          user_id: user.id,
          creator_id: creatorProfile?.id,
          deal_type: contract.dealType,
          brand_name: partiesClause?.variableValues?.brandName || contract.brandName,
          creator_name: partiesClause?.variableValues?.creatorName || contract.creatorName,
          selected_sections: contract.selectedSections,
          clauses: contract.clauses,
          status: "draft",
        });
      } catch {
        // Save failed silently — user can still preview and download
      } finally {
        setSaving(false);
      }
    }
    setStep(4);
  };

  if (!user) return null;

  return (
    <div style={{ backgroundColor: "#FAFAFA", minHeight: "100vh", padding: "24px" }}>
      {blocked && (
        <TokenGateModal
          balance={balance}
          needed={needed}
          toolName="Contract Builder"
          onDismiss={dismiss}
          accountType="creator" 
        />
      )}

      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <ToolHeader
          icon="📄"
          title="Contract Builder"
          description="Generate a professional influencer contract in minutes"
          crumbs={[
            { label: "Dashboard", href: "/creator-dashboard" },
            { label: "Contract Builder" },
          ]}
        />

        {prefillNote && (
          <div style={{ marginBottom: "16px", padding: "10px 16px", backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "10px" }}>
            <p style={{ fontSize: "13px", color: "#92400E", margin: 0 }}>{prefillNote}</p>
          </div>
        )}

        {/* Card */}
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid #E5E7EB",
          borderRadius: "20px",
          padding: "32px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          {step < 4 && (
            <ProgressBar
              currentStep={step}
              totalSteps={3}
              stepLabels={STEP_LABELS.slice(0, 3)}
            />
          )}

{step === 1 && (
  <DealTypeSelector
    selectedDealType={contract.dealType}
    onSelect={handleSelectDealType}
    onNext={handleDealTypeNext}
  />
)}

          {step === 2 && (
            <SectionSelector
              sections={CLAUSE_LIBRARY}
              selectedSections={contract.selectedSections}
              dealType={contract.dealType}
              onToggle={handleToggleSection}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <ClauseCustomizer
              sections={CLAUSE_LIBRARY}
              selectedSections={contract.selectedSections}
              onSaveClause={handleSaveClause}
              onNext={handleCustomizerNext}
              onBack={() => setStep(2)}
            />
          )}
        </div>

        {/* Step 4 preview renders outside the card */}
        {step === 4 && (
          <ContractPreview
            contract={contract}
            onBack={() => setStep(3)}
          />
        )}

        {/* Start over */}
        {step > 1 && step < 4 && (
          <p className="text-center text-xs mt-4" style={{ color: "#9CA3AF" }}>
            <button
              onClick={() => { setContract(initialContract); setStep(1); }}
              style={{ color: "#9CA3AF", textDecoration: "underline" }}
            >
              Start over
            </button>
          </p>
        )}

        {saving && (
          <p className="text-center text-xs mt-3" style={{ color: "#9CA3AF" }}>
            Saving draft...
          </p>
        )}
      </div>
    </div>
  );
}

export default function ContractPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#FAFAFA" }} />}>
      <ContractPageInner />
    </Suspense>
  );
}
