'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Plus } from 'lucide-react';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign, Deliverable, DeliverableType, CreativeFreedomLevel } from '@/types/brand/campaign';
import { saveCampaign, getCurrentCampaign, generateId } from '@/lib/brand-storage';

const deliverableOptions: { id: DeliverableType; label: string }[] = [
  { id: 'instagram-feed', label: 'Instagram Feed Posts' },
  { id: 'instagram-reel', label: 'Instagram Reels' },
  { id: 'instagram-story', label: 'Instagram Stories' },
  { id: 'tiktok-video', label: 'TikTok Videos' },
  { id: 'youtube-video', label: 'YouTube Video' },
  { id: 'blog-post', label: 'Blog Post' },
  { id: 'other', label: 'Other' },
];

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

const checkRow = (isChecked: boolean) => ({
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
  backgroundColor: isChecked ? '#FFF9E0' : '#F9FAFB',
  border: `1px solid ${isChecked ? '#FFD700' : '#E5E7EB'}`,
  transition: 'border-color 0.15s, background-color 0.15s',
});

export default function ContentPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [productVisible, setProductVisible] = useState(false);
  const [brandLogo, setBrandLogo] = useState(false);
  const [hashtags, setHashtags] = useState('');
  const [brandAccount, setBrandAccount] = useState('');
  const [mentionFeatures, setMentionFeatures] = useState('');
  const [callToAction, setCallToAction] = useState('');
  const [ftcDisclosure, setFtcDisclosure] = useState(true);
  const [noCompetitors, setNoCompetitors] = useState(false);
  const [noAlcoholDrugs, setNoAlcoholDrugs] = useState(false);
  const [noProfanity, setNoProfanity] = useState(false);
  const [noControversial, setNoControversial] = useState(false);
  const [customRestriction, setCustomRestriction] = useState('');
  const [creativeFreedom, setCreativeFreedom] = useState<CreativeFreedomLevel>('medium');

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
    setDeliverables(existing.content.deliverables);
    setProductVisible(existing.content.mustInclude.productVisible);
    setBrandLogo(existing.content.mustInclude.brandLogo);
    setHashtags(existing.content.mustInclude.specificHashtags.join(', '));
    setBrandAccount(existing.content.mustInclude.tagBrandAccount);
    setMentionFeatures(existing.content.mustInclude.mentionFeatures);
    setCallToAction(existing.content.mustInclude.callToAction);
    setFtcDisclosure(existing.content.mustInclude.ftcDisclosure);
    setNoCompetitors(existing.content.restrictions.noCompetitors);
    setNoAlcoholDrugs(existing.content.restrictions.noAlcoholDrugs);
    setNoProfanity(existing.content.restrictions.noProfanity);
    setNoControversial(existing.content.restrictions.noControversial);
    setCustomRestriction(existing.content.restrictions.custom || '');
    setCreativeFreedom(existing.content.creativeFreedom);
  }, [router]);

  const addDeliverable = (type: DeliverableType) => {
    setDeliverables(prev => [...prev, { type, quantity: 1 }]);
  };
  const updateDeliverable = (index: number, field: keyof Deliverable, value: any) => {
    setDeliverables(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };
  const removeDeliverable = (index: number) => {
    setDeliverables(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!campaign) return;
    campaign.content = {
      deliverables,
      mustInclude: {
        productVisible, brandLogo,
        specificHashtags: hashtags.split(',').map(h => h.trim()).filter(Boolean),
        tagBrandAccount: brandAccount, mentionFeatures, callToAction, ftcDisclosure,
      },
      restrictions: { noCompetitors, noAlcoholDrugs, noProfanity, noControversial, custom: customRestriction },
      creativeFreedom,
    };
    campaign.currentStep = 3;
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  };

  const handleContinue = () => { handleSave(); router.push('/dashboard/brief/brand'); };
  if (!campaign) return null;

  const chipBtn = (isSelected: boolean) => ({
    padding: '12px 16px', borderRadius: 8, textAlign: 'left' as const,
    border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
    backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
    cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={3} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Content Requirements</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Specify what content you need and any requirements</p>
          </div>

          {/* Deliverables */}
          <FormSection title="Deliverables" description="What content do you need creators to produce?" required>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {deliverableOptions.map((option) => (
                <button key={option.id} onClick={() => addDeliverable(option.id)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  backgroundColor: '#3AAFF4', color: '#FFFFFF',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>
                  <Plus style={{ width: 14, height: 14 }} />
                  {option.label}
                </button>
              ))}
            </div>

            {deliverables.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {deliverables.map((deliverable, index) => (
                  <div key={index} style={{
                    backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
                    borderRadius: 10, padding: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                          <label style={labelStyle}>Type</label>
                          <input type="text"
                            value={deliverableOptions.find(o => o.id === deliverable.type)?.label || deliverable.customType}
                            disabled={deliverable.type !== 'other'}
                            onChange={(e) => updateDeliverable(index, 'customType', e.target.value)}
                            style={{ ...inputStyle, opacity: deliverable.type !== 'other' ? 0.7 : 1 }} />
                        </div>
                        <div>
                          <label style={labelStyle}>Quantity</label>
                          <input type="number" min="1" value={deliverable.quantity}
                            onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value))}
                            style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Format (Optional)</label>
                          <input type="text" value={deliverable.format || ''}
                            onChange={(e) => updateDeliverable(index, 'format', e.target.value)}
                            placeholder="e.g., 9:16 vertical" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Length (Optional)</label>
                          <input type="text" value={deliverable.length || ''}
                            onChange={(e) => updateDeliverable(index, 'length', e.target.value)}
                            placeholder="e.g., 30-60 seconds" style={inputStyle} />
                        </div>
                      </div>
                      <button onClick={() => removeDeliverable(index)} style={{
                        padding: 8, background: 'none', border: 'none', cursor: 'pointer',
                        color: '#9CA3AF', flexShrink: 0,
                      }}>
                        <Trash2 style={{ width: 18, height: 18, color: '#FF6B8A' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 14 }}>
                Click the buttons above to add deliverables
              </div>
            )}
          </FormSection>

          {/* Must Include */}
          <FormSection title="Content Must Include" description="Required elements in all creator content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { checked: productVisible, setter: setProductVisible, label: 'Product visible in frame' },
                { checked: brandLogo, setter: setBrandLogo, label: 'Brand logo visible' },
                { checked: ftcDisclosure, setter: setFtcDisclosure, label: 'FTC disclosure (#ad, #sponsored, etc.)' },
              ].map(({ checked, setter, label }) => (
                <label key={label} style={checkRow(checked)}>
                  <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)}
                    style={{ accentColor: '#FFD700', width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#3A3A3A' }}>{label}</span>
                </label>
              ))}
            </div>
            <div><label style={labelStyle}>Specific Hashtags</label>
              <input type="text" value={hashtags} onChange={(e) => setHashtags(e.target.value)}
                placeholder="e.g., #YourBrand, #CampaignName" style={inputStyle} /></div>
            <div><label style={labelStyle}>Tag Brand Account</label>
              <input type="text" value={brandAccount} onChange={(e) => setBrandAccount(e.target.value)}
                placeholder="e.g., @yourbrand" style={inputStyle} /></div>
            <div><label style={labelStyle}>Mention Specific Features</label>
              <textarea value={mentionFeatures} onChange={(e) => setMentionFeatures(e.target.value)}
                placeholder="e.g., Waterproof design, 24-hour battery life..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} /></div>
            <div><label style={labelStyle}>Call-to-Action</label>
              <input type="text" value={callToAction} onChange={(e) => setCallToAction(e.target.value)}
                placeholder="e.g., Use code SAVE20, Visit link in bio" style={inputStyle} /></div>
          </FormSection>

          {/* Restrictions */}
          <FormSection title="Content Restrictions" description="Things creators should avoid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { checked: noCompetitors, setter: setNoCompetitors, label: 'No competitor brands visible' },
                { checked: noAlcoholDrugs, setter: setNoAlcoholDrugs, label: 'No alcohol/drugs in frame' },
                { checked: noProfanity, setter: setNoProfanity, label: 'No profanity' },
                { checked: noControversial, setter: setNoControversial, label: 'No controversial topics' },
              ].map(({ checked, setter, label }) => (
                <label key={label} style={checkRow(checked)}>
                  <input type="checkbox" checked={checked} onChange={(e) => setter(e.target.checked)}
                    style={{ accentColor: '#FFD700', width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#3A3A3A' }}>{label}</span>
                </label>
              ))}
            </div>
            <div><label style={labelStyle}>Other Restrictions</label>
              <textarea value={customRestriction} onChange={(e) => setCustomRestriction(e.target.value)}
                placeholder="Any other content restrictions..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} /></div>
          </FormSection>

          {/* Creative Freedom */}
          <FormSection title="Creative Freedom Level" description="How much flexibility do creators have?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { id: 'high', label: 'High Freedom', sub: "Creator's authentic style, minimal restrictions" },
                { id: 'medium', label: 'Medium Freedom', sub: 'Some guidelines but flexible on execution' },
                { id: 'structured', label: 'Structured', sub: 'Specific shot list and talking points required' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setCreativeFreedom(opt.id as CreativeFreedomLevel)}
                  style={chipBtn(creativeFreedom === opt.id)}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation currentStep={3} totalSteps={9} onContinue={handleContinue} prevHref="/dashboard/brief/objectives" onSave={handleSave} canProceed={deliverables.length > 0} />
    </div>
  );
}
