"use client";

// Place at: components/tools/contract/DealTypeSelector.tsx
// Import change: @/types/contract → @/lib/contract-types

import { DealType } from "@/lib/contract-types";

const dealTypes: Array<{
  id: DealType;
  title: string;
  description: string;
  icon: string;
}> = [
  { id: "single-post", title: "Single Post", description: "One-time content creation (Instagram post, TikTok, YouTube video)", icon: "📱" },
  { id: "multi-post-campaign", title: "Multi-Post Campaign", description: "Multiple deliverables over a set period (3-5 posts, product launch)", icon: "📊" },
  { id: "long-term-partnership", title: "Long-term Partnership", description: "Ongoing collaboration (brand ambassador, monthly content)", icon: "🤝" },
  { id: "brand-ambassador", title: "Brand Ambassador", description: "Official representative role with exclusive partnership", icon: "⭐" },
  { id: "product-review", title: "Product Review", description: "Honest review and feature of brand products", icon: "✍️" },
  { id: "event-coverage", title: "Event Coverage", description: "Live or post-event content creation and promotion", icon: "🎉" },
  { id: "content-licensing", title: "Content Licensing", description: "Licensing existing content for brand use", icon: "📸" },
];

interface DealTypeSelectorProps {
  selectedDealType: DealType | null;
  onSelect: (dealType: DealType) => void;
  onNext: () => void;
}

export function DealTypeSelector({ selectedDealType, onSelect, onNext }: DealTypeSelectorProps) {
  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#3A3A3A' }}>
          Choose Your Deal Type
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Select the type of collaboration to get recommended contract sections
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {dealTypes.map((type) => {
          const isSelected = selectedDealType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className="p-5 rounded-xl border-2 text-left transition-all duration-200"
              style={{
                borderColor: isSelected ? '#FFD700' : '#E5E7EB',
                backgroundColor: isSelected ? '#FFFBEB' : '#F9FAFB',
                boxShadow: isSelected ? '0 0 0 3px rgba(255,215,0,0.15)' : 'none',
              }}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <span className="text-4xl">{type.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm mb-1" style={{ color: '#3A3A3A' }}>
                    {type.title}
                  </h3>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    {type.description}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-lg" style={{ color: '#FFD700' }}>✓</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!selectedDealType}
          className="px-8 py-3 rounded-xl font-bold text-sm transition-all"
          style={{
            backgroundColor: selectedDealType ? '#FFD700' : '#F9FAFB',
            color: selectedDealType ? '#3A3A3A' : '#9CA3AF',
            cursor: selectedDealType ? 'pointer' : 'not-allowed',
          }}
        >
          Continue to Section Selection →
        </button>
      </div>
    </div>
  );
}
