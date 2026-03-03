'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign, BrandVoice, VisualStyle } from '@/types/brand/campaign';
import { saveCampaign, getCurrentCampaign } from '@/lib/brand-storage';

const voiceToneOptions: { id: BrandVoice; label: string }[] = [
  { id: 'fun-playful', label: 'Fun & Playful' },
  { id: 'professional-polished', label: 'Professional & Polished' },
  { id: 'authentic-real', label: 'Authentic & Real' },
  { id: 'inspiring-motivational', label: 'Inspiring & Motivational' },
  { id: 'educational-informative', label: 'Educational & Informative' },
  { id: 'luxury-aspirational', label: 'Luxury & Aspirational' },
  { id: 'casual-relatable', label: 'Casual & Relatable' },
];

const visualStyleOptions: { id: VisualStyle; label: string }[] = [
  { id: 'bright-colorful', label: 'Bright & Colorful' },
  { id: 'moody-dramatic', label: 'Moody & Dramatic' },
  { id: 'minimalist-clean', label: 'Minimalist & Clean' },
  { id: 'natural-organic', label: 'Natural & Organic' },
  { id: 'bold-vibrant', label: 'Bold & Vibrant' },
  { id: 'soft-dreamy', label: 'Soft & Dreamy' },
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

export default function BrandPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [selectedVoiceTones, setSelectedVoiceTones] = useState<BrandVoice[]>([]);
  const [selectedVisualStyles, setSelectedVisualStyles] = useState<VisualStyle[]>([]);
  const [dos, setDos] = useState('');
  const [donts, setDonts] = useState('');
  const [exampleUrl, setExampleUrl] = useState('');
  const [exampleDescription, setExampleDescription] = useState('');
  const [assetsProvided, setAssetsProvided] = useState<string[]>([]);
  const [assetDelivery, setAssetDelivery] = useState('');
  const [assetTimeline, setAssetTimeline] = useState('');
  const [assetContact, setAssetContact] = useState('');

  const assetOptions = [
    'Product samples (will ship)',
    'Digital assets (logos, photos, videos)',
    'Brand guidelines PDF',
    'Product information sheet',
    'Discount codes for audience',
    'Other',
  ];

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
    setSelectedVoiceTones(existing.brand.voiceTone);
    setSelectedVisualStyles(existing.brand.visualStyle);
    setDos(existing.brand.dos);
    setDonts(existing.brand.donts);
    setAssetsProvided(existing.brand.assetsProvided);
    setAssetDelivery(existing.brand.assetDelivery);
    setAssetTimeline(existing.brand.assetTimeline);
    setAssetContact(existing.brand.assetContact);
    if (existing.brand.contentExamples.length > 0) {
      setExampleUrl(existing.brand.contentExamples[0].url || '');
      setExampleDescription(existing.brand.contentExamples[0].description || '');
    }
  }, [router]);

  const toggleVoiceTone = (voice: BrandVoice) => {
    setSelectedVoiceTones(prev => prev.includes(voice) ? prev.filter(v => v !== voice) : [...prev, voice]);
  };
  const toggleVisualStyle = (style: VisualStyle) => {
    setSelectedVisualStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
  };
  const toggleAsset = (asset: string) => {
    setAssetsProvided(prev => prev.includes(asset) ? prev.filter(a => a !== asset) : [...prev, asset]);
  };

  const canProceed = selectedVoiceTones.length > 0 || selectedVisualStyles.length > 0;

  const handleSave = () => {
    if (!campaign) return;
    campaign.brand = {
      voiceTone: selectedVoiceTones, visualStyle: selectedVisualStyles,
      dos, donts,
      contentExamples: exampleUrl || exampleDescription ? [{ url: exampleUrl, description: exampleDescription }] : [],
      assetsProvided, assetDelivery, assetTimeline, assetContact,
    };
    campaign.currentStep = 4;
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  };

  const handleContinue = () => { handleSave(); router.push('/dashboard/brief/timeline'); };
  if (!campaign) return null;

  const chipBtn = (isSelected: boolean, accent: string, accentText = '#3A3A3A') => ({
    padding: '8px 16px', borderRadius: 8, border: 'none',
    fontWeight: 500 as const, fontSize: 14, cursor: 'pointer',
    backgroundColor: isSelected ? accent : '#F3F4F6',
    color: isSelected ? accentText : '#6B7280',
    transition: 'background-color 0.15s, color 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={4} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Brand Guidelines</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Help creators understand your brand's voice and visual style</p>
          </div>

          {/* Voice & Tone */}
          <FormSection title="Brand Voice & Tone" description="Select all that describe your brand's communication style">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {voiceToneOptions.map((voice) => (
                <button key={voice.id} onClick={() => toggleVoiceTone(voice.id)}
                  style={chipBtn(selectedVoiceTones.includes(voice.id), '#FFD700')}>
                  {voice.label}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Visual Style */}
          <FormSection title="Visual Style Preferences" description="Select all that describe your desired aesthetic">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {visualStyleOptions.map((style) => (
                <button key={style.id} onClick={() => toggleVisualStyle(style.id)}
                  style={chipBtn(selectedVisualStyles.includes(style.id), '#FF6B8A', '#FFFFFF')}>
                  {style.label}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Do's and Don'ts */}
          <FormSection title="Do's and Don'ts" description="Give creators clear examples of what you love and what to avoid">
            <div>
              <label style={labelStyle}>Do's — Examples of What You Love</label>
              <textarea value={dos} onChange={(e) => setDos(e.target.value)}
                placeholder="e.g., Show the product in natural settings, use bright natural lighting..."
                rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Don'ts — Examples of What to Avoid</label>
              <textarea value={donts} onChange={(e) => setDonts(e.target.value)}
                placeholder="e.g., Don't use dark filters, avoid cluttered backgrounds..."
                rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </FormSection>

          {/* Content Examples */}
          <FormSection title="Content Examples You Love" description="Share examples that inspire you (optional)">
            <div>
              <label style={labelStyle}>Example URL</label>
              <input type="url" value={exampleUrl} onChange={(e) => setExampleUrl(e.target.value)}
                placeholder="https://instagram.com/p/example" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>What Makes This Great?</label>
              <textarea value={exampleDescription} onChange={(e) => setExampleDescription(e.target.value)}
                placeholder="Describe what you love about this content..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </FormSection>

          {/* Brand Assets */}
          <FormSection title="Brand Assets Provided" description="What will you provide to creators?">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assetOptions.map((asset) => {
                const isChecked = assetsProvided.includes(asset);
                return (
                  <label key={asset} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                    backgroundColor: isChecked ? '#FFF9E0' : '#F9FAFB',
                    border: `1px solid ${isChecked ? '#FFD700' : '#E5E7EB'}`,
                    transition: 'border-color 0.15s, background-color 0.15s',
                  }}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleAsset(asset)}
                      style={{ accentColor: '#FFD700', width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#3A3A3A' }}>{asset}</span>
                  </label>
                );
              })}
            </div>
            <div>
              <label style={labelStyle}>Asset Delivery Method</label>
              <input type="text" value={assetDelivery} onChange={(e) => setAssetDelivery(e.target.value)}
                placeholder="e.g., Shipped to creator's address, Google Drive folder..." style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Asset Delivery Timeline</label>
                <input type="text" value={assetTimeline} onChange={(e) => setAssetTimeline(e.target.value)}
                  placeholder="e.g., Within 3 business days" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Asset Contact Person</label>
                <input type="text" value={assetContact} onChange={(e) => setAssetContact(e.target.value)}
                  placeholder="e.g., Sarah at sarah@brand.com" style={inputStyle} />
              </div>
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation currentStep={4} totalSteps={9} onContinue={handleContinue} prevHref="/dashboard/brief/content" onSave={handleSave} canProceed={canProceed} />
    </div>
  );
}
