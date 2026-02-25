"use client";

// Place at: components/tools/negotiate/Step1Stage.tsx

import { NegotiationStage } from "@/lib/negotiation-types";

const stages: { value: NegotiationStage; label: string; description: string }[] = [
  { value: "initial-offer", label: "First response to brand's initial offer", description: "Brand reached out and you're responding with your rate" },
  { value: "after-counter", label: "Brand countered after my response", description: "You sent your rate, they came back with a different number" },
  { value: "objection", label: "Brand raised objection/pushback", description: "They're questioning your rate or pushing back on price" },
  { value: "stalled", label: "Negotiation is stalled", description: "No response in several days, need to follow up" },
];

interface Step1StageProps {
  selected: NegotiationStage | null;
  onSelect: (stage: NegotiationStage) => void;
}

export function Step1Stage({ selected, onSelect }: Step1StageProps) {
  return (
    <div className="space-y-4">
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>
          What stage are you at?
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          This helps us craft the right tone and approach for your response.
        </p>
      </div>

      <div className="space-y-3">
        {stages.map((stage) => {
          const isSelected = selected === stage.value;
          return (
            <button
              key={stage.value}
              onClick={() => onSelect(stage.value)}
              className="w-full text-left p-4 rounded-xl border-2 transition-all duration-200"
              style={{
                borderColor: isSelected ? '#FFD700' : '#E5E7EB',
                backgroundColor: isSelected ? '#FFFBEB' : '#F9FAFB',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0"
                  style={{
                    borderColor: isSelected ? '#FFD700' : '#D1D5DB',
                    backgroundColor: isSelected ? '#FFD700' : 'transparent',
                  }}
                >
                  {isSelected && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#3A3A3A" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: '#3A3A3A' }}>{stage.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{stage.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
