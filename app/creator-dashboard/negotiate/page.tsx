"use client";

// Place at: app/creator-dashboard/negotiate/page.tsx

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { generateResponseOptions } from "@/lib/negotiation-template-matcher";
import {
  NegotiationInput,
  NegotiationStage,
  ObjectionType,
  FlexibilityLevel,
  ResponseOption,
} from "@/lib/negotiation-types";
import { ProgressBar } from "@/components/tools/shared/ProgressBar";
import { ToolHeader } from "@/components/tools/shared/ToolHeader";
import { GapAnalysis } from "@/components/tools/negotiate/GapAnalysis";
import { Step1Stage } from "@/components/tools/negotiate/Step1Stage";
import { Step2Numbers } from "@/components/tools/negotiate/Step2Numbers";
import { Step3Objection } from "@/components/tools/negotiate/Step3Objection";
import { Step4Flexibility } from "@/components/tools/negotiate/Step4Flexibility";
import { ResponseOptions } from "@/components/tools/negotiate/ResponseOptions";

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Stage", "Numbers", "Objection", "Flexibility"];

interface FormState {
  stage: NegotiationStage | null;
  fairRate: string;
  brandOffer: string;
  deliverables: string;
  usageRights: string;
  exclusivity: string;
  objectionType: ObjectionType | null;
  customObjection: string;
  flexibility: FlexibilityLevel | null;
  creatorName: string;
  brandName: string;
}

const defaultForm: FormState = {
  stage: null,
  fairRate: "",
  brandOffer: "",
  deliverables: "",
  usageRights: "organic only",
  exclusivity: "none",
  objectionType: null,
  customObjection: "",
  flexibility: null,
  creatorName: "",
  brandName: "",
};

export default function NegotiatePage() {
  const { user, creatorProfile, userRole } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [options, setOptions] = useState<ResponseOption[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (userRole && userRole !== "creator") router.push("/creator-dashboard");
  }, [user, userRole, router]);

  // Pre-fill from calculator via URL params or latest saved calculation
  useEffect(() => {
    if (!user) return;

    // Check URL params first (passed from ResultsPage "Use Rate in Negotiation" button)
    const rateParam = searchParams.get("rate");
    const deliverablesParam = searchParams.get("deliverables");

    if (rateParam) {
      setForm(prev => ({
        ...prev,
        fairRate: rateParam,
        deliverables: deliverablesParam || prev.deliverables,
      }));
      return;
    }

    // Otherwise pull latest calculation from Supabase
    async function prefill() {
      try {
        const { data } = await supabase
          .from("rate_calculations")
          .select("recommended_rate, deliverables, full_result")
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (data) {
          const deliverablesList = Array.isArray(data.deliverables)
            ? data.deliverables
                .map((d: any) => `${d.quantity}x ${d.platform} ${d.contentType}`)
                .join(", ")
            : "";

          const usageType = data.full_result?.input?.usageType || "organic";
          const usageDuration = data.full_result?.input?.usageDuration || 30;
          const exclusivityDays = data.full_result?.input?.exclusivityDays || 0;

          setForm(prev => ({
            ...prev,
            fairRate: data.recommended_rate?.toString() || "",
            deliverables: deliverablesList,
            usageRights: `${usageType === "paid" ? "organic + paid" : "organic"}, ${usageDuration === 9999 ? "perpetual" : usageDuration + "-day"}`,
            exclusivity: exclusivityDays > 0 ? `${exclusivityDays}-day exclusivity` : "none",
          }));
        }
      } catch {
        // No previous calculation — defaults are fine
      }

      // Also pre-fill creator name
      try {
        const { data: summary } = await supabase
          .from("v_creator_summary")
          .select("display_name")
          .eq("user_id", user!.id)
          .single();
        if (summary?.display_name) {
          setForm(prev => ({ ...prev, creatorName: summary.display_name }));
        }
      } catch {}
    }

    prefill();
  }, [user, searchParams]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    if (step === 2) {
      const newErrors: typeof errors = {};
      if (!form.fairRate || Number(form.fairRate) <= 0) newErrors.fairRate = "Enter your fair rate";
      if (!form.brandOffer || Number(form.brandOffer) <= 0) newErrors.brandOffer = "Enter the brand's offer";
      if (!form.deliverables.trim()) newErrors.deliverables = "Describe your deliverables";
      if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return false; }
    }
    return true;
  };

  const canProceed = (): boolean => {
    if (step === 1) return !!form.stage;
    if (step === 2) return !!form.fairRate && !!form.brandOffer && !!form.deliverables;
    if (step === 3) return !!form.objectionType;
    if (step === 4) return !!form.flexibility;
    return true;
  };

  const handleGenerate = async () => {
    if (!form.stage || !form.objectionType || !form.flexibility) return;

    const input: NegotiationInput = {
      stage: form.stage,
      fairRate: Number(form.fairRate),
      brandOffer: Number(form.brandOffer),
      deliverables: form.deliverables,
      usageRights: form.usageRights,
      exclusivity: form.exclusivity,
      objectionType: form.objectionType,
      customObjection: form.customObjection,
      flexibility: form.flexibility,
      creatorName: form.creatorName,
      brandName: form.brandName,
    };

    const generatedOptions = generateResponseOptions(input);
    setOptions(generatedOptions);

    // Save to Supabase
    if (user) {
      setSaving(true);
      try {
        await supabase.from("negotiations").insert({
          user_id: user.id,
          creator_id: creatorProfile?.id,
          brand_offer: Number(form.brandOffer),
          fair_rate: Number(form.fairRate),
          stage: form.stage,
          objection_type: form.objectionType,
          flexibility_level: form.flexibility,
          deliverables_description: form.deliverables,
          usage_rights: form.usageRights,
          exclusivity: form.exclusivity,
          status: "draft",
        });
      } catch {
        // Save failed silently
      } finally {
        setSaving(false);
      }
    }
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
    } else {
      handleGenerate();
    }
  };

  if (!user) return null;

  // Results view
  if (options) {
    return (
      <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', padding: '24px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <ToolHeader
            icon="🤝"
            title="Negotiation Assistant"
            description="Your personalized response options"
            crumbs={[
              { label: "Dashboard", href: "/creator-dashboard" },
              { label: "Negotiation Assistant", href: "/creator-dashboard/negotiate" },
              { label: "Results" },
            ]}
          />
          <ResponseOptions
            options={options}
            onBack={() => { setOptions(null); setStep(1); setForm(defaultForm); }}
            fairRate={Number(form.fairRate)}
            brandOffer={Number(form.brandOffer)}
          />
        </div>
      </div>
    );
  }

  const fairRateNum = Number(form.fairRate);
  const brandOfferNum = Number(form.brandOffer);
  const showGapAnalysis = step >= 2 && fairRateNum > 0 && brandOfferNum > 0;

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <ToolHeader
          icon="🤝"
          title="Negotiation Assistant"
          description="Get professional email responses for any brand negotiation"
          crumbs={[
            { label: "Dashboard", href: "/creator-dashboard" },
            { label: "Negotiation Assistant" },
          ]}
        />

        {/* Gap analysis — shown inline between step headers once numbers are entered */}
        {showGapAnalysis && (
          <GapAnalysis fairRate={fairRateNum} brandOffer={brandOfferNum} />
        )}

        {/* Card */}
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #E5E7EB',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} stepLabels={STEP_LABELS} />

          {step === 1 && (
            <Step1Stage
              selected={form.stage}
              onSelect={(stage) => setForm(prev => ({ ...prev, stage }))}
            />
          )}
          {step === 2 && (
            <Step2Numbers
              fairRate={form.fairRate}
              brandOffer={form.brandOffer}
              deliverables={form.deliverables}
              usageRights={form.usageRights}
              exclusivity={form.exclusivity}
              onChange={handleChange}
              errors={errors}
            />
          )}
          {step === 3 && (
            <Step3Objection
              selected={form.objectionType}
              customObjection={form.customObjection}
              onSelect={(objectionType) => setForm(prev => ({ ...prev, objectionType }))}
              onCustomChange={(customObjection) => setForm(prev => ({ ...prev, customObjection }))}
            />
          )}
          {step === 4 && (
            <Step4Flexibility
              selected={form.flexibility}
              onSelect={(flexibility) => setForm(prev => ({ ...prev, flexibility }))}
            />
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-3 rounded-xl font-semibold text-sm"
                style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
              style={{
                background: canProceed() && !saving
                  ? step === TOTAL_STEPS
                    ? 'linear-gradient(135deg, #FFD700, #FF4D94)'
                    : '#FF4D94'
                  : '#F9FAFB',
                color: canProceed() && !saving ? '#fff' : '#9CA3AF',
                cursor: canProceed() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {step === TOTAL_STEPS
                ? saving ? "Generating..." : "✨ Generate My Responses"
                : "Next →"}
            </button>
          </div>
        </div>

        {/* Pre-fill note */}
        {(form.fairRate || form.deliverables) && (
          <p className="text-center text-xs mt-4" style={{ color: '#9CA3AF' }}>
            ✓ Pre-filled from your last rate calculation
          </p>
        )}
      </div>
    </div>
  );
}
