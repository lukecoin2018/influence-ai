"use client";

// Place at: components/tools/calculator/ResultsPage.tsx

import { useState } from "react";
import { CalculatorResult } from "@/types/calculator";
import Link from "next/link";

interface ResultsPageProps {
  result: CalculatorResult;
  onStartOver: () => void;
  onBack: () => void;
}

const card = {
  backgroundColor: '#fff',
  border: '1px solid #E5E7EB',
  borderRadius: '16px',
  padding: '24px',
  marginBottom: '20px',
};

export function ResultsPage({ result, onStartOver, onBack }: ResultsPageProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const confidenceColors: Record<string, string> = {
    high: '#10B981', medium: '#F59E0B', low: '#EF4444',
  };

  return (
    <div style={{ backgroundColor: '#FAFAFA', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Back */}
        <button onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors"
          style={{ color: '#6B7280' }}>
          ← Edit Details
        </button>

        {/* Main Rate Display */}
        <div style={{ ...card, background: 'linear-gradient(135deg, #3A3A3A 0%, #4A4A4A 100%)', border: 'none', textAlign: 'center', padding: '36px 24px' }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
            Total Package Rate
          </p>
          <div className="text-5xl font-black mb-2" style={{ color: '#FFD700', letterSpacing: '-0.02em' }}>
            ${result.minRate.toLocaleString()} – ${result.maxRate.toLocaleString()}
          </div>
          <div className="text-lg mb-5" style={{ color: '#D1D5DB' }}>
            Recommended: <span style={{ color: '#FFD700', fontWeight: 700 }}>${result.recommendedRate.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="px-3 py-1.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: confidenceColors[result.confidence] }}>
              {result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)} Confidence
            </span>
            <span className="px-3 py-1.5 rounded-full text-sm"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#D1D5DB' }}>
              {result.marketPosition}
            </span>
          </div>
        </div>

        {/* Red Flags */}
        {result.redFlags.length > 0 && (
          <div style={{ ...card, borderColor: '#FFB3D1', borderWidth: '2px' }}>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">🚩</span>
              <div>
                <h2 className="font-bold text-lg" style={{ color: '#FF4D94' }}>Red Flags Detected</h2>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {result.redFlags.length} potential issue{result.redFlags.length > 1 ? "s" : ""} with this deal
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {result.redFlags.map((flag, i) => (
                <div key={i} className="p-3 rounded-lg flex items-start gap-3"
                  style={{
                    backgroundColor: flag.severity === "danger" ? '#FFF5F5' : '#FFFBEB',
                    border: `1px solid ${flag.severity === "danger" ? '#FECACA' : '#FDE68A'}`,
                  }}>
                  <span>{flag.severity === "danger" ? "⛔" : "⚠️"}</span>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#3A3A3A' }}>{flag.message}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{flag.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calculation Breakdown */}
        <div style={card}>
          <h2 className="font-bold text-lg mb-5" style={{ color: '#3A3A3A' }}>How We Calculated This</h2>
          <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: '#F9FAFB' }}>
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: '#6B7280' }}>Engaged Audience</span>
              <span className="font-semibold" style={{ color: '#3A3A3A' }}>{result.engagedFollowers.toLocaleString()} people</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#6B7280' }}>Base Rate ({result.creatorTier} tier)</span>
              <span className="font-semibold" style={{ color: '#FF4D94' }}>${result.baseRate.toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-2">
            {result.steps.map((step, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 pr-4">
                  <div className="text-sm font-medium" style={{ color: '#3A3A3A' }}>{step.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{step.explanation}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  {step.multiplier && (
                    <div className="text-xs mb-0.5" style={{ color: '#3AAFF4' }}>×{step.multiplier.toFixed(2)}</div>
                  )}
                  <div className="font-semibold text-sm" style={{ color: '#3A3A3A' }}>
                    ${Math.round(step.value).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Negotiation Strategy */}
        <div style={card}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-lg" style={{ color: '#3A3A3A' }}>Negotiation Strategy</h2>
            <button onClick={() => copy(result.negotiation.strategy.join("\n"), "strategy")}
              className="text-xs font-medium transition-colors"
              style={{ color: copiedSection === "strategy" ? '#10B981' : '#3AAFF4' }}>
              {copiedSection === "strategy" ? "✓ Copied!" : "Copy Tips"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Opening Ask", value: result.negotiation.openingAsk, sub: "Start here", color: '#FFD700', bg: '#FFFBEB' },
              { label: "Acceptable Min", value: result.negotiation.acceptableMin, sub: "Don't go below", color: '#3AAFF4', bg: '#EFF6FF' },
              { label: "Walk-Away", value: result.negotiation.walkAwayPoint, sub: "Know your worth", color: '#FF4D94', bg: '#FFF0F5' },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl text-center" style={{ backgroundColor: item.bg }}>
                <div className="text-xs mb-1 font-medium" style={{ color: '#6B7280' }}>{item.label}</div>
                <div className="text-xl font-black" style={{ color: item.color }}>${item.value.toLocaleString()}</div>
                <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{item.sub}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {result.negotiation.strategy.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: '#F9FAFB' }}>
                <span className="font-bold text-sm flex-shrink-0" style={{ color: '#FFD700' }}>{i + 1}.</span>
                <span className="text-sm" style={{ color: '#374151' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Contract Essentials */}
        <div style={card}>
          <h2 className="font-bold text-lg mb-5" style={{ color: '#3A3A3A' }}>What to Include in Your Contract</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Required Terms", color: '#FFD700', bg: '#FFFBEB',
                items: [
                  `Total payment: $${result.recommendedRate.toLocaleString()}`,
                  `50% upfront ($${Math.round(result.recommendedRate * 0.5).toLocaleString()}), 50% on delivery`,
                  "Deliverables and timeline",
                  "Usage rights and duration",
                  "Revision policy (1–2 rounds max)",
                ],
              },
              {
                title: "Protect Yourself", color: '#FF4D94', bg: '#FFF0F5',
                items: [
                  "Kill fee clause (50% if they cancel)",
                  "Late payment penalties",
                  "Final approval rights",
                  "Clear scope of work",
                  "Exclusivity terms (if applicable)",
                ],
              },
            ].map((section) => (
              <div key={section.title} className="p-4 rounded-xl" style={{ backgroundColor: section.bg }}>
                <h3 className="font-semibold text-sm mb-3" style={{ color: section.color }}>{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: '#374151' }}>
                      <span style={{ color: section.color }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Email Template */}
        <div style={card}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg" style={{ color: '#3A3A3A' }}>Email Template</h2>
            <button onClick={() => copy(getEmailTemplate(result), "email")}
              className="text-xs font-medium transition-colors"
              style={{ color: copiedSection === "email" ? '#10B981' : '#3AAFF4' }}>
              {copiedSection === "email" ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-xs rounded-xl p-4 whitespace-pre-wrap overflow-x-auto"
            style={{ backgroundColor: '#F9FAFB', color: '#374151', fontFamily: 'monospace', lineHeight: 1.6 }}>
            {getEmailTemplate(result)}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button onClick={onStartOver}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md"
            style={{ backgroundColor: '#FF4D94', color: '#fff' }}>
            Calculate Another Rate
          </button>
          <Link href={`/creator-dashboard/negotiate?rate=${result.recommendedRate}&deliverables=${encodeURIComponent(
  result.deliverableBreakdowns.map(d => d.label).join(', ')
)}`}
            className="flex-1 py-3 rounded-xl font-semibold text-sm text-center transition-all hover:shadow-md"
            style={{ backgroundColor: '#FFD700', color: '#3A3A3A' }}>
            Use Rate in Negotiation →
          </Link>
          <button onClick={() => window.print()}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ backgroundColor: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' }}>
            Save as PDF
          </button>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs rounded-xl p-4" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF' }}>
          💡 Rates are estimates based on industry data. Actual rates vary by audience quality, content, and brand relationships.
        </div>
      </div>
    </div>
  );
}

function getEmailTemplate(result: CalculatorResult): string {
  const deliverablesList = result.deliverableBreakdowns
    .map(d => `• ${d.quantity} x ${d.label}`)
    .join('\n');
  return `Subject: Partnership Rate for [Brand Name]

Hi [Brand Contact],

Thank you for your interest in partnering with me!

My total rate for this partnership is $${result.negotiation.openingAsk.toLocaleString()}.

This package includes:
${deliverablesList}
• Usage rights and content license
• Up to 2 rounds of revisions per deliverable

My standard terms are 50% upfront ($${Math.round(result.negotiation.openingAsk * 0.5).toLocaleString()}) and 50% upon delivery.

Happy to discuss further — what's your budget range?

Best,
[Your Name]`;
}
