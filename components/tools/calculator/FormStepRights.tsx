"use client";

// Place at: components/tools/calculator/FormStepRights.tsx

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

interface FormStepRightsProps {
  usageType: "organic" | "paid";
  usageDuration: 30 | 90 | 365 | 9999;
  hasWhitelisting: boolean;
  exclusivityDays: 0 | 30 | 60 | 90;
  isLongTermPartnership: boolean;
  onChange: (field: string, value: any) => void;
}

export function FormStepRights({
  usageType, usageDuration, hasWhitelisting, exclusivityDays, isLongTermPartnership, onChange,
}: FormStepRightsProps) {

  const selectedBtn = (active: boolean, accent: string) => ({
    backgroundColor: active ? accent : '#F9FAFB',
    color: active ? '#fff' : '#374151',
    border: `2px solid ${active ? accent : '#E5E7EB'}`,
  });

  const durationBtn = (active: boolean) => ({
    backgroundColor: active ? '#FFD700' : '#F9FAFB',
    color: active ? '#3A3A3A' : '#374151',
    border: `2px solid ${active ? '#FFD700' : '#E5E7EB'}`,
    fontWeight: active ? 700 : 500,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>Usage rights & terms</h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          This is where most creators undervalue themselves. Usage rights = $$$.
        </p>
      </div>

      {/* Usage Type */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          How will the brand use your content?
          <InfoTip content="Organic = posted on your account only. Paid = they'll run it as ads. Paid usage should ALWAYS cost more." />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "organic", label: "Organic Only", sub: "Posted on your account", accent: '#3AAFF4' },
            { value: "paid", label: "Paid Advertising", sub: "They'll boost it as ads", accent: '#FF4D94' },
          ].map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => onChange("usageType", opt.value)}
              className="py-4 px-4 rounded-xl font-medium text-left transition-all"
              style={selectedBtn(usageType === opt.value, opt.accent)}>
              <div className="font-semibold text-sm">{opt.label}</div>
              <div className="text-xs mt-1 opacity-70">{opt.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Usage Duration */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          How long can they use it?
          <InfoTip content="Longer usage = higher rates. Your content is an asset. Don't give away perpetual rights cheaply." />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 30, label: "30 Days" },
            { value: 90, label: "90 Days" },
            { value: 365, label: "1 Year" },
            { value: 9999, label: "Perpetual 🚩" },
          ].map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => onChange("usageDuration", opt.value)}
              className="py-3 px-4 rounded-xl font-medium text-sm transition-all"
              style={durationBtn(usageDuration === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Whitelisting */}
      <label className="flex items-start cursor-pointer gap-3 p-4 rounded-xl transition-colors"
        style={{ backgroundColor: '#FAFAFA', border: '1px solid #E5E7EB' }}>
        <input type="checkbox" checked={hasWhitelisting}
          onChange={(e) => onChange("hasWhitelisting", e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded" />
        <div>
          <div className="font-medium text-sm flex items-center gap-1" style={{ color: '#374151' }}>
            Whitelisting / Spark Ads
            <InfoTip content="They run ads FROM YOUR ACCOUNT using your handle and credibility. Worth +30%." />
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Brand will run ads from your account (+30%)</div>
        </div>
      </label>

      {/* Exclusivity */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          Exclusivity period
          <InfoTip content="Can't work with competitors during this time. This limits your earning potential, so charge accordingly." />
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { value: 0, label: "None" },
            { value: 30, label: "30 Days" },
            { value: 60, label: "60 Days" },
            { value: 90, label: "90 Days" },
          ].map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => onChange("exclusivityDays", opt.value)}
              className="py-3 px-2 rounded-xl font-medium text-sm transition-all"
              style={durationBtn(exclusivityDays === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Long-term */}
      <label className="flex items-start cursor-pointer gap-3 p-4 rounded-xl transition-colors"
        style={{ backgroundColor: '#FAFAFA', border: '1px solid #E5E7EB' }}>
        <input type="checkbox" checked={isLongTermPartnership}
          onChange={(e) => onChange("isLongTermPartnership", e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded" />
        <div>
          <div className="font-medium text-sm flex items-center gap-1" style={{ color: '#374151' }}>
            Long-term partnership (3+ months)
            <InfoTip content="Ongoing relationship with consistent work. Offer 20% discount for steady income vs one-off deals." />
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Multi-month agreement with consistent deliverables</div>
        </div>
      </label>
    </div>
  );
}
