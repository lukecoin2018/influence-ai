import {
  CalculatorInput,
  CalculatorResult,
  CalculationStep,
  CreatorTier,
  EngagementTier,
  RedFlag,
  DeliverableBreakdown,
  Platform,
  ContentType,
} from "@/types/calculator";

// Copied verbatim from LMG-IRC lib/calculator-engine.ts
export class RateCalculator {
  private input: CalculatorInput;
  private steps: CalculationStep[] = [];
  private redFlags: RedFlag[] = [];

  constructor(input: CalculatorInput) {
    this.input = input;
  }

  calculate(): CalculatorResult {
    const creatorTier = this.getCreatorTier();
    const engagedFollowers = this.calculateEngagedFollowers();
    const engagementTier = this.getEngagementTier();
    const baseRatePerPost = this.calculateBaseRate(creatorTier);
    const deliverableBreakdowns = this.calculateDeliverables(baseRatePerPost, engagementTier);
    const subtotal = deliverableBreakdowns.reduce((sum, d) => sum + d.subtotal, 0);

    const totalItems = this.input.deliverables.reduce((sum, d) => sum + d.quantity, 0);
    this.steps.push({
      label: `Subtotal for ${totalItems} Deliverable${totalItems > 1 ? "s" : ""}`,
      value: subtotal,
      explanation: `Combined total for all ${totalItems} deliverable${totalItems > 1 ? "s" : ""} before discounts.`,
    });

    let finalRate = this.applyUsageRightsMultiplier(subtotal);
    finalRate = this.applyWhitelistingMultiplier(finalRate);
    finalRate = this.applyExclusivityMultiplier(finalRate);
    finalRate = this.applyBundleDiscount(finalRate, totalItems);

    this.checkRedFlags(finalRate, engagedFollowers, totalItems);

    const { minRate, maxRate, recommendedRate } = this.calculateRateRange(finalRate);
    const negotiation = this.generateNegotiationStrategy(minRate, maxRate, recommendedRate);
    const marketPosition = this.getMarketPosition(recommendedRate, creatorTier);

    return {
      minRate: Math.round(minRate),
      maxRate: Math.round(maxRate),
      recommendedRate: Math.round(recommendedRate),
      confidence: this.redFlags.length === 0 ? "high" : this.redFlags.length <= 2 ? "medium" : "low",
      baseRate: Math.round(baseRatePerPost),
      engagedFollowers,
      deliverableBreakdowns,
      steps: this.steps,
      creatorTier,
      engagementTier,
      marketPosition,
      redFlags: this.redFlags,
      negotiation,
      calculatedAt: new Date(),
      dataSourceNote: "Based on analysis of 1,247+ creator deals (Jan 2025)",
    };
  }

  private getCreatorTier(): CreatorTier {
    const { followers } = this.input;
    if (followers >= 10000 && followers < 50000) return "micro";
    if (followers >= 50000 && followers < 100000) return "mid-micro";
    if (followers >= 100000) return "mid-tier";
    return "micro";
  }

  private calculateEngagedFollowers(): number {
    return Math.round(this.input.followers * (this.input.engagementRate / 100));
  }

  private getEngagementTier(): EngagementTier {
    const { engagementRate } = this.input;
    if (engagementRate > 5) return "excellent";
    if (engagementRate >= 3) return "good";
    if (engagementRate >= 2) return "average";
    return "poor";
  }

  private calculateBaseRate(tier: CreatorTier): number {
    const { followers } = this.input;
    const ratesPer1K: Record<CreatorTier, { min: number; max: number }> = {
      micro: { min: 10, max: 15 },
      "mid-micro": { min: 12, max: 18 },
      "mid-tier": { min: 15, max: 25 },
    };
    const rates = ratesPer1K[tier];
    const avgRate = (rates.min + rates.max) / 2;
    return (followers / 1000) * avgRate;
  }

  private calculateDeliverables(baseRate: number, engagementTier: EngagementTier): DeliverableBreakdown[] {
    const breakdowns: DeliverableBreakdown[] = [];

    for (const deliverable of this.input.deliverables) {
      let rate = baseRate;

      rate = this.applyEngagementMultiplierToRate(rate, engagementTier);
      const engagementMultipliers = { excellent: 1.2, good: 1.0, average: 0.9, poor: 0.7 };
      if (engagementMultipliers[engagementTier] !== 1.0) {
        this.steps.push({
          label: engagementTier.charAt(0).toUpperCase() + engagementTier.slice(1) + " Engagement",
          value: rate,
          multiplier: engagementMultipliers[engagementTier],
          explanation: this.input.engagementRate + "% engagement is " + engagementTier + ".",
        });
      }

      rate = this.applyPlatformMultiplierToRate(rate, deliverable.platform, deliverable.contentType);
      const platformKey = deliverable.platform + "-" + deliverable.contentType;
      const platformMultipliers: Record<string, number> = {
        "instagram-reel-short": 1.3, "instagram-reel-standard": 1.5, "instagram-reel-long": 1.7,
        "instagram-post": 1.0, "instagram-carousel": 1.2, "instagram-story": 0.3,
        "tiktok-video-short": 0.9, "tiktok-video-standard": 1.0, "tiktok-video-long": 1.2,
        "tiktok-series": 1.3, "youtube-short": 1.1, "youtube-integration": 4.0,
      };
      const platformMult = platformMultipliers[platformKey] || 1.0;
      if (platformMult !== 1.0) {
        this.steps.push({
          label: this.formatPlatform(deliverable.platform) + " " + this.formatContentType(deliverable.contentType),
          value: rate,
          multiplier: platformMult,
          explanation: this.formatContentType(deliverable.contentType) + " on " + this.formatPlatform(deliverable.platform) + ".",
        });
      }

      rate = this.applyNicheMultiplier(rate);
      const nicheMultipliers: Record<string, number> = {
        finance: 1.3, b2b: 1.3, tech: 1.3, health: 1.3,
        fitness: 1.0, fashion: 1.0, beauty: 1.0, lifestyle: 1.0,
        gaming: 0.9, entertainment: 0.9,
      };
      if (nicheMultipliers[this.input.niche] !== 1.0) {
        this.steps.push({
          label: this.input.niche.charAt(0).toUpperCase() + this.input.niche.slice(1) + " Niche",
          value: rate,
          multiplier: nicheMultipliers[this.input.niche],
          explanation: this.input.niche.charAt(0).toUpperCase() + this.input.niche.slice(1) + " content pricing adjustment.",
        });
      }

      const subtotal = rate * deliverable.quantity;
      breakdowns.push({
        id: deliverable.id,
        platform: deliverable.platform,
        contentType: deliverable.contentType,
        quantity: deliverable.quantity,
        ratePerItem: rate,
        subtotal,
        label: `${this.formatPlatform(deliverable.platform)} ${this.formatContentType(deliverable.contentType)} ×${deliverable.quantity}`,
      });
    }

    return breakdowns;
  }

  private applyEngagementMultiplierToRate(rate: number, tier: EngagementTier): number {
    const multipliers: Record<EngagementTier, number> = { excellent: 1.2, good: 1.0, average: 0.9, poor: 0.7 };
    if (tier === "poor") {
      this.redFlags.push({
        severity: "warning",
        message: "Low engagement rate detected",
        suggestion: "Focus on improving engagement before raising rates. Brands pay for engagement, not just followers.",
      });
    }
    return rate * multipliers[tier];
  }

  private applyPlatformMultiplierToRate(rate: number, platform: Platform, contentType: ContentType): number {
    const multipliers: Record<string, number> = {
      "instagram-reel-short": 1.3, "instagram-reel-standard": 1.5, "instagram-reel-long": 1.7,
      "instagram-post": 1.0, "instagram-carousel": 1.2, "instagram-story": 0.3,
      "tiktok-video-short": 0.9, "tiktok-video-standard": 1.0, "tiktok-video-long": 1.2,
      "tiktok-series": 1.3, "youtube-short": 1.1, "youtube-integration": 4.0,
    };
    return rate * (multipliers[`${platform}-${contentType}`] || 1.0);
  }

  private applyNicheMultiplier(rate: number): number {
    const multipliers: Record<string, number> = {
      finance: 1.3, b2b: 1.3, tech: 1.3, health: 1.3,
      fitness: 1.0, fashion: 1.0, beauty: 1.0, lifestyle: 1.0,
      gaming: 0.9, entertainment: 0.9,
    };
    return rate * (multipliers[this.input.niche] || 1.0);
  }

  private applyUsageRightsMultiplier(rate: number): number {
    const { usageType, usageDuration } = this.input;
    let multiplier = 1.0;
    let explanation = "";

    if (usageType === "organic") {
      if (usageDuration === 30) { multiplier = 1.0; explanation = "Organic use only for 30 days (standard)."; }
      else if (usageDuration === 90) { multiplier = 1.2; explanation = "Extended 90-day organic rights (+20%)."; }
      else if (usageDuration === 365 || usageDuration === 9999) { multiplier = 1.5; explanation = "Extended organic rights beyond 90 days (+50%)."; }
    } else if (usageType === "paid") {
      if (usageDuration === 30) { multiplier = 1.5; explanation = "30-day paid advertising rights (+50%)."; }
      else if (usageDuration === 90) { multiplier = 2.0; explanation = "90-day paid advertising rights (+100%)."; }
      else if (usageDuration === 365 || usageDuration === 9999) {
        multiplier = 3.0;
        explanation = "Perpetual paid advertising rights (+200%).";
        if (usageDuration === 9999) {
          this.redFlags.push({
            severity: "danger",
            message: "Perpetual usage rights requested",
            suggestion: "Perpetual rights should ALWAYS include 3x premium minimum. Consider limiting to 1-2 years instead.",
          });
        }
      }
    }

    const newRate = rate * multiplier;
    if (multiplier !== 1.0) this.steps.push({ label: "Usage Rights", value: newRate, multiplier, explanation });
    return newRate;
  }

  private applyWhitelistingMultiplier(rate: number): number {
    if (!this.input.hasWhitelisting) return rate;
    const newRate = rate * 1.3;
    this.steps.push({ label: "Whitelisting", value: newRate, multiplier: 1.3, explanation: "Brand will run ads from your account (+30%)." });
    return newRate;
  }

  private applyExclusivityMultiplier(rate: number): number {
    const { exclusivityDays } = this.input;
    if (exclusivityDays === 0) return rate;
    const multipliers: Record<number, number> = { 30: 1.15, 60: 1.3, 90: 1.5 };
    const multiplier = multipliers[exclusivityDays];
    const newRate = rate * multiplier;
    this.steps.push({
      label: `${exclusivityDays}-Day Exclusivity`,
      value: newRate,
      multiplier,
      explanation: `You cannot work with competitors for ${exclusivityDays} days (+${((multiplier - 1) * 100).toFixed(0)}%).`,
    });
    if (exclusivityDays >= 90) {
      this.redFlags.push({ severity: "warning", message: "Long exclusivity period", suggestion: "90+ day exclusivity significantly limits your earning potential." });
    }
    return newRate;
  }

  private applyBundleDiscount(rate: number, totalItems: number): number {
    const { isLongTermPartnership } = this.input;
    let discount = 0;
    let explanation = "";
    if (isLongTermPartnership) { discount = 0.2; explanation = "Long-term partnership (3+ months) discount: -20%."; }
    else if (totalItems >= 5) { discount = 0.15; explanation = "5+ deliverables bundle discount: -15%."; }
    else if (totalItems >= 3) { discount = 0.1; explanation = "3+ deliverables bundle discount: -10%."; }
    if (discount > 0) {
      const discountedRate = rate * (1 - discount);
      this.steps.push({ label: "Bundle Discount", value: discountedRate, multiplier: 1 - discount, explanation });
      return discountedRate;
    }
    return rate;
  }

  private checkRedFlags(finalRate: number, engagedFollowers: number, totalItems: number): void {
    const { followers } = this.input;
    const avgRatePerItem = finalRate / totalItems;
    const ratePer1K = (avgRatePerItem / followers) * 1000;
    if (ratePer1K < 8) {
      this.redFlags.push({
        severity: "danger",
        message: `Average rate is only $${ratePer1K.toFixed(2)} per 1K followers per deliverable`,
        suggestion: "This is significantly below market rate. You should be earning at least $10-15 per 1K followers per post.",
      });
    }
    if (totalItems > 5 && finalRate < 3000) {
      this.redFlags.push({
        severity: "danger",
        message: "Too many deliverables for the compensation",
        suggestion: `${totalItems} deliverables for $${finalRate.toFixed(0)} means only $${avgRatePerItem.toFixed(0)} per piece.`,
      });
    }
    if (this.input.hasPaymentTerms === false) {
      this.redFlags.push({ severity: "warning", message: "No payment terms specified", suggestion: "Always establish clear payment terms." });
    }
    if (this.input.revisionRounds && this.input.revisionRounds > 2) {
      this.redFlags.push({ severity: "warning", message: `${this.input.revisionRounds} revision rounds is excessive`, suggestion: "Standard is 1-2 revision rounds." });
    }
  }

  private calculateRateRange(finalRate: number): { minRate: number; maxRate: number; recommendedRate: number } {
    const minRate = finalRate * 0.95;
    const maxRate = finalRate * 1.15;
    this.steps.push({
      label: `Negotiation Range ($${Math.round(minRate).toLocaleString()} - $${Math.round(maxRate).toLocaleString()})`,
      value: maxRate,
      explanation: `Your recommended rate is $${Math.round(finalRate).toLocaleString()}. We added ±15% to create your negotiation range.`,
    });
    return { minRate, maxRate, recommendedRate: finalRate };
  }

  private generateNegotiationStrategy(minRate: number, maxRate: number, recommendedRate: number): CalculatorResult["negotiation"] {
    const openingAsk = maxRate;
    const acceptableMin = recommendedRate;
    const walkAwayPoint = minRate;
    return {
      openingAsk: Math.round(openingAsk),
      acceptableMin: Math.round(acceptableMin),
      walkAwayPoint: Math.round(walkAwayPoint),
      strategy: [
        `Start by asking for $${Math.round(openingAsk).toLocaleString()} for the complete package.`,
        `Your target range is $${Math.round(minRate).toLocaleString()} - $${Math.round(maxRate).toLocaleString()} total.`,
        `Don't accept less than $${Math.round(acceptableMin).toLocaleString()} unless they add significant value.`,
        `Walk away if they offer below $${Math.round(walkAwayPoint).toLocaleString()}.`,
        `If they push back, ask: "What's your budget?" Then negotiate scope, not your per-post rate.`,
      ],
    };
  }

  private getMarketPosition(rate: number, tier: CreatorTier): string {
    const totalItems = this.input.deliverables.reduce((sum, d) => sum + d.quantity, 0);
    const averages: Record<CreatorTier, number> = { micro: 1200, "mid-micro": 3000, "mid-tier": 7500 };
    const avgRate = (averages[tier] / 3) * totalItems;
    const percentDiff = ((rate - avgRate) / avgRate) * 100;
    if (percentDiff > 30) return "significantly above average";
    if (percentDiff > 10) return "above average";
    if (percentDiff > -10) return "average";
    if (percentDiff > -30) return "below average";
    return "significantly below average";
  }

  private formatPlatform(platform: string): string {
    return { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" }[platform] || platform;
  }

  private formatContentType(type: string): string {
    const names: Record<string, string> = {
      "reel-short": "Short Reel (15-30s)", "reel-standard": "Standard Reel (30-60s)",
      "reel-long": "Long Reel (60-90s)", post: "Post", carousel: "Carousel",
      story: "Story", "video-short": "Short Video (15-30s)", "video-standard": "Standard Video (30-60s)",
      "video-long": "Long Video (60-90s)", series: "Series", short: "Short", integration: "Integration",
    };
    return names[type] || type;
  }
}

export function calculateRate(input: CalculatorInput): CalculatorResult {
  return new RateCalculator(input).calculate();
}
