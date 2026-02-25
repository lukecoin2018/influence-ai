"use client";

// Place at: components/tools/negotiate/Step3Objection.tsx
// Replaces custom <Textarea> with plain styled textarea

import { ObjectionType } from "@/lib/negotiation-types";

const objections: { value: ObjectionType; label: string }[] = [
  { value: "budget-constraints", label: '"That\'s above our budget"' },
  { value: "other-creators-cheaper", label: '"Other creators charge way less"' },
  { value: "maximum-offer", label: '"We can only do $X maximum"' },
  { value: "flexibility-request", label: '"Can you be flexible on price?"' },
  { value: "exposure-offer", label: '"We\'re offering great exposure"' },
  { value: "standard-rate", label: '"This is our standard rate, take it or leave it"' },
  { value: "no-objection", label: "No objection yet (responding to initial offer)" },
  { value: "other", label: "Other (I'll describe it)" },
];

interface Step3ObjectionProps {
  selected: ObjectionType | null;
  customObjection: string;
  onSelect: (objection: ObjectionType) => void;
  onCustomChange: (value: string) => void;
}

export function Step3Objection({ selected, customObjection, onSelect, onCustomChange }: Step3ObjectionProps) {
  return (
    <div className="space-y-3">
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>
          What's the brand's response or objection?
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Select what they said or are likely to say.
        </p>
      </div>

      <div className="space-y-2">
        {objections.map((obj) => {
          const isSelected = selected === obj.value;
          return (
            <button
              key={obj.value}
              onClick={() => onSelect(obj.value)}
              className="w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 flex items-center gap-3"
              style={{
                borderColor: isSelected ? '#FF4D94' : '#E5E7EB',
                backgroundColor: isSelected ? '#FFF0F5' : '#F9FAFB',
              }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{
                  borderColor: isSelected ? '#FF4D94' : '#D1D5DB',
                  backgroundColor: isSelected ? '#FF4D94' : 'transparent',
                }}
              >
                {isSelected && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="font-medium text-sm" style={{ color: '#3A3A3A' }}>{obj.label}</span>
            </button>
          );
        })}
      </div>

      {selected === "other" && (
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
            Describe the objection or response
          </label>
          <textarea
            value={customObjection}
            onChange={(e) => onCustomChange(e.target.value)}
            rows={4}
            placeholder="Example: 'We love your content but our Q1 budget is locked. Can we discuss this for Q2?'"
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none"
            style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#3A3A3A' }}
          />
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Be specific so we can tailor the response</p>
        </div>
      )}
    </div>
  );
}
