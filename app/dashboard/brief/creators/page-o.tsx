'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Upload } from 'lucide-react';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign } from '@/types/brand/campaign';
import { Creator, CreatorList } from '@/types/brand/creator';
import { getCurrentCampaign, saveCreatorList, getCreatorList, generateId } from '@/lib/brand-storage';

export default function CreatorsPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) {
      router.push('/builder/campaign-type');
      return;
    }
    
    setCampaign(existing);

    // Load existing creator list
    const existingList = getCreatorList(existing.id);
    if (existingList) {
      setCreators(existingList.creators);
    }
  }, [router]);

  const addCreator = () => {
    setCreators(prev => [...prev, {
      id: generateId(),
      name: '',
      platform: 'instagram',
      handle: '',
      email: '',
      notes: '',
      status: 'sent'
    }]);
  };

  const updateCreator = (id: string, field: keyof Creator, value: any) => {
    setCreators(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const removeCreator = (id: string) => {
    setCreators(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = () => {
    if (!campaign) return;

    const creatorList: CreatorList = {
      campaignId: campaign.id,
      creators: creators.filter(c => c.name && c.email) // Only save creators with name and email
    };

    saveCreatorList(creatorList);
  };

  const handleContinue = () => {
    handleSave();
    router.push('/builder/send');
  };

  const canProceed = creators.some(c => c.name && c.email);

  if (!campaign) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <StepIndicator currentStep={8} totalSteps={9} />
      
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Creator Shortlist</h1>
            <p className="text-gray-400">Add the creators you want to send this campaign brief to</p>
          </div>

          <FormSection 
            title="Add Creators" 
            description="Build your list of creators for this campaign"
          >
            <div className="flex gap-4 mb-6">
              <button
                onClick={addCreator}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black rounded-lg font-semibold hover:bg-yellow-600 transition-all"
              >
                <Plus className="w-5 h-5" />
                Add Creator
              </button>

              <button
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-lg font-semibold hover:bg-opacity-80 transition-all"
              >
                <Upload className="w-5 h-5" />
                Import CSV
                <span className="text-xs opacity-75">(Coming Soon)</span>
              </button>
            </div>

            {creators.length > 0 ? (
              <div className="space-y-4">
                {creators.map((creator, index) => (
                  <div key={creator.id} className="bg-black p-6 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-4">
                        {/* Row 1: Name and Platform */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Creator Name *
                            </label>
                            <input
                              type="text"
                              value={creator.name}
                              onChange={(e) => updateCreator(creator.id, 'name', e.target.value)}
                              placeholder="e.g., Sarah Johnson"
                              className="w-full px-4 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Platform
                            </label>
                            <select
                              value={creator.platform}
                              onChange={(e) => updateCreator(creator.id, 'platform', e.target.value)}
                              className="w-full px-4 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                            >
                              <option value="instagram">Instagram</option>
                              <option value="tiktok">TikTok</option>
                              <option value="youtube">YouTube</option>
                            </select>
                          </div>
                        </div>

                        {/* Row 2: Handle and Email */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Handle/Username
                            </label>
                            <input
                              type="text"
                              value={creator.handle}
                              onChange={(e) => updateCreator(creator.id, 'handle', e.target.value)}
                              placeholder="e.g., @sarahjohnson"
                              className="w-full px-4 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Email Address *
                            </label>
                            <input
                              type="email"
                              value={creator.email}
                              onChange={(e) => updateCreator(creator.id, 'email', e.target.value)}
                              placeholder="e.g., sarah@email.com"
                              className="w-full px-4 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Row 3: Notes */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Notes (Optional)
                          </label>
                          <textarea
                            value={creator.notes}
                            onChange={(e) => updateCreator(creator.id, 'notes', e.target.value)}
                            placeholder="e.g., Great engagement rate, perfect fit for beauty content..."
                            rows={2}
                            className="w-full px-4 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => removeCreator(creator.id)}
                        className="p-2 text-gray-400 hover:text-brand-pink transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Creator number badge */}
                    <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
                      <span className="text-sm text-gray-500">Creator #{index + 1}</span>
                      {creator.name && creator.email && (
                        <span className="inline-flex items-center gap-2 text-xs text-brand-yellow">
                          <div className="w-2 h-2 rounded-full bg-brand-yellow" />
                          Ready to send
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-black rounded-lg border border-gray-800 border-dashed">
                <Plus className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No creators added yet</p>
                <button
                  onClick={addCreator}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black rounded-lg font-semibold hover:bg-yellow-600 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Creator
                </button>
              </div>
            )}

            {/* Summary */}
            {creators.length > 0 && (
              <div className="mt-6 p-4 bg-brand-blue bg-opacity-10 border border-brand-blue rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-brand-blue font-semibold">
                    {creators.filter(c => c.name && c.email).length} of {creators.length} creators ready to receive brief
                  </span>
                </div>
              </div>
            )}
          </FormSection>
        </div>
      </div>

      <Navigation
        currentStep={8}
        totalSteps={9}
        nextHref="/builder/send"
        prevHref="/builder/review"
        onSave={handleSave}
        canProceed={canProceed}
      />
    </div>
  );
}