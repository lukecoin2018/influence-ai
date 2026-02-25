"use client";

// Place at: components/tools/negotiate/ResponseOptions.tsx

import { ResponseOption, DecisionRecommendation } from "@/lib/negotiation-types";
import { ResponseCard } from "./ResponseCard";
import { DecisionHelper } from "./DecisionHelper";
import { useState } from "react";

interface ResponseOptionsProps {
  options: ResponseOption[];
  onBack: () => void;
  fairRate: number;
  brandOffer: number;
}

const strategyLabels: Record<string, string> = {
  firm: "Option A: Stand Your Ground",
  scope: "Option B: Adjust Scope",
  compromise: "Option C: Meet in Middle",
};

export function ResponseOptions({ options, onBack, fairRate, brandOffer }: ResponseOptionsProps) {
  const [showDecisionHelper, setShowDecisionHelper] = useState(false);
  const [recommendation, setRecommendation] = useState<DecisionRecommendation | null>(null);

  const handleRecommendation = (rec: DecisionRecommendation) => {
    setRecommendation(rec);
    setShowDecisionHelper(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#3A3A3A' }}>
          Your Personalized Response Options
        </h1>
        <p className="text-sm" style={{ color: '#6B7280', maxWidth: '480px', margin: '0 auto' }}>
          3 professional email responses based on your situation. Pick the one that matches your strategy.
        </p>
      </div>

      {/* Decision helper result */}
      {recommendation && (
        <div className="p-4 rounded-xl border-2" style={{ borderColor: '#3AAFF4', backgroundColor: '#EFF6FF' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <div className="font-bold text-sm mb-1" style={{ color: '#3A3A3A' }}>
                We recommend: {strategyLabels[recommendation.recommendedStrategy]}
              </div>
              <ul className="space-y-1">
                {recommendation.reasoning.map((r, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#374151' }}>
                    <span style={{ color: '#3AAFF4' }}>→</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Decision helper CTA */}
      {!showDecisionHelper && !recommendation && (
        <div className="p-5 rounded-xl text-center border-2" style={{ borderColor: '#3AAFF4', backgroundColor: '#EFF6FF' }}>
          <h3 className="font-bold text-sm mb-1" style={{ color: '#3A3A3A' }}>Not sure which option to choose?</h3>
          <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
            Answer 3 quick questions and we'll recommend the best approach.
          </p>
          <button
            onClick={() => setShowDecisionHelper(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: '#3AAFF4', color: '#fff' }}
          >
            Help Me Decide
          </button>
        </div>
      )}

      {/* Decision helper widget */}
      {showDecisionHelper && (
        <DecisionHelper
          onRecommendation={handleRecommendation}
          onClose={() => setShowDecisionHelper(false)}
        />
      )}

      {/* Response cards */}
      <div className="space-y-5">
        {options.map((option, index) => (
          <ResponseCard key={option.strategy} option={option} index={index} />
        ))}
      </div>

      {/* Pro tips */}
      <div className="p-5 rounded-xl" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#92400E' }}>
          <span className="text-lg">💡</span> Pro Tips Before Sending
        </h3>
        <ul className="space-y-2">
          {[
            "Personalize the greeting with their actual name if you have it",
            "Review placeholders like [X deliverables] and fill in specific numbers",
            "Read it out loud to make sure it sounds like you",
            "Wait a few hours before sending if you're feeling emotional",
          ].map((tip) => (
            <li key={tip} className="text-xs flex items-start gap-2" style={{ color: '#78350F' }}>
              <span style={{ color: '#FFD700' }}>→</span>{tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Back */}
      <div className="flex justify-center pt-2">
        <button onClick={onBack} className="text-sm font-medium" style={{ color: '#6B7280' }}>
          ← Start Over
        </button>
      </div>
    </div>
  );
}
