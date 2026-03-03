'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Edit2, FileText } from 'lucide-react';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign } from '@/types/brand/campaign';
import { getCurrentCampaign, saveCampaign } from '@/lib/brand-storage';

export default function ReviewPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) {
      router.push('/builder/campaign-type');
      return;
    }
    
    setCampaign(existing);
  }, [router]);

  const handleGeneratePDF = async () => {
    if (!campaign) return;

    setIsGenerating(true);

    try {
      // Call API to generate PDF
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaign }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);

      // Save campaign with generated flag
      campaign.currentStep = 7;
      campaign.updatedAt = new Date().toISOString();
      saveCampaign(campaign);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!pdfUrl) return;

    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${campaign?.basics.campaignName || 'campaign'}-brief.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleContinue = () => {
    router.push('/builder/creators');
  };

  if (!campaign) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <StepIndicator currentStep={7} totalSteps={9} />
      
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Review Your Campaign Brief</h1>
            <p className="text-gray-400">Review all details before generating your professional brief</p>
          </div>

          {/* Campaign Basics */}
          <FormSection title="Campaign Basics">
            <div className="space-y-3">
              <ReviewItem label="Campaign Type" value={campaign.basics.campaignType} />
              <ReviewItem label="Campaign Name" value={campaign.basics.campaignName} />
              <ReviewItem label="Brand Name" value={campaign.basics.brandName} />
              <ReviewItem label="Duration" value={`${campaign.basics.startDate} to ${campaign.basics.endDate}`} />
              <ReviewItem label="Contact" value={`${campaign.basics.contactName} (${campaign.basics.contactEmail})`} />
            </div>
            <button
              onClick={() => router.push('/builder/campaign-type')}
              className="mt-4 inline-flex items-center gap-2 text-brand-blue hover:text-brand-yellow transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </FormSection>

          {/* Objectives */}
          <FormSection title="Campaign Objectives">
            <div className="space-y-3">
              <ReviewItem label="Goals" value={campaign.objectives.goals.join(', ')} />
              <ReviewItem label="Target Age" value={campaign.objectives.targetAgeRanges.join(', ')} />
              <ReviewItem label="Target Gender" value={campaign.objectives.targetGender} />
              <ReviewItem label="Location" value={campaign.objectives.targetLocation} />
              <ReviewItem label="Interests" value={campaign.objectives.interests.join(', ')} />
              <ReviewItem label="Key Messages" value={campaign.objectives.keyMessages} multiline />
            </div>
            <button
              onClick={() => router.push('/builder/objectives')}
              className="mt-4 inline-flex items-center gap-2 text-brand-blue hover:text-brand-yellow transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </FormSection>

          {/* Content Requirements */}
          <FormSection title="Content Requirements">
            <div className="space-y-3">
              <ReviewItem 
                label="Deliverables" 
                value={campaign.content.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ')} 
              />
              <ReviewItem label="Creative Freedom" value={campaign.content.creativeFreedom} />
              <ReviewItem 
                label="Must Include" 
                value={[
                  campaign.content.mustInclude.productVisible && 'Product visible',
                  campaign.content.mustInclude.brandLogo && 'Brand logo',
                  campaign.content.mustInclude.ftcDisclosure && 'FTC disclosure',
                ].filter(Boolean).join(', ')} 
              />
              {campaign.content.mustInclude.specificHashtags.length > 0 && (
                <ReviewItem label="Hashtags" value={campaign.content.mustInclude.specificHashtags.join(', ')} />
              )}
            </div>
            <button
              onClick={() => router.push('/builder/content')}
              className="mt-4 inline-flex items-center gap-2 text-brand-blue hover:text-brand-yellow transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </FormSection>

          {/* Brand Guidelines */}
          <FormSection title="Brand Guidelines">
            <div className="space-y-3">
              <ReviewItem label="Voice & Tone" value={campaign.brand.voiceTone.join(', ')} />
              <ReviewItem label="Visual Style" value={campaign.brand.visualStyle.join(', ')} />
              {campaign.brand.dos && <ReviewItem label="Do's" value={campaign.brand.dos} multiline />}
              {campaign.brand.donts && <ReviewItem label="Don'ts" value={campaign.brand.donts} multiline />}
              <ReviewItem label="Assets Provided" value={campaign.brand.assetsProvided.join(', ')} />
            </div>
            <button
              onClick={() => router.push('/builder/brand')}
              className="mt-4 inline-flex items-center gap-2 text-brand-blue hover:text-brand-yellow transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </FormSection>

          {/* Timeline */}
          <FormSection title="Timeline & Posting">
            <div className="space-y-3">
              <ReviewItem label="Draft Due" value={campaign.timeline.draftDueDate} />
              <ReviewItem label="Final Due" value={campaign.timeline.finalDueDate} />
              <ReviewItem label="Revision Rounds" value={campaign.timeline.revisionRounds.toString()} />
              <ReviewItem label="Posting Schedule" value={campaign.timeline.postingScheduleType} />
              <ReviewItem label="Approval Required" value={campaign.timeline.approvalRequired} />
            </div>
            <button
              onClick={() => router.push('/builder/timeline')}
              className="mt-4 inline-flex items-center gap-2 text-brand-blue hover:text-brand-yellow transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </FormSection>

          {/* Compensation */}
          <FormSection title="Compensation & Terms">
            <div className="space-y-3">
              <ReviewItem label="Compensation Type" value={campaign.compensation.type} />
              {campaign.compensation.fixedAmount && (
                <ReviewItem label="Amount" value={`$${campaign.compensation.fixedAmount}`} />
              )}
              <ReviewItem label="Payment Structure" value={campaign.compensation.paymentStructure} />
              <ReviewItem label="Payment Timeline" value={campaign.compensation.paymentTimeline} />
              <ReviewItem label="Usage Rights" value={`${campaign.compensation.usageRightsDuration} days`} />
              <ReviewItem label="Exclusivity" value={campaign.compensation.exclusivity} />
              <ReviewItem label="Content Ownership" value={campaign.compensation.contentOwnership} />
            </div>
            <button
              onClick={() => router.push('/builder/compensation')}
              className="mt-4 inline-flex items-center gap-2 text-brand-blue hover:text-brand-yellow transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          </FormSection>

          {/* Generate PDF Section */}
          <div className="bg-brand-grey rounded-lg p-8 text-center mt-8">
            <FileText className="w-16 h-16 text-brand-yellow mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Ready to Generate Your Brief?</h2>
            <p className="text-gray-400 mb-6">
              We'll create a professional PDF brief with all your campaign details
            </p>

            {!pdfUrl ? (
              <button
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className={`
                  inline-flex items-center gap-2 px-8 py-4 rounded-lg text-lg font-semibold transition-all
                  ${isGenerating
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-yellow text-black hover:bg-yellow-600 transform hover:scale-105'
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    Generate Professional Brief
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 text-brand-yellow">
                  <div className="w-3 h-3 rounded-full bg-brand-yellow animate-pulse" />
                  <span className="font-semibold">PDF Generated Successfully!</span>
                </div>
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleDownloadPDF}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black rounded-lg font-semibold hover:bg-yellow-600 transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </button>

                  <button
                    onClick={handleGeneratePDF}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-opacity-80 transition-all border border-gray-700"
                  >
                    <FileText className="w-5 h-5" />
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Navigation
        currentStep={7}
        totalSteps={9}
        nextHref="/builder/creators"
        prevHref="/builder/compensation"
        canProceed={true}
      />
    </div>
  );
}

// Review item component
function ReviewItem({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  if (!value) return null;
  
  return (
    <div className="flex gap-4">
      <dt className="text-gray-400 min-w-[140px] flex-shrink-0">{label}:</dt>
      <dd className={`text-white ${multiline ? 'whitespace-pre-wrap' : ''}`}>{value}</dd>
    </div>
  );
}