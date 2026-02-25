"use client";

// Place at: components/tools/negotiate/GapAnalysis.tsx

import { calculateGapAnalysis, formatCurrency } from "@/lib/negotiation-calculations";

interface GapAnalysisProps {
  fairRate: number;
  brandOffer: number;
}

function getContextualMessage(level: string): string {
  switch (level) {
    case "severe": return "⚠️ This offer is severely undervalued. Consider if this partnership is worth your time and effort.";
    case "significant": return "⚠️ Significantly below market rate. Stand firm or adjust scope — don't drop your rate.";
    case "below": return "This offer is below your fair rate but within negotiation range. You have room to negotiate.";
    case "fair": return "✅ This is a fair offer! You can accept with confidence or negotiate minor adjustments.";
    case "above": return "🎉 Congratulations! This offer exceeds your fair rate. This brand clearly values your work.";
    default: return "";
  }
}

export function GapAnalysis({ fairRate, brandOffer }: GapAnalysisProps) {
  const analysis = calculateGapAnalysis(fairRate, brandOffer);

  return (
    <div
      className="my-6 p-5 rounded-xl border-2"
      style={{ borderColor: analysis.warningColor, backgroundColor: `${analysis.warningColor}08` }}
    >
      {/* Badge */}
      <div className="mb-4">
        <span
          className="px-3 py-1.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${analysis.warningColor}20`, color: analysis.warningColor }}
        >
          {analysis.warningMessage}
        </span>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Your Fair Rate", value: formatCurrency(fairRate), color: '#3A3A3A' },
          { label: "Their Offer", value: formatCurrency(brandOffer), color: '#3A3A3A' },
          { label: "Gap", value: formatCurrency(analysis.dollarGap), sub: `(${analysis.percentGap}% under)`, color: analysis.warningColor },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl" style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB' }}>
            <div className="text-xs mb-1" style={{ color: '#6B7280' }}>{item.label}</div>
            <div className="text-xl font-bold" style={{ color: item.color }}>{item.value}</div>
            {item.sub && <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{item.sub}</div>}
          </div>
        ))}
      </div>

      <p className="text-xs" style={{ color: '#374151' }}>
        {getContextualMessage(analysis.warningLevel)}
      </p>
    </div>
  );
}
