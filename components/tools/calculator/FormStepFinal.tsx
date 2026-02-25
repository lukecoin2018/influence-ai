"use client";

// Place at: components/tools/calculator/FormStepFinal.tsx

interface InfoTipProps { content: string }
function InfoTip({ content }: InfoTipProps) {
  return (
    <span className="relative inline-block ml-1 group">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs cursor-help font-bold"
        style={{ backgroundColor: '#E8F4FD', color: '#3AAFF4', fontSize: '10px' }}>i</span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-6 w-56 text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
        style={{ backgroundColor: '#3A3A3A', color: '#fff' }}>{content}</span>
    </span>
  );
}

interface FormStepFinalProps {
  hasPaymentTerms: boolean;
  revisionRounds: number;
  onChange: (field: string, value: any) => void;
}

export function FormStepFinal({ hasPaymentTerms, revisionRounds, onChange }: FormStepFinalProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>Final details</h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>These help us identify potential red flags in the deal.</p>
      </div>

      {/* Payment Terms */}
      <label className="flex items-start cursor-pointer gap-3 p-4 rounded-xl"
        style={{ backgroundColor: '#FAFAFA', border: '1px solid #E5E7EB' }}>
        <input type="checkbox" checked={hasPaymentTerms}
          onChange={(e) => onChange("hasPaymentTerms", e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded" />
        <div>
          <div className="font-medium text-sm flex items-center gap-1" style={{ color: '#374151' }}>
            Clear payment terms established
            <InfoTip content="Standard is 50% upfront, 50% on delivery. Never work without a contract and payment terms." />
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            Contract specifies payment schedule and method
          </div>
        </div>
      </label>

      {/* Revision Rounds */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          How many revision rounds?
          <InfoTip content="1-2 rounds is standard. More than that should cost extra. Unlimited revisions = unlimited unpaid work." />
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((num) => (
            <button key={num} type="button"
              onClick={() => onChange("revisionRounds", num)}
              className="py-3 px-4 rounded-xl font-semibold text-sm transition-all"
              style={{
                backgroundColor: revisionRounds === num ? (num > 2 ? '#FF4D94' : '#FFD700') : '#F9FAFB',
                color: revisionRounds === num ? (num > 2 ? '#fff' : '#3A3A3A') : '#374151',
                border: `2px solid ${revisionRounds === num ? (num > 2 ? '#FF4D94' : '#FFD700') : (num > 2 ? '#FFB3D1' : '#E5E7EB')}`,
              }}>
              {num}{num > 2 ? " 🚩" : ""}
            </button>
          ))}
        </div>
        {revisionRounds > 2 && (
          <p className="text-xs mt-2" style={{ color: '#FF4D94' }}>
            ⚠️ More than 2 revision rounds is excessive. Charge 15–20% extra per additional round.
          </p>
        )}
      </div>

      {/* Tips Card */}
      <div className="p-4 rounded-xl" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
        <h3 className="font-semibold text-sm mb-3" style={{ color: '#92400E' }}>
          💡 Quick Tips Before You Calculate
        </h3>
        <ul className="space-y-2">
          {[
            { color: '#FFD700', text: "Always ask for 50% upfront payment" },
            { color: '#FF4D94', text: "Usage rights = extra money. Don't give them away." },
            { color: '#3AAFF4', text: "Start negotiations 10–15% above your target rate" },
            { color: '#FFD700', text: "Never accept \"exposure\" as payment" },
          ].map((tip) => (
            <li key={tip.text} className="flex items-start gap-2 text-xs" style={{ color: '#78350F' }}>
              <span style={{ color: tip.color }}>•</span>
              {tip.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
