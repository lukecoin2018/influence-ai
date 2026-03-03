import type { CalculatorInputs, BudgetResults, AlternativeScenario } from './types'

// Base rates per post by tier (in USD)
const BASE_RATES = {
  nano: { min: 50, max: 250 },
  micro: { min: 250, max: 1000 },
  mid: { min: 1000, max: 3000 },
  macro: { min: 3000, max: 10000 },
  mega: { min: 10000, max: 25000 },
  custom: { min: 500, max: 5000 }, // Will be calculated based on follower count
}

// Follower ranges for each tier
const FOLLOWER_RANGES = {
  nano: { min: 1000, max: 10000 },
  micro: { min: 10000, max: 50000 },
  mid: { min: 50000, max: 100000 },
  macro: { min: 100000, max: 500000 },
  mega: { min: 500000, max: 1000000 },
}

// Engagement multipliers
const ENGAGEMENT_MULTIPLIERS = {
  average: 0.9,
  good: 1.0,
  excellent: 1.2,
}

// Content type multipliers
const CONTENT_MULTIPLIERS = {
  feedPost: 1.0,
  reel: 1.4,
  story: 0.4,
  tiktokVideo: 1.3,
  youtubeVideo: 2.5,
  youtubeIntegration: 1.8,
  youtubeShort: 1.2,
  blogPost: 1.5,
}

// Usage rights duration multipliers
const USAGE_DURATION_MULTIPLIERS = {
  'organic-only': 1.0,
  '30-days': 1.25,
  '60-days': 1.45,
  '90-days': 1.70,
  '6-months': 2.10,
  '1-year': 2.50,
  'perpetual': 3.50,
}

// Exclusivity multipliers
const EXCLUSIVITY_MULTIPLIERS = {
  'none': 1.0,
  'category-30': 1.15,
  'category-60': 1.25,
  'category-90': 1.35,
  'full-30': 1.40,
  'full-60': 1.65,
  'full-90': 2.00,
}

// Niche multipliers
const NICHE_MULTIPLIERS = {
  beauty: 1.3,
  fashion: 1.3,
  fitness: 1.2,
  tech: 1.2,
  food: 1.0,
  lifestyle: 1.0,
  travel: 1.0,
  parenting: 1.1,
  finance: 1.3,
  b2b: 1.3,
  other: 1.0,
}

// Location multipliers
const LOCATION_MULTIPLIERS = {
  us: 1.0,
  uk: 0.85,
  canada: 0.90,
  australia: 0.90,
  europe: 0.80,
  other: 0.65,
}

// Content quality multipliers
const QUALITY_MULTIPLIERS = {
  ugc: 1.0,
  professional: 1.30,
  studio: 1.75,
}

export function calculateBudget(inputs: CalculatorInputs): BudgetResults {
  // Step 1: Get base rate for tier
  let baseRate = { ...BASE_RATES[inputs.creatorTier] }
  
  // If custom tier, calculate based on follower count
  if (inputs.creatorTier === 'custom' && inputs.customFollowerCount) {
    baseRate = calculateCustomRate(inputs.customFollowerCount)
  }

  // Step 2: Apply engagement multiplier
  const engagementMultiplier = ENGAGEMENT_MULTIPLIERS[inputs.engagementLevel]
  baseRate.min *= engagementMultiplier
  baseRate.max *= engagementMultiplier

  // Step 3: Calculate content deliverables cost
  const contentCost = calculateContentCost(inputs, baseRate)

  // Step 4: Apply niche multiplier
  const nicheMultiplier = NICHE_MULTIPLIERS[inputs.niche]
  contentCost.min *= nicheMultiplier
  contentCost.max *= nicheMultiplier

  // Step 5: Apply location multiplier
  const locationMultiplier = LOCATION_MULTIPLIERS[inputs.location]
  contentCost.min *= locationMultiplier
  contentCost.max *= locationMultiplier

  // Step 6: Calculate base creator fees (before premiums)
  const baseCreatorFees = {
    min: Math.round(contentCost.min * inputs.numberOfCreators),
    max: Math.round(contentCost.max * inputs.numberOfCreators),
  }

  // Step 7: Calculate usage rights premiums
  const usageRightsPremiums = calculateUsageRightsPremiums(inputs, baseCreatorFees)

  // Step 8: Calculate exclusivity premiums
  const exclusivityPremiums = calculateExclusivityPremiums(inputs, baseCreatorFees)

  // Step 9: Calculate production quality premiums
  const productionQuality = calculateProductionQualityPremiums(inputs, baseCreatorFees)

  // Step 10: Calculate total
  const total = {
    min: baseCreatorFees.min + usageRightsPremiums.min + exclusivityPremiums.min + productionQuality.min,
    max: baseCreatorFees.max + usageRightsPremiums.max + exclusivityPremiums.max + productionQuality.max,
  }

  const perCreator = {
    min: Math.round(total.min / inputs.numberOfCreators),
    max: Math.round(total.max / inputs.numberOfCreators),
  }

  // Calculate expected results
  const expectedResults = calculateExpectedResults(inputs, total)

  // Generate alternative scenarios
  const alternatives = generateAlternativeScenarios(inputs, total)

  // Determine budget health
  const budgetHealth = determineBudgetHealth(total, inputs)

  // Generate optimization tips
  const optimizationTips = generateOptimizationTips(inputs, total)

  // Generate red flags
  const redFlags = generateRedFlags(inputs)

  return {
    breakdown: {
      baseCreatorFees,
      usageRightsPremiums,
      exclusivityPremiums,
      productionQuality,
      total,
      perCreator,
    },
    expectedResults,
    alternatives,
    budgetHealth,
    optimizationTips,
    redFlags,
  }
}

function calculateCustomRate(followerCount: number): { min: number; max: number } {
  // Determine which tier the follower count falls into
  if (followerCount <= 10000) return BASE_RATES.nano
  if (followerCount <= 50000) return BASE_RATES.micro
  if (followerCount <= 100000) return BASE_RATES.mid
  if (followerCount <= 500000) return BASE_RATES.macro
  return BASE_RATES.mega
}

function calculateContentCost(inputs: CalculatorInputs, baseRate: { min: number; max: number }) {
  let totalMin = 0
  let totalMax = 0

  // Instagram
  if (inputs.platforms.instagram.selected) {
    totalMin += inputs.platforms.instagram.feedPosts * baseRate.min * CONTENT_MULTIPLIERS.feedPost
    totalMax += inputs.platforms.instagram.feedPosts * baseRate.max * CONTENT_MULTIPLIERS.feedPost
    
    totalMin += inputs.platforms.instagram.reels * baseRate.min * CONTENT_MULTIPLIERS.reel
    totalMax += inputs.platforms.instagram.reels * baseRate.max * CONTENT_MULTIPLIERS.reel
    
    totalMin += inputs.platforms.instagram.stories * baseRate.min * CONTENT_MULTIPLIERS.story
    totalMax += inputs.platforms.instagram.stories * baseRate.max * CONTENT_MULTIPLIERS.story
  }

  // TikTok
  if (inputs.platforms.tiktok.selected) {
    totalMin += inputs.platforms.tiktok.videos * baseRate.min * CONTENT_MULTIPLIERS.tiktokVideo
    totalMax += inputs.platforms.tiktok.videos * baseRate.max * CONTENT_MULTIPLIERS.tiktokVideo
  }

  // YouTube
  if (inputs.platforms.youtube.selected) {
    totalMin += inputs.platforms.youtube.dedicatedVideos * baseRate.min * CONTENT_MULTIPLIERS.youtubeVideo
    totalMax += inputs.platforms.youtube.dedicatedVideos * baseRate.max * CONTENT_MULTIPLIERS.youtubeVideo
    
    totalMin += inputs.platforms.youtube.integrations * baseRate.min * CONTENT_MULTIPLIERS.youtubeIntegration
    totalMax += inputs.platforms.youtube.integrations * baseRate.max * CONTENT_MULTIPLIERS.youtubeIntegration
    
    totalMin += inputs.platforms.youtube.shorts * baseRate.min * CONTENT_MULTIPLIERS.youtubeShort
    totalMax += inputs.platforms.youtube.shorts * baseRate.max * CONTENT_MULTIPLIERS.youtubeShort
  }

  // Blog
  if (inputs.platforms.blog.selected) {
    totalMin += inputs.platforms.blog.posts * baseRate.min * CONTENT_MULTIPLIERS.blogPost
    totalMax += inputs.platforms.blog.posts * baseRate.max * CONTENT_MULTIPLIERS.blogPost
  }

  // If no content selected, use base rate
  if (totalMin === 0) {
    totalMin = baseRate.min
    totalMax = baseRate.max
  }

  return { min: totalMin, max: totalMax }
}

function calculateUsageRightsPremiums(
  inputs: CalculatorInputs,
  baseCreatorFees: { min: number; max: number }
): { min: number; max: number } {
  const durationMultiplier = USAGE_DURATION_MULTIPLIERS[inputs.usageRightsDuration]
  
  // Count additional usage rights beyond organic
  let additionalRightsMultiplier = 0
  if (inputs.usageRightsTypes.paidAds) additionalRightsMultiplier += 0.30
  if (inputs.usageRightsTypes.whitelisting) additionalRightsMultiplier += 0.40
  if (inputs.usageRightsTypes.websiteEmail) additionalRightsMultiplier += 0.20
  if (inputs.usageRightsTypes.print) additionalRightsMultiplier += 0.35
  if (inputs.usageRightsTypes.retail) additionalRightsMultiplier += 0.50
  if (inputs.usageRightsTypes.commercial) additionalRightsMultiplier += 1.50

  const totalMultiplier = (durationMultiplier - 1) + additionalRightsMultiplier

  return {
    min: Math.round(baseCreatorFees.min * totalMultiplier),
    max: Math.round(baseCreatorFees.max * totalMultiplier),
  }
}

function calculateExclusivityPremiums(
  inputs: CalculatorInputs,
  baseCreatorFees: { min: number; max: number }
): { min: number; max: number } {
  const multiplier = EXCLUSIVITY_MULTIPLIERS[inputs.exclusivity]
  const premium = multiplier - 1

  return {
    min: Math.round(baseCreatorFees.min * premium),
    max: Math.round(baseCreatorFees.max * premium),
  }
}

function calculateProductionQualityPremiums(
  inputs: CalculatorInputs,
  baseCreatorFees: { min: number; max: number }
): { min: number; max: number } {
  const multiplier = QUALITY_MULTIPLIERS[inputs.contentQuality]
  const premium = multiplier - 1

  return {
    min: Math.round(baseCreatorFees.min * premium),
    max: Math.round(baseCreatorFees.max * premium),
  }
}

function calculateExpectedResults(inputs: CalculatorInputs, total: { min: number; max: number }) {
  // Get average followers per tier
  const tierFollowers = inputs.creatorTier === 'custom' && inputs.customFollowerCount
    ? inputs.customFollowerCount
    : (FOLLOWER_RANGES[inputs.creatorTier as keyof typeof FOLLOWER_RANGES]?.min + 
       FOLLOWER_RANGES[inputs.creatorTier as keyof typeof FOLLOWER_RANGES]?.max) / 2 || 50000

  const reach = {
    min: Math.round(tierFollowers * inputs.numberOfCreators * 0.8),
    max: Math.round(tierFollowers * inputs.numberOfCreators * 1.2),
  }

  const impressions = {
    min: Math.round(reach.min * 2), // Average 2x impressions per follower
    max: Math.round(reach.max * 3), // Up to 3x for viral content
  }

  // Engagement rate varies by tier and engagement level
  const engagementRates = {
    nano: { average: 0.06, good: 0.07, excellent: 0.08 },
    micro: { average: 0.04, good: 0.05, excellent: 0.06 },
    mid: { average: 0.03, good: 0.04, excellent: 0.05 },
    macro: { average: 0.02, good: 0.03, excellent: 0.04 },
    mega: { average: 0.015, good: 0.02, excellent: 0.03 },
    custom: { average: 0.03, good: 0.04, excellent: 0.05 },
  }

  const engagementRate = engagementRates[inputs.creatorTier][inputs.engagementLevel]

  const engagement = {
    min: Math.round(impressions.min * engagementRate * 0.8),
    max: Math.round(impressions.max * engagementRate * 1.2),
  }

  const costPerEngagement = {
    min: Number((total.min / engagement.max).toFixed(2)),
    max: Number((total.max / engagement.min).toFixed(2)),
  }

  return { reach, impressions, engagement, costPerEngagement }
}

function generateAlternativeScenarios(
  inputs: CalculatorInputs,
  currentTotal: { min: number; max: number }
): AlternativeScenario[] {
  const scenarios: AlternativeScenario[] = []

  // Scenario A: More Micro Creators
  const microCount = inputs.numberOfCreators * 2
  const microCostPerCreator = (BASE_RATES.micro.min + BASE_RATES.micro.max) / 2
  const microTotal = {
    min: Math.round(microCount * microCostPerCreator * 0.8),
    max: Math.round(microCount * microCostPerCreator * 1.2),
  }
  const microReach = {
    min: Math.round(30000 * microCount * 0.8),
    max: Math.round(30000 * microCount * 1.2),
  }

  scenarios.push({
    name: 'Scenario A: More Micro Creators',
    description: `${microCount} micro creators (10k-50k) instead of current mix`,
    creatorCount: microCount,
    creatorTier: 'Micro (10k-50k)',
    cost: microTotal,
    reach: microReach,
    pros: [
      'Higher engagement rates (4-6%)',
      'More authentic connections',
      'Diverse audience segments',
      'Lower risk - spread across more creators',
    ],
    cons: [
      'More creator management required',
      'Less individual reach per creator',
      'Coordination complexity',
    ],
  })

  // Scenario B: Fewer Macro Creators
  const macroCount = Math.max(1, Math.floor(inputs.numberOfCreators / 2))
  const macroCostPerCreator = (BASE_RATES.macro.min + BASE_RATES.macro.max) / 2
  const macroTotal = {
    min: Math.round(macroCount * macroCostPerCreator * 0.8),
    max: Math.round(macroCount * macroCostPerCreator * 1.2),
  }
  const macroReach = {
    min: Math.round(300000 * macroCount * 0.8),
    max: Math.round(300000 * macroCount * 1.2),
  }

  scenarios.push({
    name: 'Scenario B: Fewer Macro Creators',
    description: `${macroCount} macro creators (100k-500k) for maximum reach`,
    creatorCount: macroCount,
    creatorTier: 'Macro (100k-500k)',
    cost: macroTotal,
    reach: macroReach,
    pros: [
      'Maximum reach per creator',
      'Less management overhead',
      'Established creator credibility',
      'Simpler logistics',
    ],
    cons: [
      'Lower engagement rates (2-4%)',
      'Higher cost per creator',
      'Less authentic feel',
      'All eggs in fewer baskets',
    ],
  })

  // Scenario C: Mixed Approach
  const nanoCount = Math.round(inputs.numberOfCreators * 0.4)
  const microCount2 = Math.round(inputs.numberOfCreators * 0.4)
  const midCount = Math.round(inputs.numberOfCreators * 0.2)
  const mixedCost = {
    min: Math.round(
      nanoCount * BASE_RATES.nano.max +
      microCount2 * BASE_RATES.micro.min +
      midCount * BASE_RATES.mid.min
    ),
    max: Math.round(
      nanoCount * BASE_RATES.nano.max +
      microCount2 * BASE_RATES.micro.max +
      midCount * BASE_RATES.mid.max
    ),
  }
  const mixedReach = {
    min: Math.round((5000 * nanoCount + 30000 * microCount2 + 75000 * midCount) * 0.8),
    max: Math.round((5000 * nanoCount + 30000 * microCount2 + 75000 * midCount) * 1.2),
  }

  scenarios.push({
    name: 'Scenario C: Mixed Approach',
    description: `${nanoCount} nano, ${microCount2} micro, ${midCount} mid-tier creators`,
    creatorCount: inputs.numberOfCreators,
    creatorTier: 'Mixed tiers',
    cost: mixedCost,
    reach: mixedReach,
    pros: [
      'Balanced reach and engagement',
      'Diversified risk across tiers',
      'Test multiple creator types',
      'Cost-effective spread',
    ],
    cons: [
      'Most management complexity',
      'Varied content quality',
      'Different rate negotiations',
      'Complex performance tracking',
    ],
  })

  return scenarios
}

function determineBudgetHealth(
  total: { min: number; max: number },
  inputs: CalculatorInputs
): 'market-rate' | 'above-market' | 'below-market' {
  // This is a simplified version - in production you'd have more sophisticated logic
  const avgTotal = (total.min + total.max) / 2
  const tierBase = BASE_RATES[inputs.creatorTier]
  const avgBase = (tierBase.min + tierBase.max) / 2
  const expectedTotal = avgBase * inputs.numberOfCreators * 1.5 // Rough estimate with average premiums

  if (avgTotal > expectedTotal * 1.3) return 'above-market'
  if (avgTotal < expectedTotal * 0.7) return 'below-market'
  return 'market-rate'
}

function generateOptimizationTips(
  inputs: CalculatorInputs,
  total: { min: number; max: number }
): string[] {
  const tips: string[] = []

  // Usage rights optimization
  if (inputs.usageRightsDuration === 'perpetual') {
    tips.push('Consider: Reducing usage rights from perpetual to 1 year saves 30-50%')
  } else if (inputs.usageRightsDuration === '1-year') {
    tips.push('Consider: Reducing usage rights from 1 year to 90 days saves 25-40%')
  } else if (inputs.usageRightsDuration === '90-days') {
    tips.push('Consider: Reducing usage rights from 90 to 60 days saves 15-20%')
  }

  // Exclusivity optimization
  if (inputs.exclusivity.startsWith('full')) {
    tips.push('Consider: Category exclusivity instead of full exclusivity saves 20-40%')
  }

  // Creator tier optimization
  if (inputs.creatorTier === 'macro' || inputs.creatorTier === 'mega') {
    tips.push('Consider: Micro creators have 2x engagement of macro at 1/3 the cost')
  }

  // Content quality optimization
  if (inputs.contentQuality === 'studio') {
    tips.push('Consider: Professional quality instead of studio saves 20-30%')
  }

  // General tips
  tips.push('Consider: Product gifting + smaller fee instead of full cash payment')
  tips.push('Consider: Long-term ambassador program vs. one-off for better ROI')

  return tips
}

function generateRedFlags(inputs: CalculatorInputs): string[] {
  const flags: string[] = []

  if (inputs.usageRightsDuration === 'perpetual' && inputs.exclusivity === 'none') {
    flags.push("Don't: Offer perpetual rights without significant premium compensation")
  }

  if (inputs.exclusivity !== 'none' && inputs.usageRightsDuration === 'organic-only') {
    flags.push("Don't: Request exclusivity without additional usage rights compensation")
  }

  if (inputs.platforms.youtube.selected && inputs.platforms.youtube.dedicatedVideos > 0) {
    flags.push("Don't: Expect YouTube dedicated video at Instagram post pricing")
  }

  flags.push("Don't: Lowball creators - damages relationships and brand reputation")
  flags.push("Don't: Add scope without increasing budget - leads to poor quality work")

  return flags
}
