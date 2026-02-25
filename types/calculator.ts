// Core calculator types — copied verbatim from LMG-IRC
// Place at: types/calculator.ts

export type Platform = "instagram" | "tiktok" | "youtube";
export type ContentType =
  | "reel-short"
  | "reel-standard"
  | "reel-long"
  | "post"
  | "carousel"
  | "story"
  | "video-short"
  | "video-standard"
  | "video-long"
  | "series"
  | "short"
  | "integration";
export type CreatorTier = "micro" | "mid-micro" | "mid-tier";
export type Niche =
  | "finance"
  | "b2b"
  | "tech"
  | "health"
  | "fitness"
  | "fashion"
  | "beauty"
  | "lifestyle"
  | "gaming"
  | "entertainment";
export type EngagementTier = "excellent" | "good" | "average" | "poor";

export interface Deliverable {
  id: string;
  platform: Platform;
  contentType: ContentType;
  quantity: number;
}

export interface CalculatorInput {
  followers: number;
  engagementRate: number;
  niche: Niche;
  deliverables: Deliverable[];
  usageType: "organic" | "paid";
  usageDuration: 30 | 90 | 365 | 9999;
  hasWhitelisting: boolean;
  exclusivityDays: 0 | 30 | 60 | 90;
  isLongTermPartnership: boolean;
  hasPaymentTerms?: boolean;
  revisionRounds?: number;
}

export interface DeliverableBreakdown {
  id: string;
  platform: Platform;
  contentType: ContentType;
  quantity: number;
  ratePerItem: number;
  subtotal: number;
  label: string;
}

export interface CalculationStep {
  label: string;
  value: number;
  multiplier?: number;
  explanation: string;
}

export interface RedFlag {
  severity: "warning" | "danger";
  message: string;
  suggestion: string;
}

export interface CalculatorResult {
  minRate: number;
  maxRate: number;
  recommendedRate: number;
  confidence: "high" | "medium" | "low";
  baseRate: number;
  engagedFollowers: number;
  deliverableBreakdowns: DeliverableBreakdown[];
  steps: CalculationStep[];
  creatorTier: CreatorTier;
  engagementTier: EngagementTier;
  marketPosition: string;
  redFlags: RedFlag[];
  negotiation: {
    openingAsk: number;
    acceptableMin: number;
    walkAwayPoint: number;
    strategy: string[];
  };
  calculatedAt: Date;
  dataSourceNote: string;
}
