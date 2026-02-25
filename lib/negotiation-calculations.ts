// Place at: lib/negotiation-calculations.ts
// Copied verbatim from LMG-ICN lib/calculations.ts

import { GapAnalysis } from './negotiation-types';

export function calculateGapAnalysis(fairRate: number, brandOffer: number): GapAnalysis {
  const dollarGap = fairRate - brandOffer;
  const percentGap = Math.round((dollarGap / fairRate) * 100);

  let warningLevel: GapAnalysis['warningLevel'];
  let warningMessage: string;
  let warningColor: string;

  if (percentGap < -15) {
    warningLevel = 'above';
    warningMessage = '🎉 ABOVE MARKET RATE';
    warningColor = '#10B981';
  } else if (percentGap >= -15 && percentGap <= 15) {
    warningLevel = 'fair';
    warningMessage = '✅ Fair offer';
    warningColor = '#10B981';
  } else if (percentGap > 15 && percentGap <= 30) {
    warningLevel = 'below';
    warningMessage = 'Below fair rate';
    warningColor = '#F59E0B';
  } else if (percentGap > 30 && percentGap <= 50) {
    warningLevel = 'significant';
    warningMessage = '⚠️ SIGNIFICANTLY BELOW MARKET';
    warningColor = '#F59E0B';
  } else {
    warningLevel = 'severe';
    warningMessage = '🚨 SEVERELY UNDERVALUED';
    warningColor = '#EF4444';
  }

  return { dollarGap, percentGap, warningLevel, warningMessage, warningColor };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateCompromiseRate(fairRate: number, brandOffer: number): number {
  const gap = fairRate - brandOffer;
  return Math.round(brandOffer + gap * 0.6);
}
