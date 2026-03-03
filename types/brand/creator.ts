export type CreatorStatus = 'sent' | 'interested' | 'declined' | 'no-response' | 'follow-up';

export interface Creator {
  id: string;
  name: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  handle: string;
  email: string;
  notes?: string;
  status: CreatorStatus;
  sentDate?: string;
  responseDate?: string;
}

export interface CreatorList {
  campaignId: string;
  creators: Creator[];
}
