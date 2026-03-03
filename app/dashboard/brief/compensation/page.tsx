'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign, CompensationType, PaymentStructure, UsageRightsDuration, ExclusivityType, ContentOwnership } from '@/types/brand/campaign';
import { saveCampaign, getCurrentCampaign } from '@/lib/brand-storage';

const inputStyle = {
  width: '100%', padding: '10px 14px',
  backgroundColor: '#F9FAFB', color: '#3A3A3A',
  border: '1px solid #E5E7EB', borderRadius: 8,
  fontSize: 14, outline: 'none',
};

const labelStyle = {
  display: 'block' as const,
  fontSize: 13, fontWeight: 600 as const,
  color: '#3A3A3A', marginBottom: 8,
};

const chipBtn = (isSelected: boolean, accent: string, textColor = '#3A3A3A') => ({
  padding: '12px 16px', borderRadius: 8, textAlign: 'left' as const,
  border: `2px solid ${isSelected ? accent : '#E5E7EB'}`,
  backgroundColor: isSelected ? (accent === '#FFD700' ? '#FFF9E0' : '#EBF7FF') : '#FFFFFF',
  color: '#3A3A3A', cursor: 'pointer',
  transition: 'border-color 0.15s, background-color 0.15s',
});

const usageTypeOptions = [
  'Organic social media posts only', 'Paid advertising allowed',
  'Website/marketing materials', 'Print materials',
  'Retail/in-store displays', 'Email marketing',
];

export default function CompensationPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [compensationType, setCompensationType] = useState<CompensationType>('fixed-rate');
  const [fixedAmount, setFixedAmount] = useState('');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [productValue, setProductValue] = useState('');
  const [additionalPerks, setAdditionalPerks] = useState('');
  const [paymentStructure, setPaymentStructure] = useState<PaymentStructure>('on-completion');
  const [paymentTimeline, setPaymentTimeline] = useState('30 days');
  const [paymentMethod, setPaymentMethod] = useState('PayPal');
  const [usageRightsDuration, setUsageRightsDuration] = useState<UsageRightsDuration>('90');
  const [usageTypes, setUsageTypes] = useState<string[]>([]);
  const [exclusivity, setExclusivity] = useState<ExclusivityType>('none');
  const [exclusivityDuration, setExclusivityDuration] = useState('');
  const [exclusivityCategories, setExclusivityCategories] = useState('');
  const [contentOwnership, setContentOwnership] = useState<ContentOwnership>('creator-retains');

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
    setCompensationType(existing.compensation.type);
    setFixedAmount(existing.compensation.fixedAmount?.toString() || '');
    setRangeMin(existing.compensation.rangeMin?.toString() || '');
    setRangeMax(existing.compensation.rangeMax?.toString() || '');
    setProductValue(existing.compensation.productValue?.toString() || '');
    setAdditionalPerks(existing.compensation.additionalPerks || '');
    setPaymentStructure(existing.compensation.paymentStructure);
    setPaymentTimeline(existing.compensation.paymentTimeline);
    setPaymentMethod(existing.compensation.paymentMethod);
    setUsageRightsDuration(existing.compensation.usageRightsDuration);
    setUsageTypes(existing.compensation.usageTypes);
    setExclusivity(existing.compensation.exclusivity);
    setExclusivityDuration(existing.compensation.exclusivityDuration || '');
    setExclusivityCategories(existing.compensation.exclusivityCategories || '');
    setContentOwnership(existing.compensation.contentOwnership);
  }, [router]);

  const toggleUsageType = (type: string) => {
    setUsageTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleSave = () => {
    if (!campaign) return;
    campaign.compensation = {
      type: compensationType,
      fixedAmount: compensationType === 'fixed-rate' && fixedAmount ? parseFloat(fixedAmount) : undefined,
      rangeMin: rangeMin ? parseFloat(rangeMin) : undefined,
      rangeMax: rangeMax ? parseFloat(rangeMax) : undefined,
      productValue: compensationType === 'product-only' && productValue ? parseFloat(productValue) : undefined,
      additionalPerks, paymentStructure, paymentTimeline, paymentMethod,
      usageRightsDuration, usageTypes, exclusivity,
      exclusivityDuration: exclusivity !== 'none' ? exclusivityDuration : undefined,
      exclusivityCategories: exclusivity === 'category' ? exclusivityCategories : undefined,
      contentOwnership,
    };
    campaign.currentStep = 6;
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  };

  const handleContinue = () => { handleSave(); router.push('/dashboard/brief/review'); };
  if (!campaign) return null;

  const prefixInputStyle = { ...inputStyle, paddingLeft: 30 };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={6} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Compensation & Terms</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Define payment, usage rights, and partnership terms</p>
          </div>

          {/* Compensation Type */}
          <FormSection title="Budget & Compensation" description="How will you compensate creators?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { id: 'fixed-rate', label: 'Fixed Rate', sub: 'Set payment amount' },
                { id: 'negotiable', label: 'Negotiable', sub: 'Budget range to discuss' },
                { id: 'product-only', label: 'Product Gifting', sub: 'Product exchange only' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setCompensationType(opt.id as CompensationType)}
                  style={chipBtn(compensationType === opt.id, '#FFD700')}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            {compensationType === 'fixed-rate' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Payment Amount</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14 }}>$</span>
                    <input type="number" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="500" style={prefixInputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Or Budget Range (Optional)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14 }}>$</span>
                      <input type="number" value={rangeMin} onChange={(e) => setRangeMin(e.target.value)} placeholder="Min" style={{ ...inputStyle, paddingLeft: 26 }} />
                    </div>
                    <span style={{ color: '#9CA3AF' }}>–</span>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14 }}>$</span>
                      <input type="number" value={rangeMax} onChange={(e) => setRangeMax(e.target.value)} placeholder="Max" style={{ ...inputStyle, paddingLeft: 26 }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {compensationType === 'negotiable' && (
              <div>
                <label style={labelStyle}>Budget Range</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14 }}>$</span>
                    <input type="number" value={rangeMin} onChange={(e) => setRangeMin(e.target.value)} placeholder="Minimum" style={prefixInputStyle} />
                  </div>
                  <span style={{ color: '#9CA3AF' }}>to</span>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14 }}>$</span>
                    <input type="number" value={rangeMax} onChange={(e) => setRangeMax(e.target.value)} placeholder="Maximum" style={prefixInputStyle} />
                  </div>
                </div>
              </div>
            )}

            {compensationType === 'product-only' && (
              <div>
                <label style={labelStyle}>Product Retail Value</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', fontSize: 14 }}>$</span>
                  <input type="number" value={productValue} onChange={(e) => setProductValue(e.target.value)} placeholder="150" style={prefixInputStyle} />
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Additional Perks (Optional)</label>
              <textarea value={additionalPerks} onChange={(e) => setAdditionalPerks(e.target.value)}
                placeholder="e.g., Affiliate commission, exclusive discount code..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </FormSection>

          {/* Payment Terms */}
          <FormSection title="Payment Terms" description="When and how will payment be made?">
            <div>
              <label style={{ ...labelStyle, marginBottom: 12 }}>Payment Structure</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { id: 'upfront-100', label: '100% Upfront' },
                  { id: 'split-50-50', label: '50% Upfront, 50% on Delivery' },
                  { id: 'on-completion', label: '100% on Completion' },
                  { id: 'custom', label: 'Custom Structure' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setPaymentStructure(opt.id as PaymentStructure)}
                    style={chipBtn(paymentStructure === opt.id, '#3AAFF4')}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Payment Timeline</label>
                <input type="text" value={paymentTimeline} onChange={(e) => setPaymentTimeline(e.target.value)}
                  placeholder="e.g., 30 days of content going live" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Payment Method</label>
                <input type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g., PayPal, Bank Transfer" style={inputStyle} />
              </div>
            </div>
          </FormSection>

          {/* Usage Rights */}
          <FormSection title="Usage Rights" description="How can you use the creator's content?">
            <div>
              <label style={{ ...labelStyle, marginBottom: 12 }}>Duration</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {(['30', '60', '90', '180', '365', 'perpetual'] as UsageRightsDuration[]).map((dur) => {
                  const isSelected = usageRightsDuration === dur;
                  return (
                    <button key={dur} onClick={() => setUsageRightsDuration(dur)} style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      backgroundColor: isSelected ? '#FF6B8A' : '#F3F4F6',
                      color: isSelected ? '#FFFFFF' : '#6B7280',
                      fontWeight: 500, fontSize: 14, cursor: 'pointer',
                    }}>
                      {dur === 'perpetual' ? 'Perpetual' : `${dur} days`}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom: 12 }}>Usage Types (select all that apply)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {usageTypeOptions.map((type) => {
                  const isChecked = usageTypes.includes(type);
                  return (
                    <label key={type} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                      backgroundColor: isChecked ? '#FFF9E0' : '#F9FAFB',
                      border: `1px solid ${isChecked ? '#FFD700' : '#E5E7EB'}`,
                      transition: 'border-color 0.15s, background-color 0.15s',
                    }}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleUsageType(type)}
                        style={{ accentColor: '#FFD700', width: 15, height: 15, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, color: '#3A3A3A' }}>{type}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </FormSection>

          {/* Exclusivity */}
          <FormSection title="Exclusivity" description="Can creators work with competitors?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { id: 'none', label: 'No Exclusivity', sub: 'Can work with anyone' },
                { id: 'category', label: 'Category Exclusivity', sub: 'No competing brands' },
                { id: 'full', label: 'Full Exclusivity', sub: 'No other brands at all' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setExclusivity(opt.id as ExclusivityType)}
                  style={chipBtn(exclusivity === opt.id, '#FFD700')}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
            {exclusivity !== 'none' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Exclusivity Duration</label>
                  <input type="text" value={exclusivityDuration} onChange={(e) => setExclusivityDuration(e.target.value)}
                    placeholder="e.g., 90 days, 6 months" style={inputStyle} />
                </div>
                {exclusivity === 'category' && (
                  <div>
                    <label style={labelStyle}>Excluded Categories</label>
                    <input type="text" value={exclusivityCategories} onChange={(e) => setExclusivityCategories(e.target.value)}
                      placeholder="e.g., other skincare brands" style={inputStyle} />
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* Content Ownership */}
          <FormSection title="Content Ownership" description="Who owns the created content?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              {[
                { id: 'creator-retains', label: 'Creator Retains', sub: 'Brand has license only' },
                { id: 'shared', label: 'Shared Ownership', sub: 'Both can use freely' },
                { id: 'brand-owns', label: 'Brand Owns', sub: 'Full rights transfer' },
                { id: 'custom', label: 'Custom', sub: 'Special arrangement' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setContentOwnership(opt.id as ContentOwnership)}
                  style={chipBtn(contentOwnership === opt.id, '#3AAFF4')}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation currentStep={6} totalSteps={9} onContinue={handleContinue} prevHref="/dashboard/brief/timeline" onSave={handleSave} canProceed={true} />
    </div>
  );
}
