'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign, CampaignGoal, AgeRange, Gender, Location } from '@/types/brand/campaign';
import { saveCampaign, getCurrentCampaign } from '@/lib/brand-storage';

const goalOptions: { id: CampaignGoal; label: string }[] = [
  { id: 'increase-brand-awareness', label: 'Increase brand awareness' },
  { id: 'drive-product-sales', label: 'Drive product sales' },
  { id: 'build-social-proof', label: 'Build social proof' },
  { id: 'generate-ugc', label: 'Generate user-generated content' },
  { id: 'launch-new-product', label: 'Launch new product' },
  { id: 'drive-traffic', label: 'Drive traffic to website/store' },
  { id: 'grow-social-following', label: 'Grow social following' },
  { id: 'event-promotion', label: 'Event promotion' },
  { id: 'other', label: 'Other' },
];

const ageRangeOptions: AgeRange[] = ['18-24', '25-34', '35-44', '45-54', '55+'];

const genderOptions: { id: Gender; label: string }[] = [
  { id: 'all', label: 'All Genders' },
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'non-binary', label: 'Non-binary' },
];

const locationOptions: { id: Location; label: string }[] = [
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'United Kingdom' },
  { id: 'canada', label: 'Canada' },
  { id: 'global', label: 'Global/Worldwide' },
  { id: 'specific', label: 'Specific Cities/Regions' },
];

const interestOptions = [
  'Fitness', 'Beauty', 'Tech', 'Fashion', 'Food', 'Travel',
  'Lifestyle', 'Parenting', 'Gaming', 'Business', 'Health', 'Home Decor',
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
  color: '#3A3A3A', marginBottom: 10,
};

const chip = (isSelected: boolean, accent: string = '#FFD700', textOnSelected: string = '#3A3A3A') => ({
  padding: '8px 16px', borderRadius: 8, border: 'none',
  fontWeight: 500 as const, fontSize: 14, cursor: 'pointer',
  backgroundColor: isSelected ? accent : '#F3F4F6',
  color: isSelected ? textOnSelected : '#6B7280',
  transition: 'background-color 0.15s, color 0.15s',
});

export default function ObjectivesPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<CampaignGoal[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [selectedAgeRanges, setSelectedAgeRanges] = useState<AgeRange[]>([]);
  const [selectedGender, setSelectedGender] = useState<Gender>('all');
  const [selectedLocation, setSelectedLocation] = useState<Location>('us');
  const [specificLocations, setSpecificLocations] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [additionalDemographics, setAdditionalDemographics] = useState('');
  const [keyMessages, setKeyMessages] = useState('');
  const [problemsSolved, setProblemsSolved] = useState('');
  const [uniqueValue, setUniqueValue] = useState('');
  const [talkingPoints, setTalkingPoints] = useState('');

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
    setSelectedGoals(existing.objectives.goals);
    setCustomGoal(existing.objectives.customGoal || '');
    setSelectedAgeRanges(existing.objectives.targetAgeRanges);
    setSelectedGender(existing.objectives.targetGender);
    setSelectedLocation(existing.objectives.targetLocation);
    setSpecificLocations(existing.objectives.specificLocations || '');
    setSelectedInterests(existing.objectives.interests);
    setAdditionalDemographics(existing.objectives.additionalDemographics || '');
    setKeyMessages(existing.objectives.keyMessages);
    setProblemsSolved(existing.objectives.problemsSolved || '');
    setUniqueValue(existing.objectives.uniqueValue || '');
    setTalkingPoints(existing.objectives.talkingPoints || '');
  }, [router]);

  const toggleGoal = (goal: CampaignGoal) => setSelectedGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  const toggleAgeRange = (age: AgeRange) => setSelectedAgeRanges(prev => prev.includes(age) ? prev.filter(a => a !== age) : [...prev, age]);
  const toggleInterest = (i: string) => setSelectedInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const canProceed = selectedGoals.length > 0 && selectedAgeRanges.length > 0 && keyMessages.trim().length > 0;

  const handleSave = () => {
    if (!campaign) return;
    campaign.objectives = {
      goals: selectedGoals,
      customGoal: selectedGoals.includes('other') ? customGoal : undefined,
      targetAgeRanges: selectedAgeRanges, targetGender: selectedGender,
      targetLocation: selectedLocation,
      specificLocations: selectedLocation === 'specific' ? specificLocations : undefined,
      interests: selectedInterests, additionalDemographics,
      keyMessages, problemsSolved, uniqueValue, talkingPoints,
    };
    campaign.currentStep = 2;
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  };

  const handleContinue = () => { handleSave(); router.push('/dashboard/brief/content'); };
  if (!campaign) return null;

  const checkRow = (isChecked: boolean) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
    backgroundColor: isChecked ? '#FFF9E0' : '#F9FAFB',
    border: `1px solid ${isChecked ? '#FFD700' : '#E5E7EB'}`,
    transition: 'border-color 0.15s, background-color 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={2} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Campaign Objectives & Audience</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Define your goals and target audience for this campaign</p>
          </div>

          {/* Goals */}
          <FormSection title="Campaign Goals" description="Select all that apply — what do you want to achieve?" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {goalOptions.map((goal) => {
                const isChecked = selectedGoals.includes(goal.id);
                return (
                  <label key={goal.id} style={checkRow(isChecked)}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleGoal(goal.id)}
                      style={{ accentColor: '#FFD700', width: 15, height: 15, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#3A3A3A' }}>{goal.label}</span>
                  </label>
                );
              })}
            </div>
            {selectedGoals.includes('other') && (
              <input type="text" value={customGoal} onChange={(e) => setCustomGoal(e.target.value)}
                placeholder="Describe your custom goal..." style={{ ...inputStyle, marginTop: 8 }} />
            )}
          </FormSection>

          {/* Target Audience */}
          <FormSection title="Target Audience" description="Who should creators reach with this campaign?" required>
            <div>
              <label style={labelStyle}>Age Range (select all that apply) *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {ageRangeOptions.map(age => (
                  <button key={age} onClick={() => toggleAgeRange(age)} style={chip(selectedAgeRanges.includes(age))}>
                    {age}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Gender</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {genderOptions.map(g => (
                  <button key={g.id} onClick={() => setSelectedGender(g.id)} style={chip(selectedGender === g.id)}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {locationOptions.map(loc => (
                  <button key={loc.id} onClick={() => setSelectedLocation(loc.id)}
                    style={{ ...chip(selectedLocation === loc.id), padding: '10px 16px', textAlign: 'left' }}>
                    {loc.label}
                  </button>
                ))}
              </div>
              {selectedLocation === 'specific' && (
                <input type="text" value={specificLocations} onChange={(e) => setSpecificLocations(e.target.value)}
                  placeholder="e.g., New York, Los Angeles, Miami" style={{ ...inputStyle, marginTop: 10 }} />
              )}
            </div>
            <div>
              <label style={labelStyle}>Interests (select all that apply)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {interestOptions.map(interest => (
                  <button key={interest} onClick={() => toggleInterest(interest)}
                    style={chip(selectedInterests.includes(interest), '#FF6B8A', '#FFFFFF')}>
                    {interest}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Additional Demographics (Optional)</label>
              <textarea value={additionalDemographics} onChange={(e) => setAdditionalDemographics(e.target.value)}
                placeholder="e.g., College-educated, urban professionals, eco-conscious consumers..."
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </FormSection>

          {/* Key Messages */}
          <FormSection title="Key Messages" description="What should creators emphasize in their content?" required>
            <div>
              <label style={labelStyle}>Main Message *</label>
              <textarea value={keyMessages} onChange={(e) => setKeyMessages(e.target.value)}
                placeholder="What's the main thing you want creators to communicate about your brand/product?"
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Problems Your Product Solves (Optional)</label>
              <textarea value={problemsSolved} onChange={(e) => setProblemsSolved(e.target.value)}
                placeholder="What pain points does your product address?"
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>What Makes Your Brand Unique? (Optional)</label>
              <textarea value={uniqueValue} onChange={(e) => setUniqueValue(e.target.value)}
                placeholder="What sets you apart from competitors?"
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Specific Talking Points (Optional)</label>
              <textarea value={talkingPoints} onChange={(e) => setTalkingPoints(e.target.value)}
                placeholder="Any specific features, benefits, or details creators should mention?"
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation currentStep={2} totalSteps={9} onContinue={handleContinue} prevHref="/dashboard/brief/campaign-type" onSave={handleSave} canProceed={canProceed} />
    </div>
  );
}
