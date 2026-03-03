import { CampaignType } from '@/types/brand/campaign';

export interface CampaignTypeOption {
  id: CampaignType;
  name: string;
  description: string;
  icon: string;
  popularDeliverables: string[];
  typicalGoals: string[];
}

export const campaignTypes: CampaignTypeOption[] = [
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Announce and showcase a new product to the market',
    icon: '🚀',
    popularDeliverables: ['Instagram Reels', 'TikTok Videos', 'Unboxing Videos'],
    typicalGoals: ['Launch new product', 'Drive product sales', 'Generate buzz']
  },
  {
    id: 'brand-awareness',
    name: 'Brand Awareness',
    description: 'Increase visibility and reach for your brand',
    icon: '📣',
    popularDeliverables: ['Instagram Feed Posts', 'Instagram Stories', 'TikTok Videos'],
    typicalGoals: ['Increase brand awareness', 'Grow social following', 'Build social proof']
  },
  {
    id: 'event-coverage',
    name: 'Event Coverage',
    description: 'Document and promote a conference, popup, or launch event',
    icon: '🎉',
    popularDeliverables: ['Instagram Stories', 'Instagram Reels', 'Live Coverage'],
    typicalGoals: ['Event promotion', 'Generate FOMO', 'Build social proof']
  },
  {
    id: 'product-review',
    name: 'Product Review/Unboxing',
    description: 'Detailed product showcase and honest review',
    icon: '📦',
    popularDeliverables: ['YouTube Videos', 'Instagram Reels', 'Blog Posts'],
    typicalGoals: ['Build social proof', 'Drive product sales', 'Generate UGC']
  },
  {
    id: 'giveaway',
    name: 'Giveaway/Contest',
    description: 'Collaborative giveaway to drive engagement',
    icon: '🎁',
    popularDeliverables: ['Instagram Feed Posts', 'Instagram Stories', 'TikTok Videos'],
    typicalGoals: ['Grow social following', 'Increase engagement', 'Generate buzz']
  },
  {
    id: 'ambassador',
    name: 'Ambassador Program',
    description: 'Long-term partnership with ongoing content',
    icon: '⭐',
    popularDeliverables: ['Monthly Content Mix', 'Instagram Stories', 'Feed Posts'],
    typicalGoals: ['Build brand loyalty', 'Consistent content', 'Long-term relationships']
  },
  {
    id: 'seasonal',
    name: 'Seasonal Campaign',
    description: 'Holiday, back-to-school, or seasonal promotion',
    icon: '🎄',
    popularDeliverables: ['Instagram Reels', 'TikTok Videos', 'Holiday Content'],
    typicalGoals: ['Drive seasonal sales', 'Increase brand awareness', 'Generate urgency']
  },
  {
    id: 'custom',
    name: 'Custom Campaign',
    description: 'Create a campaign tailored to your specific needs',
    icon: '✨',
    popularDeliverables: ['Custom Mix'],
    typicalGoals: ['Custom objectives']
  }
];
