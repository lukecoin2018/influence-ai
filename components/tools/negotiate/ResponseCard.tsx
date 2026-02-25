"use client";

// Place at: components/tools/negotiate/ResponseCard.tsx

import { useState } from "react";
import { ResponseOption } from "@/lib/negotiation-types";

interface ResponseCardProps {
  option: ResponseOption;
  index: number;
}

const strategyConfig = {
  firm:       { border: '#FFD700', bg: '#FFFBEB', badge: '#FEF3C7', badgeText: '#92400E' },
  scope:      { border: '#3AAFF4', bg: '#EFF6FF', badge: '#DBEAFE', badgeText: '#1E40AF' },
  compromise: { border: '#FF4D94', bg: '#FFF0F5', badge: '#FCE7F3', badgeText: '#9D174D' },
};

export function ResponseCard({ option, index }: ResponseCardProps) {
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = strategyConfig[option.strategy];
  const fullEmail = `Subject: ${option.email.subject}\n\n${option.email.body}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="rounded-xl border-2 p-5 space-y-4" style={{ borderColor: config.border, backgroundColor: '#fff' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-base" style={{ color: '#3A3A3A' }}>{option.title}</h3>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{option.subtitle}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: config.badge, color: config.badgeText }}>
          Option {String.fromCharCode(65 + index)}
        </span>
      </div>

      {/* When to use */}
      <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: config.bg }}>
        <span className="font-semibold" style={{ color: '#374151' }}>When to use: </span>
        <span style={{ color: '#6B7280' }}>{option.whenToUse}</span>
      </div>

      {/* Email preview */}
      <div className="rounded-xl p-4" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#9CA3AF' }}>
          Email Preview
        </div>
        <div className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>
          Subject: <span className="font-normal">{option.email.subject}</span>
        </div>
        <div className="text-xs whitespace-pre-wrap" style={{ color: '#6B7280' }}>
          {showFull ? option.email.body : `${option.email.body.slice(0, 220)}...`}
        </div>
        {option.email.body.length > 220 && (
          <button onClick={() => setShowFull(!showFull)}
            className="text-xs mt-2 font-medium" style={{ color: '#3AAFF4' }}>
            {showFull ? "Show less" : "Show full email"}
          </button>
        )}
      </div>

      {/* Pros & Cons */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#10B981' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pros
          </div>
          <ul className="space-y-1">
            {option.pros.map((pro, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#6B7280' }}>
                <span style={{ color: '#10B981' }}>•</span>{pro}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#F59E0B' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Cons
          </div>
          <ul className="space-y-1">
            {option.cons.map((con, i) => (
              <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: '#6B7280' }}>
                <span style={{ color: '#F59E0B' }}>•</span>{con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Copy button */}
      <div className="pt-3 border-t" style={{ borderColor: '#E5E7EB' }}>
        <button
          onClick={handleCopy}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: copied ? '#ECFDF5' : config.bg,
            color: copied ? '#10B981' : config.badgeText,
            border: `1.5px solid ${copied ? '#10B981' : config.border}`,
          }}
        >
          {copied ? (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
          ) : (
            <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy Option {String.fromCharCode(65 + index)}</>
          )}
        </button>
      </div>
    </div>
  );
}
