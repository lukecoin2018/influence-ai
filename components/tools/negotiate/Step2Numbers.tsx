"use client";

// Place at: components/tools/negotiate/Step2Numbers.tsx
// Replaces custom <Input> component with plain styled inputs

interface Step2NumbersProps {
  fairRate: string;
  brandOffer: string;
  deliverables: string;
  usageRights: string;
  exclusivity: string;
  onChange: (field: string, value: string) => void;
  errors?: Partial<Record<string, string>>;
}

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1.5px solid #E5E7EB',
  backgroundColor: '#F9FAFB',
  color: '#3A3A3A',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

function Field({
  label,
  helperText,
  error,
  children,
}: {
  label: string;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
        {label}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>}
      {!error && helperText && (
        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{helperText}</p>
      )}
    </div>
  );
}

export function Step2Numbers({
  fairRate, brandOffer, deliverables, usageRights, exclusivity, onChange, errors = {},
}: Step2NumbersProps) {
  return (
    <div className="space-y-5">
      <div className="mb-5">
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>Tell us about the deal</h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>We'll use these numbers to personalize your response.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Your Fair Rate" helperText="From Rate Calculator" error={errors.fairRate}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#9CA3AF' }}>$</span>
            <input
              type="number"
              value={fairRate}
              onChange={(e) => onChange('fairRate', e.target.value)}
              placeholder="3500"
              style={{ ...inputStyle, paddingLeft: '28px', borderColor: errors.fairRate ? '#EF4444' : '#E5E7EB' }}
            />
          </div>
        </Field>

        <Field label="Brand's Current Offer" helperText="What they're currently offering" error={errors.brandOffer}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#9CA3AF' }}>$</span>
            <input
              type="number"
              value={brandOffer}
              onChange={(e) => onChange('brandOffer', e.target.value)}
              placeholder="1820"
              style={{ ...inputStyle, paddingLeft: '28px', borderColor: errors.brandOffer ? '#EF4444' : '#E5E7EB' }}
            />
          </div>
        </Field>
      </div>

      <Field label="Deliverables" helperText="e.g., '3 Instagram Reels', '1 YouTube video + 2 TikToks'" error={errors.deliverables}>
        <input
          type="text"
          value={deliverables}
          onChange={(e) => onChange('deliverables', e.target.value)}
          placeholder="3 Instagram Reels"
          style={{ ...inputStyle, borderColor: errors.deliverables ? '#EF4444' : '#E5E7EB' }}
        />
      </Field>

      <Field label="Usage Rights" helperText="How long and where they can use your content" error={errors.usageRights}>
        <input
          type="text"
          value={usageRights}
          onChange={(e) => onChange('usageRights', e.target.value)}
          placeholder="90-day organic + paid promotion"
          style={{ ...inputStyle, borderColor: errors.usageRights ? '#EF4444' : '#E5E7EB' }}
        />
      </Field>

      <Field label="Exclusivity" helperText="If you can't work with competitors during/after campaign" error={errors.exclusivity}>
        <input
          type="text"
          value={exclusivity}
          onChange={(e) => onChange('exclusivity', e.target.value)}
          placeholder="30-day category exclusivity"
          style={{ ...inputStyle, borderColor: errors.exclusivity ? '#EF4444' : '#E5E7EB' }}
        />
      </Field>
    </div>
  );
}
