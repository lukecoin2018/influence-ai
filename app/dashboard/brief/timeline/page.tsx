'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign, PostingScheduleType, ApprovalType, PostingDate } from '@/types/brand/campaign';
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

const hintStyle = { fontSize: 12, color: '#9CA3AF', marginTop: 4 };

const chipBtn = (isSelected: boolean, accent = '#FFD700') => ({
  padding: '12px 16px', borderRadius: 8, textAlign: 'left' as const,
  border: `2px solid ${isSelected ? accent : '#E5E7EB'}`,
  backgroundColor: isSelected ? (accent === '#FFD700' ? '#FFF9E0' : '#FFF0F5') : '#FFFFFF',
  cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s',
});

export default function TimelinePage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [draftDueDate, setDraftDueDate] = useState('');
  const [feedbackByDate, setFeedbackByDate] = useState('');
  const [finalDueDate, setFinalDueDate] = useState('');
  const [revisionRounds, setRevisionRounds] = useState(2);
  const [postingScheduleType, setPostingScheduleType] = useState<PostingScheduleType>('flexible-window');
  const [specificDates, setSpecificDates] = useState<PostingDate[]>([]);
  const [flexibleStart, setFlexibleStart] = useState('');
  const [flexibleEnd, setFlexibleEnd] = useState('');
  const [approvalRequired, setApprovalRequired] = useState<ApprovalType>('recommended');

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
    setDraftDueDate(existing.timeline.draftDueDate);
    setFeedbackByDate(existing.timeline.feedbackByDate);
    setFinalDueDate(existing.timeline.finalDueDate);
    setRevisionRounds(existing.timeline.revisionRounds);
    setPostingScheduleType(existing.timeline.postingScheduleType);
    setSpecificDates(existing.timeline.specificDates || []);
    setFlexibleStart(existing.timeline.flexibleWindow?.startDate || '');
    setFlexibleEnd(existing.timeline.flexibleWindow?.endDate || '');
    setApprovalRequired(existing.timeline.approvalRequired);
  }, [router]);

  const addSpecificDate = () => setSpecificDates(prev => [...prev, { date: '', time: '' }]);
  const updateSpecificDate = (index: number, field: keyof PostingDate, value: string) => {
    setSpecificDates(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };
  const removeSpecificDate = (index: number) => setSpecificDates(prev => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!campaign) return;
    campaign.timeline = {
      briefSentDate: new Date().toISOString().split('T')[0],
      draftDueDate, feedbackByDate, finalDueDate, revisionRounds,
      postingScheduleType,
      specificDates: postingScheduleType === 'specific-dates' ? specificDates : undefined,
      flexibleWindow: postingScheduleType === 'flexible-window' ? { startDate: flexibleStart, endDate: flexibleEnd } : undefined,
      approvalRequired,
    };
    campaign.currentStep = 5;
    campaign.updatedAt = new Date().toISOString();
    saveCampaign(campaign);
  };

  const handleContinue = () => { handleSave(); router.push('/dashboard/brief/compensation'); };
  if (!campaign) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={5} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Timeline & Posting Schedule</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Set deadlines and posting expectations</p>
          </div>

          {/* Content Creation Timeline */}
          <FormSection title="Content Creation Timeline" description="When do you need content submitted and finalized?" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Draft Due Date *</label>
                <input type="date" value={draftDueDate} onChange={(e) => setDraftDueDate(e.target.value)} style={inputStyle} />
                <p style={hintStyle}>When creators must submit drafts for review</p>
              </div>
              <div>
                <label style={labelStyle}>Feedback By Date</label>
                <input type="date" value={feedbackByDate} onChange={(e) => setFeedbackByDate(e.target.value)} style={inputStyle} />
                <p style={hintStyle}>When you'll provide feedback on drafts</p>
              </div>
              <div>
                <label style={labelStyle}>Final Content Due Date *</label>
                <input type="date" value={finalDueDate} onChange={(e) => setFinalDueDate(e.target.value)} style={inputStyle} />
                <p style={hintStyle}>When final content must be completed</p>
              </div>
              <div>
                <label style={labelStyle}>Revision Rounds Included</label>
                <select value={revisionRounds} onChange={(e) => setRevisionRounds(parseInt(e.target.value))} style={inputStyle}>
                  <option value={1}>1 round</option>
                  <option value={2}>2 rounds</option>
                  <option value={3}>3 rounds</option>
                </select>
                <p style={hintStyle}>How many times can content be revised</p>
              </div>
            </div>
          </FormSection>

          {/* Posting Schedule */}
          <FormSection title="Posting Schedule" description="When should creators post the content?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { id: 'specific-dates', label: 'Specific Dates', sub: 'Exact posting dates/times' },
                { id: 'flexible-window', label: 'Flexible Window', sub: 'Post within date range' },
                { id: 'creator-discretion', label: "Creator's Discretion", sub: 'Creator chooses timing' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setPostingScheduleType(opt.id as PostingScheduleType)}
                  style={chipBtn(postingScheduleType === opt.id)}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            {postingScheduleType === 'specific-dates' && (
              <div style={{ marginTop: 16 }}>
                <button onClick={addSpecificDate} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 8, border: 'none',
                  backgroundColor: '#3AAFF4', color: '#FFFFFF',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 12,
                }}>
                  <Plus style={{ width: 14, height: 14 }} /> Add Posting Date
                </button>
                {specificDates.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {specificDates.map((posting, index) => (
                      <div key={index} style={{
                        backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
                        borderRadius: 10, padding: 14,
                        display: 'flex', alignItems: 'center', gap: 14,
                      }}>
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <label style={labelStyle}>Date</label>
                            <input type="date" value={posting.date}
                              onChange={(e) => updateSpecificDate(index, 'date', e.target.value)} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Time</label>
                            <input type="time" value={posting.time}
                              onChange={(e) => updateSpecificDate(index, 'time', e.target.value)} style={inputStyle} />
                          </div>
                        </div>
                        <button onClick={() => removeSpecificDate(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                          <Trash2 style={{ width: 16, height: 16, color: '#FF6B8A' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>
                    Click "Add Posting Date" to specify when content should go live
                  </p>
                )}
              </div>
            )}

            {postingScheduleType === 'flexible-window' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <label style={labelStyle}>Window Start Date</label>
                  <input type="date" value={flexibleStart} onChange={(e) => setFlexibleStart(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Window End Date</label>
                  <input type="date" value={flexibleEnd} onChange={(e) => setFlexibleEnd(e.target.value)} style={inputStyle} />
                </div>
              </div>
            )}

            {postingScheduleType === 'creator-discretion' && (
              <div style={{
                marginTop: 16, padding: '14px 18px',
                backgroundColor: '#EBF7FF', border: '1px solid #A3D9FF', borderRadius: 10,
              }}>
                <p style={{ fontSize: 13, color: '#3AAFF4', margin: 0 }}>
                  Creators will post within the campaign period at their discretion. They should notify you when content goes live.
                </p>
              </div>
            )}
          </FormSection>

          {/* Content Approval */}
          <FormSection title="Content Approval" description="Do you need to approve content before posting?">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { id: 'required', label: 'Required', sub: 'Must approve before posting' },
                { id: 'recommended', label: 'Recommended', sub: 'Submit for feedback first' },
                { id: 'not-required', label: 'Not Required', sub: 'Post at discretion' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setApprovalRequired(opt.id as ApprovalType)}
                  style={chipBtn(approvalRequired === opt.id, '#FF6B8A')}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation currentStep={5} totalSteps={9} onContinue={handleContinue} prevHref="/dashboard/brief/brand" onSave={handleSave} canProceed={draftDueDate.length > 0 && finalDueDate.length > 0} />
    </div>
  );
}
