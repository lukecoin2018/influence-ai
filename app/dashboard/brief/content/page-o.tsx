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
  { id: 'other', label: 'Other' }
];

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
    if (!existing) {
      router.push('/builder/campaign-type');
      return;
    }
    
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
    setDeliverables(prev => prev.map((d, i) => 
      i === index ? { ...d, [field]: value } : d
    ));
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(prev => prev.filter((_, i) => i !== index));
  };

  const canProceed = deliverables.length > 0;

  const handleSave = () => {
    if (!campaign) return;

    campaign.content = {
      deliverables,
      mustInclude: {
        productVisible,
        brandLogo,
        specificHashtags: hashtags.split(',').map(h => h.trim()).filter(Boolean),
        tagBrandAccount: brandAccount,
        mentionFeatures,
        callToAction,
        ftcDisclosure
      },
      restrictions: {
        noCompetitors,
        noAlcoholDrugs,
        noProfanity,
        noControversial,
        custom: customRestriction
      },
      creativeFreedom
    };
    campaign.currentStep = 3;
    campaign.updatedAt = new Date().toISOString();
    
    saveCampaign(campaign);
  };

  const handleContinue = () => {
    handleSave();
    router.push('/builder/brand');
  };

  if (!campaign) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <StepIndicator currentStep={3} totalSteps={9} />
      
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Content Requirements</h1>
            <p className="text-gray-400">Specify what content you need and any requirements</p>
          </div>

          {/* Deliverables */}
          <FormSection 
            title="Deliverables" 
            description="What content do you need creators to produce?"
            required
          >
            {/* Add deliverable buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              {deliverableOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => addDeliverable(option.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-opacity-80 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {option.label}
                </button>
              ))}
            </div>

            {/* Deliverables list */}
            {deliverables.length > 0 ? (
              <div className="space-y-3">
                {deliverables.map((deliverable, index) => (
                  <div key={index} className="bg-black p-4 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Type
                          </label>
                          <input
                            type="text"
                            value={deliverableOptions.find(o => o.id === deliverable.type)?.label || deliverable.customType}
                            disabled={deliverable.type !== 'other'}
                            onChange={(e) => updateDeliverable(index, 'customType', e.target.value)}
                            className="w-full px-3 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={deliverable.quantity}
                            onChange={(e) => updateDeliverable(index, 'quantity', parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Format (Optional)
                          </label>
                          <input
                            type="text"
                            value={deliverable.format || ''}
                            onChange={(e) => updateDeliverable(index, 'format', e.target.value)}
                            placeholder="e.g., 9:16 vertical"
                            className="w-full px-3 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Length (Optional)
                          </label>
                          <input
                            type="text"
                            value={deliverable.length || ''}
                            onChange={(e) => updateDeliverable(index, 'length', e.target.value)}
                            placeholder="e.g., 30-60 seconds"
                            className="w-full px-3 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => removeDeliverable(index)}
                        className="p-2 text-gray-400 hover:text-brand-pink transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Click the buttons above to add deliverables
              </div>
            )}
          </FormSection>

          {/* Must Include */}
          <FormSection 
            title="Content Must Include" 
            description="Required elements in all creator content"
          >
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productVisible}
                  onChange={(e) => setProductVisible(e.target.checked)}
                />
                <span className="text-white">Product visible in frame</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={brandLogo}
                  onChange={(e) => setBrandLogo(e.target.checked)}
                />
                <span className="text-white">Brand logo visible</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ftcDisclosure}
                  onChange={(e) => setFtcDisclosure(e.target.checked)}
                />
                <span className="text-white">FTC disclosure (#ad, #sponsored, etc.)</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Specific Hashtags
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="e.g., #YourBrand, #CampaignName"
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tag Brand Account
              </label>
              <input
                type="text"
                value={brandAccount}
                onChange={(e) => setBrandAccount(e.target.value)}
                placeholder="e.g., @yourbrand"
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mention Specific Features
              </label>
              <textarea
                value={mentionFeatures}
                onChange={(e) => setMentionFeatures(e.target.value)}
                placeholder="e.g., Waterproof design, 24-hour battery life..."
                rows={3}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Call-to-Action
              </label>
              <input
                type="text"
                value={callToAction}
                onChange={(e) => setCallToAction(e.target.value)}
                placeholder="e.g., Use code SAVE20, Visit link in bio"
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>
          </FormSection>

          {/* Content Restrictions */}
          <FormSection 
            title="Content Restrictions" 
            description="Things creators should avoid"
          >
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noCompetitors}
                  onChange={(e) => setNoCompetitors(e.target.checked)}
                />
                <span className="text-white">No competitor brands visible</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noAlcoholDrugs}
                  onChange={(e) => setNoAlcoholDrugs(e.target.checked)}
                />
                <span className="text-white">No alcohol/drugs in frame</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noProfanity}
                  onChange={(e) => setNoProfanity(e.target.checked)}
                />
                <span className="text-white">No profanity</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noControversial}
                  onChange={(e) => setNoControversial(e.target.checked)}
                />
                <span className="text-white">No controversial topics</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Other Restrictions
              </label>
              <textarea
                value={customRestriction}
                onChange={(e) => setCustomRestriction(e.target.value)}
                placeholder="Any other content restrictions..."
                rows={3}
                className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
              />
            </div>
          </FormSection>

          {/* Creative Freedom */}
          <FormSection 
            title="Creative Freedom Level" 
            description="How much flexibility do creators have?"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => setCreativeFreedom('high')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${creativeFreedom === 'high'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">High Freedom</div>
                <div className="text-sm opacity-80">Creator's authentic style, minimal restrictions</div>
              </button>

              <button
                onClick={() => setCreativeFreedom('medium')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${creativeFreedom === 'medium'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Medium Freedom</div>
                <div className="text-sm opacity-80">Some guidelines but flexible on execution</div>
              </button>

              <button
                onClick={() => setCreativeFreedom('structured')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${creativeFreedom === 'structured'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Structured</div>
                <div className="text-sm opacity-80">Specific shot list and talking points required</div>
              </button>
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation
        currentStep={3}
        totalSteps={9}
        nextHref="/builder/brand"
        prevHref="/builder/objectives"
        onSave={handleSave}
        canProceed={canProceed}
      />
    </div>
  );
}