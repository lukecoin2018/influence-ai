import { Campaign } from './campaign';

export type BriefTemplate = 'professional' | 'creative' | 'minimal';

export interface BriefConfig {
  template: BriefTemplate;
  brandColors?: {
    primary: string;
    secondary: string;
  };
  includeLogo: boolean;
  logoUrl?: string;
}

export interface BriefData {
  campaign: Campaign;
  config: BriefConfig;
  generatedAt: string;
  pdfUrl?: string;
}