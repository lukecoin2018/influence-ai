"use client";

// Place at: components/tools/contract/SectionSelector.tsx
// Import changes: @/contexts/ContractContext → props, @/data/* → @/lib/*

import { ContractSection, DealType } from "@/lib/contract-types";
import { DEAL_TYPE_PRESETS } from "@/lib/deal-types";

interface SectionSelectorProps {
  sections: ContractSection[];
  selectedSections: string[];
  dealType: DealType | null;
  onToggle: (sectionId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SectionSelector({
  sections,
  selectedSections,
  dealType,
  onToggle,
  onNext,
  onBack,
}: SectionSelectorProps) {
  const dealTypePreset = DEAL_TYPE_PRESETS.find(p => p.id === dealType);
  const recommendedSectionIds = dealTypePreset?.recommendedSections || [];
  const optionalSectionIds = dealTypePreset?.optionalSections || [];

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const canProceed = selectedSections.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#3A3A3A' }}>
          Choose Your Contract Sections
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Pre-selected recommended sections for a{' '}
          <span style={{ color: '#FFD700', fontWeight: 600 }}>{dealTypePreset?.name}</span>.
          {' '}Add or remove as needed.
        </p>
      </div>

      {/* Sections list */}
      <div className="space-y-3 mb-8">
        {sortedSections.map((section) => {
          const isSelected = selectedSections.includes(section.id);
          const isRecommended = recommendedSectionIds.includes(section.id);
          const isOptional = optionalSectionIds.includes(section.id);
          const isRequired = section.required;

          return (
            <div
              key={section.id}
              className="p-5 rounded-xl border-2 transition-all duration-200"
              style={{
                borderColor: isSelected ? '#FFD700' : '#E5E7EB',
                backgroundColor: isSelected ? '#FFFBEB' : '#F9FAFB',
              }}
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                <button
                  onClick={() => onToggle(section.id)}
                  className="mt-0.5 w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: isSelected ? '#FFD700' : '#D1D5DB',
                    backgroundColor: isSelected ? '#FFD700' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {isSelected && (
                    <span style={{ color: '#3A3A3A', fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-sm" style={{ color: '#3A3A3A' }}>
                      {section.order}. {section.title}
                    </h3>

                    {/* Badges */}
                    {isRequired && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{ backgroundColor: '#FFF0F5', color: '#FF4D94', border: '1px solid #FBCFE8' }}>
                        Required
                      </span>
                    )}
                    {isRecommended && !isRequired && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{ backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                        Recommended
                      </span>
                    )}
                    {isOptional && (
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full"
                        style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                        Optional
                      </span>
                    )}
                  </div>

                  <p className="text-xs mb-1" style={{ color: '#6B7280' }}>
                    {section.description}
                  </p>

                  {/* Why this matters — shown when selected */}
                  {isSelected && (
                    <div className="mt-2 p-3 rounded-lg text-xs"
                      style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <span className="font-semibold" style={{ color: '#92400E' }}>Why this matters: </span>
                      <span style={{ color: '#78350F' }}>{section.explanation}</span>
                    </div>
                  )}

                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    {section.variations.length} variation{section.variations.length !== 1 ? 's' : ''} available
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected count */}
      <p className="text-center text-sm mb-6" style={{ color: '#6B7280' }}>
        {selectedSections.length} section{selectedSections.length !== 1 ? 's' : ''} selected
      </p>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-semibold text-sm"
          style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}
        >
          ← Back to Deal Type
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 py-3 rounded-xl font-bold text-sm transition-all"
          style={{
            backgroundColor: canProceed ? '#FFD700' : '#F9FAFB',
            color: canProceed ? '#3A3A3A' : '#9CA3AF',
            cursor: canProceed ? 'pointer' : 'not-allowed',
          }}
        >
          Continue to Customize Clauses →
        </button>
      </div>
    </div>
  );
}
