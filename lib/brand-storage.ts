import { Campaign } from '@/types/campaign';
import { CreatorList } from '@/types/creator';

const STORAGE_KEYS = {
  CURRENT_CAMPAIGN: 'current_campaign',
  CAMPAIGNS: 'campaigns',
  CREATOR_LISTS: 'creator_lists',
} as const;

// Campaign storage functions
export const saveCampaign = (campaign: Campaign): void => {
  try {
    // Save to current campaign
    localStorage.setItem(STORAGE_KEYS.CURRENT_CAMPAIGN, JSON.stringify(campaign));
    
    // Save to campaigns list
    const campaigns = getCampaigns();
    const existingIndex = campaigns.findIndex(c => c.id === campaign.id);
    
    if (existingIndex >= 0) {
      campaigns[existingIndex] = campaign;
    } else {
      campaigns.push(campaign);
    }
    
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  } catch (error) {
    console.error('Error saving campaign:', error);
  }
};

export const getCurrentCampaign = (): Campaign | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_CAMPAIGN);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading campaign:', error);
    return null;
  }
};

export const getCampaigns = (): Campaign[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading campaigns:', error);
    return [];
  }
};

export const deleteCampaign = (id: string): void => {
  try {
    const campaigns = getCampaigns().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
    
    // Clear current campaign if it's the one being deleted
    const current = getCurrentCampaign();
    if (current && current.id === id) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_CAMPAIGN);
    }
  } catch (error) {
    console.error('Error deleting campaign:', error);
  }
};

export const clearCurrentCampaign = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_CAMPAIGN);
  } catch (error) {
    console.error('Error clearing current campaign:', error);
  }
};

// Creator list storage functions
export const saveCreatorList = (creatorList: CreatorList): void => {
  try {
    const lists = getCreatorLists();
    const existingIndex = lists.findIndex(l => l.campaignId === creatorList.campaignId);
    
    if (existingIndex >= 0) {
      lists[existingIndex] = creatorList;
    } else {
      lists.push(creatorList);
    }
    
    localStorage.setItem(STORAGE_KEYS.CREATOR_LISTS, JSON.stringify(lists));
  } catch (error) {
    console.error('Error saving creator list:', error);
  }
};

export const getCreatorList = (campaignId: string): CreatorList | null => {
  try {
    const lists = getCreatorLists();
    return lists.find(l => l.campaignId === campaignId) || null;
  } catch (error) {
    console.error('Error loading creator list:', error);
    return null;
  }
};

export const getCreatorLists = (): CreatorList[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CREATOR_LISTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading creator lists:', error);
    return [];
  }
};

// Utility function to generate unique IDs
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};