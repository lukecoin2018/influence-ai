"use client";

// Place at: app/creator-dashboard/calculator/page.tsx

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { calculateRate } from "@/lib/calculator-engine";
import { CalculatorInput, CalculatorResult, Niche, Deliverable } from "@/types/calculator";
import { ProgressBar } from "@/components/tools/shared/ProgressBar";
import { ToolHeader } from "@/components/tools/shared/ToolHeader";
import { FormStepBasics } from "@/components/tools/calculator/FormStepBasics";
import { FormStepContent } from "@/components/tools/calculator/FormStepContent";
import { FormStepRights } from "@/components/tools/calculator/FormStepRights";
import { FormStepFinal } from "@/components/tools/calculator/FormStepFinal";
import { ResultsPage } from "@/components/tools/calculator/ResultsPage";

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Basics", "Deliverables", "Rights & Terms", "Final Details"];

const defaultInput: CalculatorInput = {
  followers: 50000,
  engagementRate: 3.5,
  niche: "lifestyle" as Niche,
  deliverables: [],
  usageType: "organic",
  usageDuration: 30,
  hasWhitelisting: false,
  exclusivityDays: 0,
  isLongTermPartnership: false,
  hasPaymentTerms: true,
  revisionRounds: 2,
};

export default function CalculatorPage() {
  const { user, creatorProfile, userRole } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [input, setInput] = useState<CalculatorInput>(defaultInput);
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (userRole && userRole !== "creator") { router.push("/creator-dashboard"); }
  }, [user, userRole, router]);

  // Pre-fill from Supabase using creator's real data
  useEffect(() => {
    if (!user || prefilled) return;
    async function prefill() {
      try {
        // Pull summary view for total followers
        const { data: summary } = await supabase
          .from("v_creator_summary")
          .select("total_followers, display_name")
          .eq("user_id", user!.id)
          .single();

        // Pull social profiles for engagement rates
        const { data: profiles } = await supabase
          .from("social_profiles")
          .select("platform, enrichment_data")
          .eq("creator_id", creatorProfile?.id)
          .not("enrichment_data", "is", null);

        const updates: Partial<CalculatorInput> = {};

        if (summary?.total_followers && summary.total_followers >= 10000) {
          updates.followers = summary.total_followers;
        }

        if (profiles && profiles.length > 0) {
          // Average engagement rates across platforms
          const rates = profiles
            .map(p => p.enrichment_data?.calculated_engagement_rate)
            .filter(Boolean)
            .map(Number);
          if (rates.length > 0) {
            updates.engagementRate = parseFloat(
              (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2)
            );
          }

          // Set a default deliverable based on their main platform
          const platformOrder = ["instagram", "tiktok", "youtube"];
          const mainProfile = profiles.sort(
            (a, b) => platformOrder.indexOf(a.platform) - platformOrder.indexOf(b.platform)
          )[0];
          if (mainProfile && updates.deliverables === undefined) {
            updates.deliverables = [{
              id: Date.now().toString(),
              platform: mainProfile.platform as any,
              contentType: mainProfile.platform === "youtube" ? "integration" :
                mainProfile.platform === "tiktok" ? "video-standard" : "reel-standard",
              quantity: 1,
            }];
          }
        }

        if (Object.keys(updates).length > 0) {
          setInput(prev => ({ ...prev, ...updates }));
        }
        setPrefilled(true);
      } catch (e) {
        // Pre-fill failed silently — defaults are fine
        setPrefilled(true);
      }
    }
    prefill();
  }, [user, creatorProfile, prefilled]);

  const handleChange = (field: string, value: any) => {
    setInput(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 1) return input.followers >= 10000 && input.engagementRate > 0;
    if (step === 2) return input.deliverables.length > 0;
    return true;
  };

  const handleCalculate = async () => {
    const calculatedResult = calculateRate(input);
    setResult(calculatedResult);

    // Save to Supabase in background
    if (user) {
      setSaving(true);
      try {
        await supabase.from("rate_calculations").insert({
          user_id: user.id,
          creator_id: creatorProfile?.id,
          followers: input.followers,
          engagement_rate: input.engagementRate,
          niche: input.niche,
          deliverables: input.deliverables,
          usage_type: input.usageType,
          usage_duration: input.usageDuration,
          has_whitelisting: input.hasWhitelisting,
          exclusivity_days: input.exclusivityDays,
          is_long_term_partnership: input.isLongTermPartnership,
          min_rate: calculatedResult.minRate,
          max_rate: calculatedResult.maxRate,
          recommended_rate: calculatedResult.recommendedRate,
          confidence: calculatedResult.confidence,
          full_result: calculatedResult,
        });
      } catch (e) {
        // Save failed silently — result still shown
      } finally {
        setSaving(false);
      }
    }
  };

  // Loading state while auth resolves
  if (!user) return null;

  // Results view
  if (result) {
    return (
      <ResultsPage
        result={result}
        onBack={() => setResult(null)}
        onStartOver={() => { setResult(null); setInput(defaultInput); setStep(1); }}
      />
    );
  }

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <ToolHeader
          icon="🧮"
          title="Rate Calculator"
          description="Calculate your fair market rate for brand partnerships"
          crumbs={[
            { label: "Dashboard", href: "/creator-dashboard" },
            { label: "Rate Calculator" },
          ]}
        />

        {/* Card */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} stepLabels={STEP_LABELS} />

          {/* Steps */}
          {step === 1 && (
            <FormStepBasics
              followers={input.followers}
              engagementRate={input.engagementRate}
              niche={input.niche}
              onChange={handleChange}
            />
          )}
          {step === 2 && (
            <FormStepContent
              deliverables={input.deliverables}
              onChange={(deliverables) => setInput(prev => ({ ...prev, deliverables }))}
            />
          )}
          {step === 3 && (
            <FormStepRights
              usageType={input.usageType}
              usageDuration={input.usageDuration}
              hasWhitelisting={input.hasWhitelisting}
              exclusivityDays={input.exclusivityDays}
              isLongTermPartnership={input.isLongTermPartnership}
              onChange={handleChange}
            />
          )}
          {step === 4 && (
            <FormStepFinal
              hasPaymentTerms={input.hasPaymentTerms ?? true}
              revisionRounds={input.revisionRounds ?? 2}
              onChange={handleChange}
            />
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
              >
                ← Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  backgroundColor: canProceed() ? '#FF4D94' : '#F9FAFB',
                  color: canProceed() ? '#fff' : '#9CA3AF',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleCalculate}
                disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FFD700, #FF4D94)', color: '#fff' }}
              >
                {saving ? "Calculating..." : "✨ Calculate My Rate"}
              </button>
            )}
          </div>

          {/* Step hints */}
          {step === 2 && input.deliverables.length === 0 && (
            <p className="text-center text-xs mt-3" style={{ color: '#9CA3AF' }}>
              Add at least one deliverable to continue
            </p>
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs mt-4" style={{ color: '#9CA3AF' }}>
          {prefilled ? "✓ Pre-filled with your profile data" : "Using default values"}
          {saving && " · Saving..."}
        </p>
      </div>
    </div>
  );
}
