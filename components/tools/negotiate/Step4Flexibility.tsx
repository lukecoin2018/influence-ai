"use client";

// Place at: components/tools/negotiate/Step4Flexibility.tsx

import { FlexibilityLevel } from "@/lib/negotiation-types";

const flexibilityLevels: { value: FlexibilityLevel; label: string; description: string; icon: string }[] = [
  { value: "firm", label: "Stand firm", description: "Won't go below fair rate — this is my minimum", icon: "🛡️" },
  { value: "somewhat-flexible", label: "Somewhat flexible", description: "Could meet in middle if it closes the deal", icon: "🤝" },
  { value: "very-flexible", label: "Very flexible", description: "Really need this deal, willing to compromise", icon: "🙏" },
  { value: "unsure", label: "Not sure, show me options", description: "Help me decide the best approach", icon: "🤔" },
];

interface Step4FlexibilityProps {
  selected: FlexibilityLevel | null;
  onSelect: (flexibility: FlexibilityLevel) => void;
}

export function Step4Flexibility({ selected, onSelect }: Step4FlexibilityProps) {
  return (
    <div className="space-y-4">
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>How flexible are you on price?</h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Be honest — this helps us recommend the right strategy.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {flexibilityLevels.map((level) => {
          const isSelected = selected === level.value;
          return (
            <button
              key={level.value}
              onClick={() => onSelect(level.value)}
              className="text-left p-5 rounded-xl border-2 transition-all duration-200"
              style={{
                borderColor: isSelected ? '#3AAFF4' : '#E5E7EB',
                backgroundColor: isSelected ? '#EFF6FF' : '#F9FAFB',
                boxShadow: isSelected ? '0 0 0 3px rgba(58,175,244,0.15)' : 'none',
              }}
            >
              <div className="text-3xl mb-2">{level.icon}</div>
              <div className="font-semibold text-sm mb-1" style={{ color: '#3A3A3A' }}>{level.label}</div>
              <div className="text-xs" style={{ color: '#6B7280' }}>{level.description}</div>
            </button>
          );
        })}
      </div>

      <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <p className="text-xs" style={{ color: '#78350F' }}>
          💡 <span className="font-semibold">Pro tip:</span> Being honest about your flexibility helps us recommend the strategy most likely to succeed. There's no shame in being flexible when you need the work!
        </p>
      </div>
    </div>
  );
}
