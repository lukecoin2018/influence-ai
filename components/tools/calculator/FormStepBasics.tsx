"use client";

// Place at: components/tools/calculator/FormStepBasics.tsx
// Adapted from LMG-IRC — logic identical, styling converted to InfluenceIT light theme

import { Niche } from "@/types/calculator";

interface InfoTipProps {
  content: string;
}

function InfoTip({ content }: InfoTipProps) {
  return (
    <span className="relative inline-block ml-1 group">
      <span
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-xs cursor-help font-bold"
        style={{ backgroundColor: '#E8F4FD', color: '#3AAFF4', fontSize: '10px' }}
      >
        i
      </span>
      <span className="absolute left-1/2 -translate-x-1/2 bottom-6 w-56 text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
        style={{ backgroundColor: '#3A3A3A', color: '#fff' }}>
        {content}
      </span>
    </span>
  );
}

interface FormStepBasicsProps {
  followers: number;
  engagementRate: number;
  niche: Niche;
  onChange: (field: string, value: any) => void;
}

const inputClass = "w-full px-4 py-3 rounded-lg border text-sm transition-all outline-none focus:ring-2"
const inputStyle = {
  backgroundColor: '#F9FAFB',
  borderColor: '#E5E7EB',
  color: '#3A3A3A',
};

export function FormStepBasics({ followers, engagementRate, niche, onChange }: FormStepBasicsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: '#3A3A3A' }}>
          Let's start with the basics
        </h2>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Tell us about your account so we can calculate accurate rates.
        </p>
      </div>

      {/* Followers */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          How many followers do you have?
          <InfoTip content="Total follower count on your main platform. We'll calculate your engaged audience from this." />
        </label>
        <input
          type="number"
          min="10000"
          max="500000"
          step="1000"
          value={followers}
          onChange={(e) => onChange("followers", parseInt(e.target.value))}
          className={inputClass}
          style={{ ...inputStyle, '--tw-ring-color': '#FF4D94' } as any}
          placeholder="e.g., 50000"
        />
        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
          Designed for creators with 10k–500k followers
        </p>
      </div>

      {/* Engagement Rate */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          Average engagement rate?
          <InfoTip content="(Likes + Comments + Shares) ÷ Followers × 100. This is THE most important metric." />
        </label>
        <div className="relative">
          <input
            type="number"
            min="0.5"
            max="20"
            step="0.1"
            value={engagementRate}
            onChange={(e) => onChange("engagementRate", parseFloat(e.target.value))}
            className={inputClass}
            style={{ ...inputStyle, paddingRight: '40px' }}
            placeholder="e.g., 4.5"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: '#9CA3AF' }}>
            %
          </span>
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs">
          <span style={{ color: '#9CA3AF' }}>Reference:</span>
          <span style={{ color: '#FF4D94', fontWeight: 600 }}>Excellent: &gt;5%</span>
          <span style={{ color: '#3AAFF4', fontWeight: 600 }}>Good: 3–5%</span>
          <span style={{ color: '#9CA3AF' }}>Average: 2–3%</span>
        </div>

        {/* Engagement Calculator */}
        <details className="mt-3">
          <summary className="text-sm cursor-pointer transition-colors" style={{ color: '#3AAFF4' }}>
            📊 Calculate my engagement rate
          </summary>
          <div className="mt-3 p-4 rounded-lg border" style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}>
            <p className="text-xs mb-3" style={{ color: '#6B7280' }}>
              <strong>Add up the totals</strong> from your last 10–20 posts
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'calc-likes', label: 'Total Likes', placeholder: 'e.g., 5000' },
                { id: 'calc-comments', label: 'Total Comments', placeholder: 'e.g., 250' },
                { id: 'calc-shares', label: 'Total Shares', placeholder: 'e.g., 100' },
                { id: 'calc-posts', label: 'Number of Posts', placeholder: 'e.g., 10', defaultValue: '10' },
              ].map((field) => (
                <div key={field.id}>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>
                    {field.label}
                  </label>
                  <input
                    type="number"
                    id={field.id}
                    className={inputClass}
                    style={{ ...inputStyle, fontSize: '13px', padding: '8px 12px' }}
                    placeholder={field.placeholder}
                    defaultValue={field.defaultValue}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const likes = Number((document.getElementById('calc-likes') as HTMLInputElement)?.value || 0);
                const comments = Number((document.getElementById('calc-comments') as HTMLInputElement)?.value || 0);
                const shares = Number((document.getElementById('calc-shares') as HTMLInputElement)?.value || 0);
                const posts = Number((document.getElementById('calc-posts') as HTMLInputElement)?.value || 1);
                if (followers && posts > 0) {
                  const rate = ((likes + comments + shares) / posts / followers) * 100;
                  onChange("engagementRate", Number(rate.toFixed(2)));
                }
              }}
              className="mt-3 w-full py-2 px-4 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#3AAFF4', color: '#fff' }}
            >
              Calculate & Fill
            </button>
          </div>
        </details>
      </div>

      {/* Niche */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
          Content niche?
          <InfoTip content="Your niche affects brand budgets. B2B, finance, and health brands typically have larger budgets." />
        </label>
        <select
          value={niche}
          onChange={(e) => onChange("niche", e.target.value)}
          className={inputClass}
          style={inputStyle}
        >
          <optgroup label="Premium Niches (Higher Rates)">
            <option value="finance">Finance / Investing</option>
            <option value="b2b">B2B / SaaS</option>
            <option value="tech">Technology</option>
            <option value="health">Health / Medical</option>
          </optgroup>
          <optgroup label="Standard Niches">
            <option value="fitness">Fitness</option>
            <option value="fashion">Fashion</option>
            <option value="beauty">Beauty</option>
            <option value="lifestyle">Lifestyle</option>
          </optgroup>
          <optgroup label="Entertainment Niches">
            <option value="gaming">Gaming</option>
            <option value="entertainment">Entertainment / Memes</option>
          </optgroup>
        </select>
      </div>
    </div>
  );
}
