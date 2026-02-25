// Place at: lib/negotiation-types.ts
// Copied verbatim from LMG-ICN lib/types.ts

export type NegotiationStage =
  | 'initial-offer'
  | 'after-counter'
  | 'objection'
  | 'stalled';

export type ObjectionType =
  | 'budget-constraints'
  | 'other-creators-cheaper'
  | 'maximum-offer'
  | 'flexibility-request'
  | 'exposure-offer'
  | 'standard-rate'
  | 'no-objection'
  | 'other';

export type FlexibilityLevel =
  | 'firm'
  | 'somewhat-flexible'
  | 'very-flexible'
  | 'unsure';

export type StrategyType =
  | 'firm'
  | 'scope'
  | 'compromise';

export interface NegotiationInput {
  stage: NegotiationStage;
  fairRate: number;
  brandOffer: number;
  deliverables: string;
  usageRights: string;
  exclusivity: string;
  objectionType: ObjectionType;
  customObjection?: string;
  flexibility: FlexibilityLevel;
  creatorName?: string;
  brandName?: string;
}

export interface GapAnalysis {
  dollarGap: number;
  percentGap: number;
  warningLevel: 'severe' | 'significant' | 'below' | 'fair' | 'above';
  warningMessage: string;
  warningColor: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  objectionTypes: ObjectionType[];
  strategy: StrategyType;
  stage: NegotiationStage[];
  subject: string;
  body: string;
  whenToUse: string;
  pros: string[];
  cons: string[];
}

export interface ResponseOption {
  strategy: StrategyType;
  title: string;
  subtitle: string;
  email: {
    subject: string;
    body: string;
  };
  whenToUse: string;
  pros: string[];
  cons: string[];
}

export interface DecisionHelperQuiz {
  brandPrestige: 'high' | 'medium' | 'low';
  financialNeed: 'urgent' | 'moderate' | 'flexible';
  budgetLikelihood: 'yes' | 'maybe' | 'no';
}

export interface DecisionRecommendation {
  recommendedStrategy: StrategyType;
  confidence: number;
  reasoning: string[];
  alternativeScores: {
    strategy: StrategyType;
    score: number;
    reason: string;
  }[];
}
