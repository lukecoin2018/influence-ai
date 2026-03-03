'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign, PostingScheduleType, ApprovalType, PostingDate } from '@/types/brand/campaign';
import { saveCampaign, getCurrentCampaign } from '@/lib/brand-storage';

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
    if (!existing) {
      router.push('/builder/campaign-type');
      return;
    }
    
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

  const addSpecificDate = () => {
    setSpecificDates(prev => [...prev, { date: '', time: '' }]);
  };

  const updateSpecificDate = (index: number, field: keyof PostingDate, value: string) => {
    setSpecificDates(prev => prev.map((d, i) => 
      i === index ? { ...d, [field]: value } : d
    ));
  };

  const removeSpecificDate = (index: number) => {
    setSpecificDates(prev => prev.filter((_, i) => i !== index));
  };

  const canProceed = draftDueDate.length > 0 && finalDueDate.length > 0;

  const handleSave = () => {
    if (!campaign) return;

    campaign.timeline = {
      briefSentDate: new Date().toISOString().split('T')[0],
      draftDueDate,
      feedbackByDate,
      finalDueDate,
      revisionRounds,
      postingScheduleType,
      specificDates: postingScheduleType === 'specific-dates' ? specificDates : undefined,
      flexibleWindow: postingScheduleType === 'flexible-window' ? {
        startDate: flexibleStart,
        endDate: flexibleEnd
      } : undefined,
      approvalRequired
    };
    campaign.currentStep = 5;
    campaign.updatedAt = new Date().toISOString();
    
    saveCampaign(campaign);
  };

  const handleContinue = () => {
    handleSave();
    router.push('/builder/compensation');
  };

  if (!campaign) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <StepIndicator currentStep={5} totalSteps={9} />
      
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Timeline & Posting Schedule</h1>
            <p className="text-gray-400">Set deadlines and posting expectations</p>
          </div>

          {/* Content Creation Timeline */}
          <FormSection 
            title="Content Creation Timeline" 
            description="When do you need content submitted and finalized?"
            required
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Draft Due Date *
                </label>
                <input
                  type="date"
                  value={draftDueDate}
                  onChange={(e) => setDraftDueDate(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">When creators must submit drafts for review</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Feedback By Date
                </label>
                <input
                  type="date"
                  value={feedbackByDate}
                  onChange={(e) => setFeedbackByDate(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">When you'll provide feedback on drafts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Final Content Due Date *
                </label>
                <input
                  type="date"
                  value={finalDueDate}
                  onChange={(e) => setFinalDueDate(e.target.value)}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">When final content must be completed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Revision Rounds Included
                </label>
                <select
                  value={revisionRounds}
                  onChange={(e) => setRevisionRounds(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                >
                  <option value={1}>1 round</option>
                  <option value={2}>2 rounds</option>
                  <option value={3}>3 rounds</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How many times can content be revised</p>
              </div>
            </div>
          </FormSection>

          {/* Posting Schedule */}
          <FormSection 
            title="Posting Schedule" 
            description="When should creators post the content?"
          >
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => setPostingScheduleType('specific-dates')}
                  className={`
                    p-4 rounded-lg text-left transition-all
                    ${postingScheduleType === 'specific-dates'
                      ? 'bg-brand-yellow text-black'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <div className="font-semibold mb-1">Specific Dates</div>
                  <div className="text-sm opacity-80">Exact posting dates/times</div>
                </button>

                <button
                  onClick={() => setPostingScheduleType('flexible-window')}
                  className={`
                    p-4 rounded-lg text-left transition-all
                    ${postingScheduleType === 'flexible-window'
                      ? 'bg-brand-yellow text-black'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <div className="font-semibold mb-1">Flexible Window</div>
                  <div className="text-sm opacity-80">Post within date range</div>
                </button>

                <button
                  onClick={() => setPostingScheduleType('creator-discretion')}
                  className={`
                    p-4 rounded-lg text-left transition-all
                    ${postingScheduleType === 'creator-discretion'
                      ? 'bg-brand-yellow text-black'
                      : 'bg-black text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <div className="font-semibold mb-1">Creator's Discretion</div>
                  <div className="text-sm opacity-80">Creator chooses timing</div>
                </button>
              </div>

              {/* Specific Dates UI */}
              {postingScheduleType === 'specific-dates' && (
                <div className="mt-4">
                  <button
                    onClick={addSpecificDate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-opacity-80 transition-all mb-4"
                  >
                    <Plus className="w-4 h-4" />
                    Add Posting Date
                  </button>

                  {specificDates.length > 0 ? (
                    <div className="space-y-3">
                      {specificDates.map((posting, index) => (
                        <div key={index} className="bg-black p-4 rounded-lg flex items-center gap-4">
                          <div className="flex-1 grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Date
                              </label>
                              <input
                                type="date"
                                value={posting.date}
                                onChange={(e) => updateSpecificDate(index, 'date', e.target.value)}
                                className="w-full px-3 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                Time
                              </label>
                              <input
                                type="time"
                                value={posting.time}
                                onChange={(e) => updateSpecificDate(index, 'time', e.target.value)}
                                className="w-full px-3 py-2 bg-brand-grey border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => removeSpecificDate(index)}
                            className="p-2 text-gray-400 hover:text-brand-pink transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Click "Add Posting Date" to specify when content should go live
                    </div>
                  )}
                </div>
              )}

              {/* Flexible Window UI */}
              {postingScheduleType === 'flexible-window' && (
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Window Start Date
                    </label>
                    <input
                      type="date"
                      value={flexibleStart}
                      onChange={(e) => setFlexibleStart(e.target.value)}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Window End Date
                    </label>
                    <input
                      type="date"
                      value={flexibleEnd}
                      onChange={(e) => setFlexibleEnd(e.target.value)}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Creator's Discretion UI */}
              {postingScheduleType === 'creator-discretion' && (
                <div className="bg-brand-blue bg-opacity-10 border border-brand-blue rounded-lg p-4 mt-4">
                  <p className="text-brand-blue text-sm">
                    Creators will post within the campaign period at their discretion. They should notify you when content goes live.
                  </p>
                </div>
              )}
            </div>
          </FormSection>

          {/* Content Approval */}
          <FormSection 
            title="Content Approval" 
            description="Do you need to approve content before posting?"
          >
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => setApprovalRequired('required')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${approvalRequired === 'required'
                    ? 'bg-brand-pink text-white'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Required</div>
                <div className="text-sm opacity-80">Must approve before posting</div>
              </button>

              <button
                onClick={() => setApprovalRequired('recommended')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${approvalRequired === 'recommended'
                    ? 'bg-brand-pink text-white'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Recommended</div>
                <div className="text-sm opacity-80">Submit for feedback first</div>
              </button>

              <button
                onClick={() => setApprovalRequired('not-required')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${approvalRequired === 'not-required'
                    ? 'bg-brand-pink text-white'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-1">Not Required</div>
                <div className="text-sm opacity-80">Post at discretion</div>
              </button>
            </div>
          </FormSection>
        </div>
      </div>

      <Navigation
        currentStep={5}
        totalSteps={9}
        nextHref="/builder/compensation"
        prevHref="/builder/brand"
        onSave={handleSave}
        canProceed={canProceed}
      />
    </div>
  );
}
