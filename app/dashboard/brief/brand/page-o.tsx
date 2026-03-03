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
  { id: 'casual-relatable', label: 'Casual & Relatable' }
];

const visualStyleOptions: { id: VisualStyle; label: string }[] = [
  { id: 'bright-colorful', label: 'Bright & Colorful' },
  { id: 'moody-dramatic', label: 'Moody & Dramatic' },
  { id: 'minimalist-clean', label: 'Minimalist & Clean' },
  { id: 'natural-organic', label: 'Natural & Organic' },
  { id: 'bold-vibrant', label: 'Bold & Vibrant' },
  { id: 'soft-dreamy', label: 'Soft & Dreamy' }
];

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
    'Other'
  ];

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) {
      router.push('/builder/campaign-type');
      return;
    }
    
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
    setSelectedVoiceTones(prev =>
      prev.includes(voice)
        ? prev.filter(v => v !== voice)
        : [...prev, voice]
    );
  };

  const toggleVisualStyle = (style: VisualStyle) => {
    setSelectedVisualStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const toggleAsset = (asset: string) => {
    setAssetsProvided(prev =>
      prev.includes(asset)
        ? prev.filter(a => a !== asset)
        : [...prev, asset]
    );
  };

  const canProceed = selectedVoiceTones.length > 0 || selectedVisualStyles.length > 0;

  const handleSave = () => {
    if (!campaign) return;

    campaign.brand = {
      voiceTone: selectedVoiceTones,
      visualStyle: selectedVisualStyles,
      dos,
      donts,
      contentExamples: exampleUrl || exampleDescription ? [{
        url: exampleUrl,
        description: exampleDescription
      }] : [],
      assetsProvided,
      assetDelivery,
      assetTimeline,
      assetContact
    };
    campaign.currentStep = 4;
    campaign.updatedAt = new Date().toISOString();
    
    saveCampaign(campaign);
  };

  const handleContinue = () => {
    handleSave();
    router.push('/builder/timeline');
  };

  if (!campaign) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <StepIndicator currentStep={4} totalSteps={9} />
      
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Brand Guidelines</h1>
            <p className="text-gray-400">Help creators understand your brand's voice and visual style</p>
          </div>

          {/* Voice & Tone */}
          <FormSection 
            title="Brand Voice & Tone" 
            description="Select all that describe your brand's communication style"
          >
            <div className="flex flex-wrap gap-3">
              {voiceToneOptions.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => toggleVoiceTone(voice.id)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${selectedVoiceTones.includes(voice.id)
                      ? 'bg-brand-yellow text-black'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {voice.label}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Visual Style */}
          <FormSection 
            title="Visual Style Preferences" 
            description="Select all that describe your desired aesthetic"
          >
            <div className="flex flex-wrap gap-3">
              {visualStyleOptions.map((style) => (
                <button
                  key={style.id}
                  onClick={() => toggleVisualStyle(style.id)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-all
                    ${selectedVisualStyles.includes(style.id)
                      ? 'bg-brand-pink text-white'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </FormSection>

          {/* Do's and Don'ts */}
          <FormSection 
            title="Do's and Don'ts" 
            description="Give creators clear examples of what you love and what to avoid"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Do's - Examples of What You Love
              </label>
              <textarea
                value={dos}
                onChange={(e) => setDos(e.target.value)}
                placeholder="e.g., Show the product in natural settings, use bright natural lighting, include lifestyle shots..."
                rows={4}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Don'ts - Examples of What to Avoid
              </label>
              <textarea
                value={donts}
                onChange={(e) => setDonts(e.target.value)}
                placeholder="e.g., Don't use dark filters, avoid cluttered backgrounds, no over-edited photos..."
                rows={4}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>
          </FormSection>

          {/* Content Examples */}
          <FormSection 
            title="Content Examples You Love" 
            description="Share examples that inspire you (optional)"
          >
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Example URL
              </label>
              <input
                type="url"
                value={exampleUrl}
                onChange={(e) => setExampleUrl(e.target.value)}
                placeholder="https://instagram.com/p/example or paste link..."
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                What Makes This Great?
              </label>
              <textarea
                value={exampleDescription}
                onChange={(e) => setExampleDescription(e.target.value)}
                placeholder="Describe what you love about this content..."
                rows={3}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>
          </FormSection>

          {/* Brand Assets */}
          <FormSection 
            title="Brand Assets Provided" 
            description="What will you provide to creators?"
          >
            <div className="space-y-3">
              {assetOptions.map((asset) => (
                <label
                  key={asset}
                  className="flex items-center gap-3 p-4 bg-black rounded-lg cursor-pointer hover:bg-opacity-80 transition-all"
                >
                  <input
                    type="checkbox"
                    checked={assetsProvided.includes(asset)}
                    onChange={() => toggleAsset(asset)}
                    className="flex-shrink-0"
                  />
                  <span className="text-white">{asset}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Asset Delivery Method
              </label>
              <input
                type="text"
                value={assetDelivery}
                onChange={(e) => setAssetDelivery(e.target.value)}
                placeholder="e.g., Shipped to creator's address, Download link, Google Drive folder..."
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Asset Delivery Timeline
                </label>
                <input
                  type="text"
                  value={assetTimeline}
                  onChange={(e) => setAssetTimeline(e.target.value)}
                  placeholder="e.g., Within 3 business days"
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Asset Contact Person
                </label>
                <input
                  type="text"
                  value={assetContact}
                  onChange={(e) => setAssetContact(e.target.value)}
                  placeholder="e.g., Sarah at sarah@brand.com"
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                />
              </div>
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation
        currentStep={4}
        totalSteps={9}
        nextHref="/builder/timeline"
        prevHref="/builder/content"
        onSave={handleSave}
        canProceed={canProceed}
      />
    </div>
  );
}