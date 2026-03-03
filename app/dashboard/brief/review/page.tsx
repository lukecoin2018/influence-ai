'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, Edit2, FileText } from 'lucide-react';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import Navigation from '@/components/tools/brand/brief/Navigation';
import FormSection from '@/components/tools/brand/brief/FormSection';
import { Campaign } from '@/types/brand/campaign';
import { getCurrentCampaign, saveCampaign } from '@/lib/brand-storage';

function ReviewItem({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
      <dt style={{ fontSize: 13, color: '#9CA3AF', minWidth: 140, flexShrink: 0 }}>{label}:</dt>
      <dd style={{ fontSize: 13, color: '#3A3A3A', margin: 0, whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>{value}</dd>
    </div>
  );
}

export default function ReviewPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
  }, [router]);

  const handleGeneratePDF = async () => {
    if (!campaign) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign }),
      });
      if (!response.ok) throw new Error('Failed to generate PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      campaign.currentStep = 7;
      campaign.updatedAt = new Date().toISOString();
      saveCampaign(campaign);
    } catch (error) {
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

  if (!campaign) return null;

  const editBtn = (href: string) => (
    <button onClick={() => router.push(href)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      marginTop: 12, background: 'none', border: 'none',
      color: '#3AAFF4', fontSize: 13, fontWeight: 500, cursor: 'pointer',
    }}>
      <Edit2 style={{ width: 14, height: 14 }} /> Edit
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={7} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 96 }}>
        <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Review Your Campaign Brief</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Review all details before generating your professional brief</p>
          </div>

          <FormSection title="Campaign Basics">
            <dl style={{ margin: 0 }}>
              <ReviewItem label="Campaign Type" value={campaign.basics.campaignType} />
              <ReviewItem label="Campaign Name" value={campaign.basics.campaignName} />
              <ReviewItem label="Brand Name" value={campaign.basics.brandName} />
              <ReviewItem label="Duration" value={`${campaign.basics.startDate} to ${campaign.basics.endDate}`} />
              <ReviewItem label="Contact" value={`${campaign.basics.contactName} (${campaign.basics.contactEmail})`} />
            </dl>
            {editBtn('/dashboard/brief/campaign-type')}
          </FormSection>

          <FormSection title="Campaign Objectives">
            <dl style={{ margin: 0 }}>
              <ReviewItem label="Goals" value={campaign.objectives.goals.join(', ')} />
              <ReviewItem label="Target Age" value={campaign.objectives.targetAgeRanges.join(', ')} />
              <ReviewItem label="Target Gender" value={campaign.objectives.targetGender} />
              <ReviewItem label="Location" value={campaign.objectives.targetLocation} />
              <ReviewItem label="Interests" value={campaign.objectives.interests.join(', ')} />
              <ReviewItem label="Key Messages" value={campaign.objectives.keyMessages} multiline />
            </dl>
            {editBtn('/dashboard/brief/objectives')}
          </FormSection>

          <FormSection title="Content Requirements">
            <dl style={{ margin: 0 }}>
              <ReviewItem label="Deliverables" value={campaign.content.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ')} />
              <ReviewItem label="Creative Freedom" value={campaign.content.creativeFreedom} />
              <ReviewItem label="Must Include" value={[
                campaign.content.mustInclude.productVisible && 'Product visible',
                campaign.content.mustInclude.brandLogo && 'Brand logo',
                campaign.content.mustInclude.ftcDisclosure && 'FTC disclosure',
              ].filter(Boolean).join(', ')} />
              {campaign.content.mustInclude.specificHashtags.length > 0 && (
                <ReviewItem label="Hashtags" value={campaign.content.mustInclude.specificHashtags.join(', ')} />
              )}
            </dl>
            {editBtn('/dashboard/brief/content')}
          </FormSection>

          <FormSection title="Brand Guidelines">
            <dl style={{ margin: 0 }}>
              <ReviewItem label="Voice & Tone" value={campaign.brand.voiceTone.join(', ')} />
              <ReviewItem label="Visual Style" value={campaign.brand.visualStyle.join(', ')} />
              {campaign.brand.dos && <ReviewItem label="Do's" value={campaign.brand.dos} multiline />}
              {campaign.brand.donts && <ReviewItem label="Don'ts" value={campaign.brand.donts} multiline />}
              <ReviewItem label="Assets Provided" value={campaign.brand.assetsProvided.join(', ')} />
            </dl>
            {editBtn('/dashboard/brief/brand')}
          </FormSection>

          <FormSection title="Timeline & Posting">
            <dl style={{ margin: 0 }}>
              <ReviewItem label="Draft Due" value={campaign.timeline.draftDueDate} />
              <ReviewItem label="Final Due" value={campaign.timeline.finalDueDate} />
              <ReviewItem label="Revision Rounds" value={campaign.timeline.revisionRounds.toString()} />
              <ReviewItem label="Posting Schedule" value={campaign.timeline.postingScheduleType} />
              <ReviewItem label="Approval Required" value={campaign.timeline.approvalRequired} />
            </dl>
            {editBtn('/dashboard/brief/timeline')}
          </FormSection>

          <FormSection title="Compensation & Terms">
            <dl style={{ margin: 0 }}>
              <ReviewItem label="Compensation Type" value={campaign.compensation.type} />
              {campaign.compensation.fixedAmount && (
                <ReviewItem label="Amount" value={`$${campaign.compensation.fixedAmount}`} />
              )}
              <ReviewItem label="Payment Structure" value={campaign.compensation.paymentStructure} />
              <ReviewItem label="Payment Timeline" value={campaign.compensation.paymentTimeline} />
              <ReviewItem label="Usage Rights" value={`${campaign.compensation.usageRightsDuration} days`} />
              <ReviewItem label="Exclusivity" value={campaign.compensation.exclusivity} />
              <ReviewItem label="Content Ownership" value={campaign.compensation.contentOwnership} />
            </dl>
            {editBtn('/dashboard/brief/compensation')}
          </FormSection>

          {/* Generate PDF */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
            borderRadius: 12, padding: 40, textAlign: 'center', marginTop: 12,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <FileText style={{ width: 52, height: 52, color: '#FFD700', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Ready to Generate Your Brief?</h2>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 24 }}>
              We'll create a professional PDF brief with all your campaign details
            </p>

            {!pdfUrl ? (
              <button onClick={handleGeneratePDF} disabled={isGenerating} style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                padding: '12px 28px', borderRadius: 10, border: 'none',
                fontSize: 16, fontWeight: 600, cursor: isGenerating ? 'not-allowed' : 'pointer',
                backgroundColor: isGenerating ? '#F3F4F6' : '#FFD700',
                color: isGenerating ? '#9CA3AF' : '#3A3A3A',
                transition: 'background-color 0.15s',
              }}>
                {isGenerating ? (
                  <><div style={{ width: 18, height: 18, border: '2px solid #9CA3AF', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin" />Generating PDF...</>
                ) : (
                  <><FileText style={{ width: 18, height: 18 }} />Generate Professional Brief</>
                )}
              </button>
            ) : (
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#FFD700', marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#FFD700' }} />
                  <span style={{ fontWeight: 600 }}>PDF Generated Successfully!</span>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button onClick={handleDownloadPDF} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 22px', borderRadius: 8, border: 'none',
                    backgroundColor: '#FFD700', color: '#3A3A3A',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                    <Download style={{ width: 16, height: 16 }} /> Download PDF
                  </button>
                  <button onClick={handleGeneratePDF} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 22px', borderRadius: 8,
                    border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
                    color: '#3A3A3A', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                    <FileText style={{ width: 16, height: 16 }} /> Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Navigation currentStep={7} totalSteps={9} onContinue={() => router.push('/dashboard/brief/creators')} prevHref="/dashboard/brief/compensation" canProceed={true} />
    </div>
  );
}
