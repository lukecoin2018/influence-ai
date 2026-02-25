"use client";

// Place at: components/tools/negotiate/DecisionHelper.tsx
// Replaces <Button> component with native buttons

import { useState } from "react";
import { DecisionHelperQuiz, DecisionRecommendation, StrategyType } from "@/lib/negotiation-types";

interface DecisionHelperProps {
  onRecommendation: (recommendation: DecisionRecommendation) => void;
  onClose: () => void;
}

const questions = [
  {
    field: "brandPrestige" as keyof DecisionHelperQuiz,
    question: "Is this brand prestigious or well-known?",
    description: "Well-known brands add credibility to your portfolio",
    options: [
      { value: "high", label: "Yes, very prestigious", emoji: "⭐" },
      { value: "medium", label: "Somewhat known", emoji: "👍" },
      { value: "low", label: "Small/unknown brand", emoji: "🏢" },
    ],
  },
  {
    field: "financialNeed" as keyof DecisionHelperQuiz,
    question: "How badly do you need this income?",
    description: "Be honest — there's no shame in needing the work",
    options: [
      { value: "urgent", label: "Urgently need it", emoji: "🚨" },
      { value: "moderate", label: "Would help but not critical", emoji: "💼" },
      { value: "flexible", label: "Don't really need it", emoji: "✨" },
    ],
  },
  {
    field: "budgetLikelihood" as keyof DecisionHelperQuiz,
    question: "Do you think they have more budget?",
    description: "Based on their responses and company size",
    options: [
      { value: "yes", label: "Yes, likely testing me", emoji: "💰" },
      { value: "maybe", label: "Maybe, not sure", emoji: "🤔" },
      { value: "no", label: "No, this seems real", emoji: "📊" },
    ],
  },
];

function calculateRecommendation(quiz: DecisionHelperQuiz): DecisionRecommendation {
  let firm = 0, scope = 0, compromise = 0;

  if (quiz.brandPrestige === "high") { compromise += 30; scope += 20; }
  else if (quiz.brandPrestige === "medium") { scope += 25; compromise += 20; firm += 15; }
  else { firm += 30; scope += 15; }

  if (quiz.financialNeed === "urgent") { compromise += 40; scope += 30; }
  else if (quiz.financialNeed === "moderate") { scope += 35; compromise += 25; firm += 20; }
  else { firm += 40; scope += 25; compromise += 15; }

  if (quiz.budgetLikelihood === "yes") { firm += 30; scope += 20; }
  else if (quiz.budgetLikelihood === "maybe") { scope += 25; firm += 20; compromise += 15; }
  else { compromise += 30; scope += 20; firm += 10; }

  const scores = [
    { strategy: "firm" as StrategyType, score: firm },
    { strategy: "scope" as StrategyType, score: scope },
    { strategy: "compromise" as StrategyType, score: compromise },
  ].sort((a, b) => b.score - a.score);

  const reasoning: string[] = [];
  const winner = scores[0].strategy;
  if (winner === "firm") {
    reasoning.push("Stand your ground — your value is worth it");
    if (quiz.financialNeed === "flexible") reasoning.push("You don't urgently need income");
    if (quiz.budgetLikelihood === "yes") reasoning.push("They likely have more budget");
  } else if (winner === "scope") {
    reasoning.push("Adjust deliverables while maintaining your rate");
    reasoning.push("This shows flexibility without lowering your per-content rate");
  } else {
    reasoning.push("Meet them in the middle to close the deal");
    if (quiz.brandPrestige === "high") reasoning.push("Prestigious brand — worth compromising for portfolio");
    if (quiz.financialNeed === "urgent") reasoning.push("You need this income");
  }

  return {
    recommendedStrategy: winner,
    confidence: Math.min(scores[0].score, 95),
    reasoning,
    alternativeScores: scores.slice(1).map(s => ({
      strategy: s.strategy,
      score: s.score,
      reason: s.strategy === "firm" ? "Less likely to close but maintains full rate"
        : s.strategy === "scope" ? "Good middle ground if compromise feels too low"
        : "Most flexible if you really need to close",
    })),
  };
}

export function DecisionHelper({ onRecommendation, onClose }: DecisionHelperProps) {
  const [quiz, setQuiz] = useState<Partial<DecisionHelperQuiz>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const q = questions[currentQuestion];

  const handleAnswer = (value: string) => {
    const updated = { ...quiz, [q.field]: value } as DecisionHelperQuiz;
    setQuiz(updated);
    if (currentQuestion < 2) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      onRecommendation(calculateRecommendation(updated));
    }
  };

  return (
    <div className="rounded-2xl border-2 p-6 max-w-xl mx-auto" style={{ backgroundColor: '#fff', borderColor: '#3AAFF4' }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold mb-1" style={{ color: '#3A3A3A' }}>Decision Helper</h2>
        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Question {currentQuestion + 1} of 3</p>
        <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
          <div
            className="h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / 3) * 100}%`, backgroundColor: '#3AAFF4' }}
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <h3 className="font-bold text-base mb-1" style={{ color: '#3A3A3A' }}>{q.question}</h3>
        <p className="text-sm mb-5" style={{ color: '#6B7280' }}>{q.description}</p>
        <div className="space-y-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleAnswer(opt.value)}
              className="w-full p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all hover:border-blue-300"
              style={{ borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="font-medium text-sm" style={{ color: '#3A3A3A' }}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Back / Cancel */}
      <div className="flex items-center justify-between mt-6">
        {currentQuestion > 0 ? (
          <button onClick={() => setCurrentQuestion(currentQuestion - 1)}
            className="text-sm font-medium" style={{ color: '#6B7280' }}>
            ← Back
          </button>
        ) : <span />}
        <button onClick={onClose} className="text-sm" style={{ color: '#9CA3AF' }}>Cancel</button>
      </div>
    </div>
  );
}
