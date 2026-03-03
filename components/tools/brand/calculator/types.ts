export type CreatorTier = 'nano' | 'micro' | 'mid' | 'macro' | 'mega' | 'custom'
export type EngagementLevel = 'average' | 'good' | 'excellent'
export type UsageRightsDuration = 'organic-only' | '30-days' | '60-days' | '90-days' | '6-months' | '1-year' | 'perpetual'
export type Exclusivity = 'none' | 'category-30' | 'category-60' | 'category-90' | 'full-30' | 'full-60' | 'full-90'
export type Niche = 'beauty' | 'fashion' | 'fitness' | 'tech' | 'food' | 'lifestyle' | 'travel' | 'parenting' | 'finance' | 'b2b' | 'other'
export type Location = 'us' | 'uk' | 'canada' | 'australia' | 'europe' | 'other'
export type ContentQuality = 'ugc' | 'professional' | 'studio'

export interface PlatformDeliverables {
  instagram: {
    selected: boolean
    feedPosts: number
    reels: number
    stories: number
  }
  tiktok: {
    selected: boolean
    videos: number
  }
  youtube: {
    selected: boolean
    dedicatedVideos: number
    integrations: number
    shorts: number
  }
  blog: {
    selected: boolean
    posts: number
  }
}

export interface UsageRightsTypes {
  organicOnly: boolean
  paidAds: boolean
  whitelisting: boolean
  websiteEmail: boolean
  print: boolean
  retail: boolean
  commercial: boolean
}

export interface CalculatorInputs {
  numberOfCreators: number
  creatorTier: CreatorTier
  customFollowerCount: number | null
  engagementLevel: EngagementLevel
  platforms: PlatformDeliverables
  usageRightsDuration: UsageRightsDuration
  usageRightsTypes: UsageRightsTypes
  exclusivity: Exclusivity
  niche: Niche
  location: Location
  contentQuality: ContentQuality
}

export interface BudgetBreakdown {
  baseCreatorFees: { min: number; max: number }
  usageRightsPremiums: { min: number; max: number }
  exclusivityPremiums: { min: number; max: number }
  productionQuality: { min: number; max: number }
  total: { min: number; max: number }
  perCreator: { min: number; max: number }
}

export interface ExpectedResults {
  reach: { min: number; max: number }
  impressions: { min: number; max: number }
  engagement: { min: number; max: number }
  costPerEngagement: { min: number; max: number }
}

export interface AlternativeScenario {
  name: string
  description: string
  creatorCount: number
  creatorTier: string
  cost: { min: number; max: number }
  reach: { min: number; max: number }
  pros: string[]
  cons: string[]
}

export interface BudgetResults {
  breakdown: BudgetBreakdown
  expectedResults: ExpectedResults
  alternatives: AlternativeScenario[]
  budgetHealth: 'market-rate' | 'above-market' | 'below-market'
  optimizationTips: string[]
  redFlags: string[]
}