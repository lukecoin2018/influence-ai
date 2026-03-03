'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Copy, CheckCircle2, Send, ArrowLeft } from 'lucide-react';
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
    if (!existing) {
      router.push('/builder/campaign-type');
      return;
    }
    
    setCampaign(existing);

    const existingList = getCreatorList(existing.id);
    if (existingList) {
      setCreators(existingList.creators.filter(c => c.name && c.email));
    }

    if (existingList && existingList.creators.length === 0) {
      router.push('/builder/creators');
    }
  }, [router]);

  const generateEmail = (creator: Creator, template: EmailTemplate): string => {
    if (!campaign) return '';

    const templates = {
      professional: {
        subject: `Partnership Opportunity with ${campaign.basics.brandName}`,
        body: `Hi ${creator.name},

I hope this email finds you well. My name is ${campaign.basics.contactName}, and I'm reaching out on behalf of ${campaign.basics.brandName}.

We've been following your content on ${creator.platform === 'instagram' ? 'Instagram' : creator.platform === 'tiktok' ? 'TikTok' : 'YouTube'} and are impressed by your authentic voice and engaged audience. We believe you'd be a great fit for our upcoming campaign: "${campaign.basics.campaignName}".

Campaign Overview:
- Campaign Period: ${campaign.basics.startDate} to ${campaign.basics.endDate}
- Compensation: ${getCompensationSummary()}
- Deliverables: ${campaign.content.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ')}

I've attached a detailed campaign brief with all the information you'll need, including timeline, content requirements, and terms.

If you're interested in collaborating, please reply by ${getReplyByDate()} so we can discuss next steps.

Looking forward to potentially working together!

Best regards,
${campaign.basics.contactName}
${campaign.basics.contactEmail}
${campaign.basics.contactPhone || ''}
${campaign.basics.brandName}`
      },
      warm: {
        subject: `We love your content! Collaboration opportunity 💛`,
        body: `Hey ${creator.name}! 👋

We've been huge fans of your ${creator.platform === 'instagram' ? 'Instagram' : creator.platform === 'tiktok' ? 'TikTok' : 'YouTube'} for a while now - your content is always so authentic and engaging!

I'm ${campaign.basics.contactName} from ${campaign.basics.brandName}, and we're running a campaign called "${campaign.basics.campaignName}" from ${campaign.basics.startDate} to ${campaign.basics.endDate}. We immediately thought of you!

Here's the quick version:
✨ What we're looking for: ${campaign.content.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ')}
💰 Compensation: ${getCompensationSummary()}
🎯 Goals: ${campaign.objectives.goals.slice(0, 2).join(', ')}

I've attached a full brief with all the details - we tried to make it as clear and comprehensive as possible so you have everything you need.

Would love to chat more if you're interested! Just hit reply and let's make something awesome together.

Can't wait to hear from you! ✨

${campaign.basics.contactName}
${campaign.basics.brandName}
${campaign.basics.contactEmail}`
      },
      'value-first': {
        subject: `Exclusive campaign opportunity - ${campaign.basics.campaignName}`,
        body: `Hi ${creator.name},

I'm reaching out with an exclusive opportunity that I think aligns perfectly with your content and audience.

${campaign.basics.brandName} is launching "${campaign.basics.campaignName}", and we're partnering with a select group of creators. Here's what makes this campaign special:

💎 FOR YOU:
- Compensation: ${getCompensationSummary()}
- Creative freedom: ${campaign.content.creativeFreedom} - we trust your creative vision
- ${campaign.brand.assetsProvided.length > 0 ? `Brand assets provided: ${campaign.brand.assetsProvided.slice(0, 2).join(', ')}` : 'Full brand support'}
${campaign.compensation.additionalPerks ? `• Additional perks: ${campaign.compensation.additionalPerks.slice(0, 100)}...` : ''}

📅 TIMELINE:
- Campaign runs: ${campaign.basics.startDate} to ${campaign.basics.endDate}
- Deliverables: ${campaign.content.deliverables.map(d => `${d.quantity}x ${d.type}`).join(', ')}

I've attached the complete campaign brief with all details, requirements, and terms.

We're moving quickly on this, so if you're interested, please let me know by ${getReplyByDate()}.

Questions? I'm here to help!

${campaign.basics.contactName}
${campaign.basics.brandName}
${campaign.basics.contactEmail}
${campaign.basics.contactPhone || ''}`
      }
    };

    return templates[template].body;
  };

  const getEmailSubject = (template: EmailTemplate): string => {
    if (!campaign) return '';

    const subjects = {
      professional: `Partnership Opportunity with ${campaign.basics.brandName}`,
      warm: `We love your content! Collaboration opportunity 💛`,
      'value-first': `Exclusive campaign opportunity - ${campaign.basics.campaignName}`
    };

    return subjects[template];
  };

  const getCompensationSummary = (): string => {
    if (!campaign) return '';

    const comp = campaign.compensation;
    if (comp.type === 'fixed-rate' && comp.fixedAmount) {
      return `$${comp.fixedAmount} per creator`;
    } else if (comp.type === 'negotiable' && comp.rangeMin && comp.rangeMax) {
      return `$${comp.rangeMin} - $${comp.rangeMax} (negotiable)`;
    } else if (comp.type === 'product-only' && comp.productValue) {
      return `Product gifting (retail value: $${comp.productValue})`;
    }
    return 'To be discussed';
  };

  const getReplyByDate = (): string => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // 7 days from now
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const handleCopyEmail = (creatorId: string) => {
    const creator = creators.find(c => c.id === creatorId);
    if (!creator) return;

    const email = customizedEmails[creatorId] || generateEmail(creator, selectedTemplate);
    const subject = getEmailSubject(selectedTemplate);
    
    const fullEmail = `Subject: ${subject}\n\n${email}`;
    
    navigator.clipboard.writeText(fullEmail);
    
    setCopiedEmails(prev => new Set(prev).add(creatorId));
    
    setTimeout(() => {
      setCopiedEmails(prev => {
        const newSet = new Set(prev);
        newSet.delete(creatorId);
        return newSet;
      });
    }, 2000);

    // Mark as sent
    const updatedCreators = creators.map(c => 
      c.id === creatorId ? { ...c, status: 'sent' as const, sentDate: new Date().toISOString() } : c
    );
    setCreators(updatedCreators);
    
    if (campaign) {
      saveCreatorList({
        campaignId: campaign.id,
        creators: updatedCreators
      });
    }
  };

  const handleCustomizeEmail = (creatorId: string, content: string) => {
    setCustomizedEmails(prev => ({ ...prev, [creatorId]: content }));
  };

  if (!campaign || creators.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No creators found. Please add creators first.</p>
          <Link 
            href="/builder/creators"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black rounded-lg font-semibold hover:bg-yellow-600"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back to Add Creators
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StepIndicator currentStep={9} totalSteps={9} />
      
      <div className="flex-1 overflow-auto pb-24">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Send Campaign Briefs</h1>
            <p className="text-gray-400">Generate personalized outreach emails and send to your creator shortlist</p>
          </div>

          {/* Email Template Selection */}
          <div className="bg-brand-grey rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Choose Email Template</h2>
            
            <div className="grid md:grid-cols-3 gap-4">
              <button
                onClick={() => setSelectedTemplate('professional')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${selectedTemplate === 'professional'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-2">Professional & Direct</div>
                <div className="text-sm opacity-80">Formal introduction, clear details, professional tone</div>
              </button>

              <button
                onClick={() => setSelectedTemplate('warm')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${selectedTemplate === 'warm'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-2">Warm & Personal</div>
                <div className="text-sm opacity-80">Compliment their work, enthusiastic and friendly</div>
              </button>

              <button
                onClick={() => setSelectedTemplate('value-first')}
                className={`
                  p-4 rounded-lg text-left transition-all
                  ${selectedTemplate === 'value-first'
                    ? 'bg-brand-yellow text-black'
                    : 'bg-black text-gray-400 hover:text-white'
                  }
                `}
              >
                <div className="font-semibold mb-2">Value-First</div>
                <div className="text-sm opacity-80">Lead with benefits, highlight what's in it for them</div>
              </button>
            </div>
          </div>

          {/* Creator Emails */}
          <div className="space-y-6">
            {creators.map((creator, index) => (
              <div key={creator.id} className="bg-brand-grey rounded-lg p-6">
                {/* Creator Info Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{creator.name}</h3>
                    <p className="text-sm text-gray-400">
                      {creator.handle} • {creator.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {creator.status === 'sent' && creator.sentDate && (
                      <span className="inline-flex items-center gap-2 text-xs text-brand-yellow bg-brand-yellow bg-opacity-10 px-3 py-1 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Sent {new Date(creator.sentDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Email Preview */}
                <div className="mb-4">
                  <div className="bg-black rounded-lg p-4 mb-3">
                    <div className="text-sm text-gray-400 mb-2">
                      <strong className="text-white">Subject:</strong> {getEmailSubject(selectedTemplate)}
                    </div>
                    <div className="text-sm text-gray-400">
                      <strong className="text-white">To:</strong> {creator.email}
                    </div>
                  </div>

                  <textarea
                    value={customizedEmails[creator.id] || generateEmail(creator, selectedTemplate)}
                    onChange={(e) => handleCustomizeEmail(creator.id, e.target.value)}
                    rows={12}
                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white text-sm font-mono focus:border-brand-yellow focus:outline-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCopyEmail(creator.id)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-yellow text-black rounded-lg font-semibold hover:bg-yellow-600 transition-all"
                  >
                    {copiedEmails.has(creator.id) ? (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copy Email
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCustomizeEmail(creator.id, generateEmail(creator, selectedTemplate))}
                    className="px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-opacity-80 transition-all border border-gray-700"
                  >
                    Reset
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  💡 Tip: Copy the email, paste it into your email client, attach the campaign brief PDF, and send!
                </p>
              </div>
            ))}
          </div>

          {/* Summary & Next Steps */}
          <div className="mt-8 bg-brand-blue bg-opacity-10 border border-brand-blue rounded-lg p-6">
            <h3 className="text-lg font-semibold text-brand-blue mb-3">Next Steps</h3>
            <ol className="space-y-2 text-white">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center font-semibold">1</span>
                <span>Copy each personalized email above</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center font-semibold">2</span>
                <span>Open your email client (Gmail, Outlook, etc.)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center font-semibold">3</span>
                <span>Paste the email and attach your campaign brief PDF</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center font-semibold">4</span>
                <span>Send and track responses!</span>
              </li>
            </ol>
          </div>

          {/* Completion */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-3 bg-brand-yellow text-black px-6 py-3 rounded-full font-semibold mb-4">
              <CheckCircle2 className="w-6 h-6" />
              Campaign Brief Complete!
            </div>
            
            <p className="text-gray-400 mb-6">
              You've created a professional campaign brief and personalized outreach emails.<br />
              Go send those emails and start building your creator partnerships! 🚀
            </p>

            <div className="flex gap-4 justify-center">
              <Link
                href="/builder/review"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-grey text-white rounded-lg font-semibold hover:bg-opacity-80 transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Review
              </Link>

              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-pink text-white rounded-lg font-semibold hover:bg-opacity-80 transition-all"
              >
                Create Another Campaign
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}