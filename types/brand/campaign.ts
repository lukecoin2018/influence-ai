// Campaign type definitions
export type CampaignType = 
  | 'product-launch'
  | 'brand-awareness'
  | 'event-coverage'
  | 'product-review'
  | 'giveaway'
  | 'ambassador'
  | 'seasonal'
  | 'custom';

export type CampaignGoal =
  | 'increase-brand-awareness'
  | 'drive-product-sales'
  | 'build-social-proof'
  | 'generate-ugc'
  | 'launch-new-product'
  | 'drive-traffic'
  | 'grow-social-following'
  | 'event-promotion'
  | 'other';

export type AgeRange = '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type Gender = 'all' | 'female' | 'male' | 'non-binary';
export type Location = 'us' | 'uk' | 'canada' | 'global' | 'specific';

export type DeliverableType = 
  | 'instagram-feed'
  | 'instagram-reel'
  | 'instagram-story'
  | 'tiktok-video'
  | 'youtube-video'
  | 'blog-post'
  | 'other';

export type CreativeFreedomLevel = 'high' | 'medium' | 'structured';

export type BrandVoice = 
  | 'fun-playful'
  | 'professional-polished'
  | 'authentic-real'
  | 'inspiring-motivational'
  | 'educational-informative'
  | 'luxury-aspirational'
  | 'casual-relatable';

export type VisualStyle =
  | 'bright-colorful'
  | 'moody-dramatic'
  | 'minimalist-clean'
  | 'natural-organic'
  | 'bold-vibrant'
  | 'soft-dreamy';

export type PostingScheduleType = 'specific-dates' | 'flexible-window' | 'creator-discretion';
export type ApprovalType = 'required' | 'recommended' | 'not-required';

export type CompensationType = 'fixed-rate' | 'negotiable' | 'product-only';
export type PaymentStructure = 'upfront-100' | 'split-50-50' | 'on-completion' | 'custom';

export type UsageRightsDuration = '30' | '60' | '90' | '180' | '365' | 'perpetual';
export type ExclusivityType = 'none' | 'category' | 'full';
export type ContentOwnership = 'creator-retains' | 'shared' | 'brand-owns' | 'custom';

// Campaign data interface
export interface CampaignBasics {
  campaignType: CampaignType;
  campaignName: string;
  brandName: string;
  startDate: string;
  endDate: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface CampaignObjectives {
  goals: CampaignGoal[];
  customGoal?: string;
  targetAgeRanges: AgeRange[];
  targetGender: Gender;
  targetLocation: Location;
  specificLocations?: string;
  interests: string[];
  additionalDemographics?: string;
  keyMessages: string;
  problemsSolved?: string;
  uniqueValue?: string;
  talkingPoints?: string;
}

export interface Deliverable {
  type: DeliverableType;
  quantity: number;
  format?: string;
  length?: string;
  style?: string;
  customType?: string;
}

export interface ContentRequirements {
  deliverables: Deliverable[];
  mustInclude: {
    productVisible: boolean;
    brandLogo: boolean;
    specificHashtags: string[];
    tagBrandAccount: string;
    mentionFeatures: string;
    callToAction: string;
    ftcDisclosure: boolean;
  };
  restrictions: {
    noCompetitors: boolean;
    noAlcoholDrugs: boolean;
    noProfanity: boolean;
    noControversial: boolean;
    custom?: string;
  };
  creativeFreedom: CreativeFreedomLevel;
}

export interface BrandGuidelines {
  voiceTone: BrandVoice[];
  visualStyle: VisualStyle[];
  dos: string;
  donts: string;
  contentExamples: {
    url?: string;
    description?: string;
  }[];
  assetsProvided: string[];
  assetDelivery: string;
  assetTimeline: string;
  assetContact: string;
}

export interface PostingDate {
  date: string;
  time: string;
}

export interface Timeline {
  briefSentDate: string;
  draftDueDate: string;
  feedbackByDate: string;
  finalDueDate: string;
  revisionRounds: number;
  postingScheduleType: PostingScheduleType;
  specificDates?: PostingDate[];
  flexibleWindow?: {
    startDate: string;
    endDate: string;
  };
  approvalRequired: ApprovalType;
}

export interface Compensation {
  type: CompensationType;
  fixedAmount?: number;
  rangeMin?: number;
  rangeMax?: number;
  productValue?: number;
  additionalPerks?: string;
  paymentStructure: PaymentStructure;
  paymentTimeline: string;
  paymentMethod: string;
  usageRightsDuration: UsageRightsDuration;
  usageTypes: string[];
  exclusivity: ExclusivityType;
  exclusivityDuration?: string;
  exclusivityCategories?: string;
  contentOwnership: ContentOwnership;
}

// Complete campaign interface
export interface Campaign {
  id: string;
  createdAt: string;
  updatedAt: string;
  basics: CampaignBasics;
  objectives: CampaignObjectives;
  content: ContentRequirements;
  brand: BrandGuidelines;
  timeline: Timeline;
  compensation: Compensation;
  currentStep: number;
}
