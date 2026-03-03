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

export default function CreatorsPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
    const existingList = getCreatorList(existing.id);
    if (existingList) setCreators(existingList.creators);
  }, [router]);

  const addCreator = () => {
    setCreators(prev => [...prev, {
      id: generateId(), name: '', platform: 'instagram',
      handle: '', email: '', notes: '', status: 'sent',
    }]);
  };

  const updateCreator = (id: string, field: keyof Creator, value: any) => {
    setCreators(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCreator = (id: string) => {
    setCreators(prev => prev.filter(c => c.id !== id));
  };

  const handleSave = () => {
    if (!campaign) return;
    const creatorList: CreatorList = {
      campaignId: campaign.id,
      creators: creators.filter(c => c.name && c.email),
    };
    saveCreatorList(creatorList);
  };

  const handleContinue = () => { handleSave(); router.push('/dashboard/brief/send'); };
  const canProceed = creators.some(c => c.name && c.email);
  if (!campaign) return null;

  const readyCount = creators.filter(c => c.name && c.email).length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={8} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Creator Shortlist</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Add the creators you want to send this campaign brief to</p>
          </div>

          <FormSection title="Add Creators" description="Build your list of creators for this campaign">
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={addCreator} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8, border: 'none',
                backgroundColor: '#FFD700', color: '#3A3A3A',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                <Plus style={{ width: 16, height: 16 }} />
                Add Creator
              </button>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8,
                border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
                color: '#6B7280', fontSize: 14, cursor: 'pointer',
              }}>
                <Upload style={{ width: 16, height: 16 }} />
                Import CSV
                <span style={{ fontSize: 11, opacity: 0.7 }}>(Coming Soon)</span>
              </button>
            </div>

            {creators.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {creators.map((creator, index) => {
                  const isReady = creator.name && creator.email;
                  return (
                    <div key={creator.id} style={{
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${isReady ? '#FFD700' : '#E5E7EB'}`,
                      borderRadius: 12, padding: 20,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div>
                              <label style={labelStyle}>Creator Name *</label>
                              <input type="text" value={creator.name}
                                onChange={(e) => updateCreator(creator.id, 'name', e.target.value)}
                                placeholder="e.g., Sarah Johnson" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Platform</label>
                              <select value={creator.platform}
                                onChange={(e) => updateCreator(creator.id, 'platform', e.target.value)}
                                style={inputStyle}>
                                <option value="instagram">Instagram</option>
                                <option value="tiktok">TikTok</option>
                                <option value="youtube">YouTube</option>
                              </select>
                            </div>
                            <div>
                              <label style={labelStyle}>Handle/Username</label>
                              <input type="text" value={creator.handle}
                                onChange={(e) => updateCreator(creator.id, 'handle', e.target.value)}
                                placeholder="e.g., @sarahjohnson" style={inputStyle} />
                            </div>
                            <div>
                              <label style={labelStyle}>Email Address *</label>
                              <input type="email" value={creator.email}
                                onChange={(e) => updateCreator(creator.id, 'email', e.target.value)}
                                placeholder="e.g., sarah@email.com" style={inputStyle} />
                            </div>
                          </div>
                          <div>
                            <label style={labelStyle}>Notes (Optional)</label>
                            <textarea value={creator.notes}
                              onChange={(e) => updateCreator(creator.id, 'notes', e.target.value)}
                              placeholder="e.g., Great engagement rate, perfect fit for beauty content..."
                              rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                          </div>
                        </div>
                        <button onClick={() => removeCreator(creator.id)} style={{
                          padding: 8, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                        }}>
                          <Trash2 style={{ width: 18, height: 18, color: '#FF6B8A' }} />
                        </button>
                      </div>

                      {/* Footer */}
                      <div style={{
                        marginTop: 14, paddingTop: 12,
                        borderTop: '1px solid #E5E7EB',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>Creator #{index + 1}</span>
                        {isReady && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#FFD700', fontWeight: 600 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#FFD700' }} />
                            Ready to send
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                backgroundColor: '#F9FAFB', borderRadius: 12,
                border: '2px dashed #E5E7EB',
              }}>
                <Plus style={{ width: 40, height: 40, color: '#D1D5DB', margin: '0 auto 12px' }} />
                <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 16 }}>No creators added yet</p>
                <button onClick={addCreator} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  backgroundColor: '#FFD700', color: '#3A3A3A',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  <Plus style={{ width: 16, height: 16 }} />
                  Add Your First Creator
                </button>
              </div>
            )}

            {/* Summary */}
            {creators.length > 0 && (
              <div style={{
                marginTop: 16, padding: '14px 18px',
                backgroundColor: '#EBF7FF', border: '1px solid #A3D9FF', borderRadius: 10,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#3AAFF4' }}>
                  {readyCount} of {creators.length} creators ready to receive brief
                </span>
              </div>
            )}
          </FormSection>
        </div>
      </div>

      <Navigation currentStep={8} totalSteps={9} onContinue={handleContinue} prevHref="/dashboard/brief/review" onSave={handleSave} canProceed={canProceed} />
    </div>
  );
}
