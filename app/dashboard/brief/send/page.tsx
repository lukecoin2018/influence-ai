'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, CheckCircle2, ArrowLeft, FileText } from 'lucide-react';
import StepIndicator from '@/components/tools/brand/brief/StepIndicator';
import { Campaign } from '@/types/brand/campaign';
import { Creator, CreatorList } from '@/types/brand/creator';
import { getCurrentCampaign, getCreatorList, saveCreatorList } from '@/lib/brand-storage';
import Link from 'next/link';

type EmailTemplate = 'professional' | 'warm' | 'value-first';

export default function SendPage() {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('professional');
  const [customizedEmails, setCustomizedEmails] = useState<Record<string, string>>({});
  const [copiedEmails, setCopiedEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    const existing = getCurrentCampaign();
    if (!existing) { router.push('/dashboard/brief/campaign-type'); return; }
    setCampaign(existing);
    const existingList = getCreatorList(existing.id);
    if (existingList) {
      setCreators(existingList.creators.filter((c: Creator) => c.name && c.email));
      if (existingList.creators.length === 0) router.push('/dashboard/brief/creators');
    }
  }, [router]);

  const getCompensationSummary = (c: Campaign): string => {
    const comp = c.compensation;
    if (comp.type === 'fixed-rate' && comp.fixedAmount) return `$${comp.fixedAmount} per creator`;
    if (comp.type === 'negotiable' && comp.rangeMin && comp.rangeMax) return `$${comp.rangeMin} – $${comp.rangeMax} (negotiable)`;
    if (comp.type === 'product-only' && comp.productValue) return `Product gifting (retail value: $${comp.productValue})`;
    return 'To be discussed';
  };

  const getReplyByDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getEmailSubject = (template: EmailTemplate): string => {
    if (!campaign) return '';
    return {
      professional: `Partnership Opportunity with ${campaign.basics.brandName}`,
      warm: `We love your content! Collaboration opportunity 💛`,
      'value-first': `Exclusive campaign opportunity — ${campaign.basics.campaignName}`,
    }[template];
  };

  const generateEmail = (creator: Creator, template: EmailTemplate): string => {
    if (!campaign) return '';
    const platform = creator.platform === 'instagram' ? 'Instagram' : creator.platform === 'tiktok' ? 'TikTok' : 'YouTube';
    const deliverables = campaign.content.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ');
    const comp = getCompensationSummary(campaign);

    const templates = {
      professional: `Hi ${creator.name},

I hope this email finds you well. My name is ${campaign.basics.contactName}, and I'm reaching out on behalf of ${campaign.basics.brandName}.

We've been following your content on ${platform} and are impressed by your authentic voice and engaged audience. We believe you'd be a great fit for our upcoming campaign: "${campaign.basics.campaignName}".

Campaign Overview:
- Campaign Period: ${campaign.basics.startDate} to ${campaign.basics.endDate}
- Compensation: ${comp}
- Deliverables: ${deliverables}

I've attached a detailed campaign brief with all the information you'll need.

If you're interested in collaborating, please reply by ${getReplyByDate()}.

Best regards,
${campaign.basics.contactName}
${campaign.basics.contactEmail}${campaign.basics.contactPhone ? `\n${campaign.basics.contactPhone}` : ''}
${campaign.basics.brandName}`,

      warm: `Hey ${creator.name}! 👋

We've been huge fans of your ${platform} for a while now — your content is always so authentic and engaging!

I'm ${campaign.basics.contactName} from ${campaign.basics.brandName}, and we're running a campaign called "${campaign.basics.campaignName}" from ${campaign.basics.startDate} to ${campaign.basics.endDate}. We immediately thought of you!

Here's the quick version:
✨ What we're looking for: ${deliverables}
💰 Compensation: ${comp}
🎯 Goals: ${campaign.objectives.goals.slice(0, 2).join(', ')}

I've attached a full brief with all the details. Would love to chat more if you're interested!

${campaign.basics.contactName}
${campaign.basics.brandName}
${campaign.basics.contactEmail}`,

      'value-first': `Hi ${creator.name},

I'm reaching out with an exclusive opportunity that I think aligns perfectly with your content and audience.

${campaign.basics.brandName} is launching "${campaign.basics.campaignName}", and we're partnering with a select group of creators. Here's what makes this special:

💎 FOR YOU:
- Compensation: ${comp}
- Creative freedom: ${campaign.content.creativeFreedom} — we trust your creative vision
${campaign.brand.assetsProvided.length > 0 ? `- Brand assets provided: ${campaign.brand.assetsProvided.slice(0, 2).join(', ')}` : ''}

📅 TIMELINE:
- Campaign runs: ${campaign.basics.startDate} to ${campaign.basics.endDate}
- Deliverables: ${deliverables}

Please let me know by ${getReplyByDate()} if you're interested.

${campaign.basics.contactName}
${campaign.basics.brandName}
${campaign.basics.contactEmail}${campaign.basics.contactPhone ? `\n${campaign.basics.contactPhone}` : ''}`,
    };
    return templates[template];
  };

  const handleCopyEmail = (creatorId: string) => {
    const creator = creators.find(c => c.id === creatorId);
    if (!creator || !campaign) return;
    const body = customizedEmails[creatorId] || generateEmail(creator, selectedTemplate);
    const full = `Subject: ${getEmailSubject(selectedTemplate)}\n\n${body}`;
    navigator.clipboard.writeText(full);
    setCopiedEmails(prev => new Set(prev).add(creatorId));
    setTimeout(() => setCopiedEmails(prev => { const s = new Set(prev); s.delete(creatorId); return s; }), 2000);
    const updated = creators.map(c => c.id === creatorId ? { ...c, status: 'sent' as const, sentDate: new Date().toISOString() } : c);
    setCreators(updated);
    saveCreatorList({ campaignId: campaign.id, creators: updated });
  };

  if (!campaign || creators.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#6B7280', marginBottom: 16 }}>No creators found. Please add creators first.</p>
          <Link href="/dashboard/brief/creators" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8,
            backgroundColor: '#FFD700', color: '#3A3A3A',
            fontSize: 14, fontWeight: 600, textDecoration: 'none',
          }}>
            <ArrowLeft style={{ width: 16, height: 16 }} /> Go Back to Add Creators
          </Link>
        </div>
      </div>
    );
  }

  const chipBtn = (isSelected: boolean) => ({
    padding: '12px 16px', borderRadius: 8, textAlign: 'left' as const,
    border: `2px solid ${isSelected ? '#FFD700' : '#E5E7EB'}`,
    backgroundColor: isSelected ? '#FFF9E0' : '#FFFFFF',
    cursor: 'pointer', transition: 'border-color 0.15s, background-color 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
      <StepIndicator currentStep={9} totalSteps={9} />

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: '#3A3A3A', margin: '0 0 8px' }}>Send Campaign Briefs</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Generate personalized outreach emails and send to your creator shortlist</p>
          </div>

          {/* Template Selection */}
          <div style={{
            backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
            borderRadius: 12, padding: 24, marginBottom: 28,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#3A3A3A', margin: '0 0 16px' }}>Choose Email Template</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { id: 'professional', label: 'Professional & Direct', sub: 'Formal introduction, clear details' },
                { id: 'warm', label: 'Warm & Personal', sub: 'Compliment their work, friendly tone' },
                { id: 'value-first', label: 'Value-First', sub: "Lead with benefits, what's in it for them" },
              ].map(opt => (
                <button key={opt.id} onClick={() => setSelectedTemplate(opt.id as EmailTemplate)} style={chipBtn(selectedTemplate === opt.id)}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#3A3A3A', marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Creator Email Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {creators.map((creator) => {
              const isCopied = copiedEmails.has(creator.id);
              return (
                <div key={creator.id} style={{
                  backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB',
                  borderRadius: 12, padding: 24,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E5E7EB',
                  }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#3A3A3A', margin: '0 0 4px' }}>{creator.name}</h3>
                      <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{creator.handle} • {creator.email}</p>
                    </div>
                    {creator.status === 'sent' && creator.sentDate && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        fontSize: 12, color: '#FFD700', fontWeight: 600,
                        backgroundColor: '#FFF9E0', padding: '4px 10px', borderRadius: 20,
                      }}>
                        <CheckCircle2 style={{ width: 12, height: 12 }} />
                        Sent {new Date(creator.sentDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Email meta */}
                  <div style={{
                    backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB',
                    borderRadius: 8, padding: '10px 14px', marginBottom: 12,
                  }}>
                    <p style={{ fontSize: 13, color: '#3A3A3A', margin: '0 0 4px' }}>
                      <strong>Subject:</strong> {getEmailSubject(selectedTemplate)}
                    </p>
                    <p style={{ fontSize: 13, color: '#3A3A3A', margin: 0 }}>
                      <strong>To:</strong> {creator.email}
                    </p>
                  </div>

                  <textarea
                    value={customizedEmails[creator.id] || generateEmail(creator, selectedTemplate)}
                    onChange={(e) => setCustomizedEmails(prev => ({ ...prev, [creator.id]: e.target.value }))}
                    rows={12}
                    style={{
                      width: '100%', padding: '12px 14px',
                      backgroundColor: '#FAFAFA', color: '#3A3A3A',
                      border: '1px solid #E5E7EB', borderRadius: 8,
                      fontSize: 13, fontFamily: 'monospace', lineHeight: 1.7,
                      resize: 'vertical', outline: 'none', marginBottom: 14,
                    }}
                  />

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => handleCopyEmail(creator.id)} style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '10px 20px', borderRadius: 8, border: 'none',
                      backgroundColor: '#FFD700', color: '#3A3A3A',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>
                      {isCopied ? <><CheckCircle2 style={{ width: 16, height: 16 }} />Copied!</> : <><Copy style={{ width: 16, height: 16 }} />Copy Email</>}
                    </button>
                    <button onClick={() => setCustomizedEmails(prev => ({ ...prev, [creator.id]: generateEmail(creator, selectedTemplate) }))}
                      style={{
                        padding: '10px 18px', borderRadius: 8,
                        border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
                        color: '#6B7280', fontSize: 14, cursor: 'pointer',
                      }}>
                      Reset
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>
                    💡 Copy the email, paste into your email client, attach the campaign brief PDF, and send!
                  </p>
                </div>
              );
            })}
          </div>

          {/* Next Steps */}
          <div style={{
            marginTop: 28, padding: '20px 24px',
            backgroundColor: '#EBF7FF', border: '1px solid #A3D9FF', borderRadius: 12,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#3AAFF4', margin: '0 0 14px' }}>Next Steps</h3>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Copy each personalized email above', 'Open your email client (Gmail, Outlook, etc.)', 'Paste the email and attach your campaign brief PDF', 'Send and track responses!'].map((step, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{
                    flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                    backgroundColor: '#3AAFF4', color: '#FFFFFF',
                    fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 14, color: '#3A3A3A', paddingTop: 2 }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Completion */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              backgroundColor: '#FFD700', color: '#3A3A3A',
              padding: '10px 24px', borderRadius: 30, fontWeight: 600, marginBottom: 16,
            }}>
              <CheckCircle2 style={{ width: 20, height: 20 }} />
              Campaign Brief Complete!
            </div>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              You've created a professional campaign brief and personalized outreach emails.<br />
              Go send those emails and start building your creator partnerships! 🚀
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link href="/dashboard/brief/review" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8,
                border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
                color: '#3A3A3A', fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}>
                <ArrowLeft style={{ width: 16, height: 16 }} /> Back to Review
              </Link>
              <Link href="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 8, border: 'none',
                backgroundColor: '#FF6B8A', color: '#FFFFFF',
                fontSize: 14, fontWeight: 600, textDecoration: 'none',
              }}>
                Create Another Campaign
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
