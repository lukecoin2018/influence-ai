'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { campaignTypes } from '@/data/brand/campaign-types';
import { Campaign, CampaignType } from '@/types/brand/campaign';
import { saveCampaign, getCurrentCampaign, generateId } from '@/lib/brand-storage';

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

export default function CampaignTypePage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<CampaignType | ''>('');
  const [campaignName, setCampaignName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (existing) {
      setSelectedType(existing.basics.campaignType);
      setCampaignName(existing.basics.campaignName);
      setBrandName(existing.basics.brandName);
      setStartDate(existing.basics.startDate);
      setEndDate(existing.basics.endDate);
      setContactName(existing.basics.contactName);
      setContactEmail(existing.basics.contactEmail);
      setContactPhone(existing.basics.contactPhone);
    }
  }, []);

  const canProceed = selectedType && campaignName && brandName && startDate && endDate && contactName && contactEmail;

  const handleSave = () => {
    if (!selectedType) return;
    const existing = getCurrentCampaign();
    const campaign: Campaign = existing || {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 1,
      basics: { campaignType: selectedType as CampaignType, campaignName: '', brandName: '', startDate: '', endDate: '', contactName: '', contactEmail: '', contactPhone: '' },
      objectives: { goals: [], targetAgeRanges: [], targetGender: 'all', targetLocation: 'us', interests: [], keyMessages: '' },
      content: { deliverables: [], mustInclude: { productVisible: false, brandLogo: false, specificHashtags: [], tagBrandAccount: '', mentionFeatures: '', callToAction: '', ftcDisclosure: false }, restrictions: { noCompetitors: false, noAlcoholDrugs: false, noProfanity: false, noControversial: false }, creativeFreedom: 'medium' },
      brand: { voiceTone: [], visualStyle: [], dos: '', donts: '', contentExamples: [], assetsProvided: [], assetDelivery: '', assetTimeline: '', assetContact: '' },
      timeline: { briefSentDate: new Date().toISOString().split('T')[0], draftDueDate: '', feedbackByDate: '', finalDueDate: '', revisionRounds: 2, postingScheduleType: 'flexible-window', approvalRequired: 'recommended' },
      compensation: { type: 'fixed-rate', paymentStructure: 'on-completion', paymentTimeline: '30 days', paymentMethod: 'PayPal', usageRightsDuration: '90', usageTypes: [], exclusivity: 'none', contentOwnership: 'creator-retains' },
    };
    campaign.basics = { campaignType: selectedType as CampaignType, campaignName, brandName, startDate, endDate, contactName, contactEmail, contactPhone };
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  };

  const handleContinue = () => { handleSave(); router.push('/dashboard/brief/objectives'); };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={1} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Let's Create Your Campaign Brief</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Start by selecting your campaign type and providing basic information</p>
          </div>

          {/* Campaign Type */}
          <FormSection title="Campaign Type" description="Choose the type that best matches your campaign goals" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {campaignTypes.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <button key={type.id} onClick={() => setSelectedType(type.id)} style={{
                    textAlign: 'left', padding: 16, borderRadius: 10,
                    border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
                    backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
                    cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ fontSize: 28 }}>{type.icon}</span>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontWeight: 600, color: '#3A3A3A', margin: '0 0 4px', fontSize: 15 }}>{type.name}</h3>
                        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{type.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </FormSection>

          {/* Campaign Basics */}
          <FormSection title="Campaign Basics" description="Provide essential information about your campaign" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Campaign Name (Internal Reference) *</label>
                <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Summer 2026 Launch" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Brand Name *</label>
                <input type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Your Company Name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Campaign Start Date *</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Campaign End Date *</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </FormSection>

          {/* Primary Contact */}
          <FormSection title="Primary Contact" description="Who should creators reach out to with questions?" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Contact Name *</label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g., John Smith" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g., john@brand.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone (Optional)</label>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g., (555) 123-4567" style={inputStyle} />
              </div>
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation currentStep={1} totalSteps={9} onContinue={handleContinue} onSave={handleSave} canProceed={!!canProceed} />
    </div>
  );
}
