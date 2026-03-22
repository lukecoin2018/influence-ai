// ─────────────────────────────────────────────────────────────
// lib/discover/config.ts
// ─────────────────────────────────────────────────────────────

export type Platform = 'instagram' | 'tiktok';

export interface DiscoverPageConfig {
  platform: Platform;
  category: string;
  /** Keyword used in ILIKE filter against ai_summary */
  searchKeyword: string;
  title: string;
  description: string;
  label: string;
  emoji: string;
  related: string[];
}

export const DISCOVER_PAGES: Record<string, DiscoverPageConfig> = {
  // ── Instagram ──────────────────────────────────────────────
  'instagram-beauty-creators': {
    platform: 'instagram',
    category: 'Beauty',
    searchKeyword: 'beauty',
    title: 'Top Instagram Beauty Creators for Brand Partnerships',
    description:
      'Discover verified Instagram beauty creators with real engagement data. Our curated database includes skincare specialists, makeup artists, beauty reviewers, and wellness influencers — all in the 50K–500K follower sweet spot.',
    label: 'Beauty',
    emoji: '✨',
    related: ['instagram-skincare-creators', 'instagram-fashion-creators', 'instagram-lifestyle-creators', 'tiktok-beauty-creators'],
  },
  'instagram-fashion-creators': {
    platform: 'instagram',
    category: 'Fashion',
    searchKeyword: 'fashion',
    title: 'Top Instagram Fashion Creators for Brand Partnerships',
    description:
      'Find verified Instagram fashion creators and style influencers with authentic audiences. Browse our database of 50K–500K fashion creators ready for brand collaborations.',
    label: 'Fashion',
    emoji: '👗',
    related: ['instagram-beauty-creators', 'instagram-lifestyle-creators', 'tiktok-fashion-creators', 'instagram-skincare-creators'],
  },
  'instagram-fitness-creators': {
    platform: 'instagram',
    category: 'Fitness',
    searchKeyword: 'fitness',
    title: 'Top Instagram Fitness Creators for Brand Partnerships',
    description:
      'Connect with verified Instagram fitness creators and wellness influencers. Our database covers personal trainers, gym enthusiasts, yoga instructors, and nutrition experts with real engagement data.',
    label: 'Fitness',
    emoji: '💪',
    related: ['instagram-wellness-creators', 'instagram-lifestyle-creators', 'tiktok-fitness-influencers', 'instagram-nutrition-creators'],
  },
  'instagram-lifestyle-creators': {
    platform: 'instagram',
    category: 'Lifestyle',
    searchKeyword: 'lifestyle',
    title: 'Top Instagram Lifestyle Creators for Brand Partnerships',
    description:
      'Discover verified Instagram lifestyle creators who blend daily life, inspiration, and brand storytelling. Browse real engagement data for 50K–500K lifestyle influencers.',
    label: 'Lifestyle',
    emoji: '🌿',
    related: ['instagram-beauty-creators', 'instagram-fashion-creators', 'instagram-travel-creators', 'tiktok-lifestyle-creators'],
  },
  'instagram-travel-creators': {
    platform: 'instagram',
    category: 'Travel',
    searchKeyword: 'travel',
    title: 'Top Instagram Travel Creators for Brand Partnerships',
    description:
      'Find verified Instagram travel creators and destination influencers with highly engaged audiences. Our database includes travel photographers, adventure creators, and luxury travel influencers.',
    label: 'Travel',
    emoji: '✈️',
    related: ['instagram-lifestyle-creators', 'tiktok-travel-creators', 'instagram-food-creators'],
  },
  'instagram-food-creators': {
    platform: 'instagram',
    category: 'Food',
    searchKeyword: 'food',
    title: 'Top Instagram Food Creators for Brand Partnerships',
    description:
      'Discover verified Instagram food creators, recipe developers, and culinary influencers. Browse real engagement data for food and beverage brand collaborations.',
    label: 'Food & Drink',
    emoji: '🍽️',
    related: ['tiktok-food-influencers', 'instagram-lifestyle-creators', 'instagram-wellness-creators', 'instagram-nutrition-creators'],
  },
  'instagram-wellness-creators': {
    platform: 'instagram',
    category: 'Wellness',
    searchKeyword: 'wellness',
    title: 'Top Instagram Wellness Creators for Brand Partnerships',
    description:
      'Connect with verified Instagram wellness creators covering mental health, mindfulness, yoga, and holistic living. Find influencers with authentic, engaged wellness audiences.',
    label: 'Wellness',
    emoji: '🧘',
    related: ['instagram-fitness-creators', 'instagram-lifestyle-creators', 'tiktok-wellness-creators', 'instagram-nutrition-creators'],
  },
  'instagram-parenting-creators': {
    platform: 'instagram',
    category: 'Parenting',
    searchKeyword: 'parenting',
    title: 'Top Instagram Parenting Creators for Brand Partnerships',
    description:
      'Discover verified Instagram parenting influencers and family creators. Our database includes mommy bloggers, dad influencers, and family content creators with authentic engaged audiences.',
    label: 'Parenting',
    emoji: '👨‍👩‍👧',
    related: ['instagram-lifestyle-creators', 'instagram-wellness-creators', 'tiktok-parenting-creators'],
  },
  'instagram-tech-creators': {
    platform: 'instagram',
    category: 'Tech',
    searchKeyword: 'tech',
    title: 'Top Instagram Tech Creators for Brand Partnerships',
    description:
      'Find verified Instagram tech creators, gadget reviewers, and software influencers. Browse authentic engagement data for technology and software brand partnerships.',
    label: 'Tech',
    emoji: '💻',
    related: ['tiktok-tech-creators', 'instagram-gaming-creators'],
  },
  'instagram-gaming-creators': {
    platform: 'instagram',
    category: 'Gaming',
    searchKeyword: 'gaming',
    title: 'Top Instagram Gaming Creators for Brand Partnerships',
    description:
      'Discover verified Instagram gaming creators and esports influencers. Our database covers mobile gaming, PC gaming, and game culture creators with real audience data.',
    label: 'Gaming',
    emoji: '🎮',
    related: ['tiktok-gaming-creators', 'instagram-tech-creators'],
  },
  'instagram-skincare-creators': {
    platform: 'instagram',
    category: 'Skincare',
    searchKeyword: 'skincare',
    title: 'Top Instagram Skincare Creators for Brand Partnerships',
    description:
      'Find verified Instagram skincare creators and dermatology influencers. Browse our database of skincare specialists, estheticians, and beauty experts with highly engaged audiences.',
    label: 'Skincare',
    emoji: '🧴',
    related: ['instagram-beauty-creators', 'instagram-wellness-creators', 'tiktok-skincare-creators'],
  },
  'instagram-nutrition-creators': {
    platform: 'instagram',
    category: 'Nutrition',
    searchKeyword: 'nutrition',
    title: 'Top Instagram Nutrition Creators for Brand Partnerships',
    description:
      'Discover verified Instagram nutrition creators, dietitians, and healthy eating influencers. Find authentic food and supplement brand partners with real engagement data.',
    label: 'Nutrition',
    emoji: '🥗',
    related: ['instagram-fitness-creators', 'instagram-wellness-creators', 'instagram-food-creators', 'tiktok-nutrition-creators'],
  },

  // ── TikTok ─────────────────────────────────────────────────
  'tiktok-fitness-influencers': {
    platform: 'tiktok',
    category: 'Fitness',
    searchKeyword: 'fitness',
    title: 'Top TikTok Fitness Influencers for Brand Partnerships',
    description:
      'Find verified TikTok fitness influencers with real engagement data. Our database covers gym creators, home workout specialists, and sports nutrition influencers — all in the high-engagement 50K–500K range.',
    label: 'Fitness',
    emoji: '💪',
    related: ['instagram-fitness-creators', 'tiktok-wellness-creators', 'tiktok-nutrition-creators', 'tiktok-lifestyle-creators'],
  },
  'tiktok-food-influencers': {
    platform: 'tiktok',
    category: 'Food',
    searchKeyword: 'food',
    title: 'Top TikTok Food Influencers for Brand Partnerships',
    description:
      'Discover verified TikTok food creators with viral recipe content and real engagement. Browse our database of food reviewers, recipe developers, and culinary creators ready for brand partnerships.',
    label: 'Food & Drink',
    emoji: '🍽️',
    related: ['instagram-food-creators', 'tiktok-lifestyle-creators', 'tiktok-nutrition-creators'],
  },
  'tiktok-comedy-creators': {
    platform: 'tiktok',
    category: 'Comedy',
    searchKeyword: 'comedy',
    title: 'Top TikTok Comedy Creators for Brand Partnerships',
    description:
      'Find verified TikTok comedy creators and entertainment influencers with massive organic reach. Our database includes sketch comedians, relatable content creators, and viral humor accounts.',
    label: 'Comedy',
    emoji: '😂',
    related: ['tiktok-lifestyle-creators', 'tiktok-beauty-creators'],
  },
  'tiktok-beauty-creators': {
    platform: 'tiktok',
    category: 'Beauty',
    searchKeyword: 'beauty',
    title: 'Top TikTok Beauty Creators for Brand Partnerships',
    description:
      'Discover verified TikTok beauty creators with authentic, highly-engaged audiences. From #BeautyTok specialists to GRWM creators, find beauty influencers with real data.',
    label: 'Beauty',
    emoji: '✨',
    related: ['instagram-beauty-creators', 'tiktok-skincare-creators', 'tiktok-fashion-creators'],
  },
  'tiktok-fashion-creators': {
    platform: 'tiktok',
    category: 'Fashion',
    searchKeyword: 'fashion',
    title: 'Top TikTok Fashion Creators for Brand Partnerships',
    description:
      'Find verified TikTok fashion creators and style influencers. Our database covers outfit creators, thrift flippers, and trend-forward fashion accounts with real engagement data.',
    label: 'Fashion',
    emoji: '👗',
    related: ['instagram-fashion-creators', 'tiktok-beauty-creators', 'tiktok-lifestyle-creators'],
  },
  'tiktok-lifestyle-creators': {
    platform: 'tiktok',
    category: 'Lifestyle',
    searchKeyword: 'lifestyle',
    title: 'Top TikTok Lifestyle Creators for Brand Partnerships',
    description:
      'Discover verified TikTok lifestyle creators with authentic day-in-the-life content. Browse our database of vlog-style, productivity, and everyday lifestyle influencers.',
    label: 'Lifestyle',
    emoji: '🌿',
    related: ['instagram-lifestyle-creators', 'tiktok-wellness-creators', 'tiktok-food-influencers'],
  },
  'tiktok-wellness-creators': {
    platform: 'tiktok',
    category: 'Wellness',
    searchKeyword: 'wellness',
    title: 'Top TikTok Wellness Creators for Brand Partnerships',
    description:
      'Find verified TikTok wellness creators covering mental health, mindfulness, and holistic living. Our database includes yoga creators, therapist influencers, and wellness educators.',
    label: 'Wellness',
    emoji: '🧘',
    related: ['instagram-wellness-creators', 'tiktok-fitness-influencers', 'tiktok-nutrition-creators'],
  },
  'tiktok-travel-creators': {
    platform: 'tiktok',
    category: 'Travel',
    searchKeyword: 'travel',
    title: 'Top TikTok Travel Creators for Brand Partnerships',
    description:
      'Discover verified TikTok travel creators and destination influencers with viral reach. Browse our database of budget travel, luxury travel, and adventure creators.',
    label: 'Travel',
    emoji: '✈️',
    related: ['instagram-travel-creators', 'tiktok-lifestyle-creators', 'tiktok-food-influencers'],
  },
  'tiktok-gaming-creators': {
    platform: 'tiktok',
    category: 'Gaming',
    searchKeyword: 'gaming',
    title: 'Top TikTok Gaming Creators for Brand Partnerships',
    description:
      'Find verified TikTok gaming creators and esports influencers with highly engaged audiences. Our database covers mobile gaming, console gaming, and gaming culture creators.',
    label: 'Gaming',
    emoji: '🎮',
    related: ['instagram-gaming-creators', 'tiktok-tech-creators'],
  },
  'tiktok-tech-creators': {
    platform: 'tiktok',
    category: 'Tech',
    searchKeyword: 'tech',
    title: 'Top TikTok Tech Creators for Brand Partnerships',
    description:
      'Discover verified TikTok tech creators, gadget reviewers, and software influencers. Browse authentic data for technology brand partnerships on TikTok.',
    label: 'Tech',
    emoji: '💻',
    related: ['instagram-tech-creators', 'tiktok-gaming-creators'],
  },
  'tiktok-skincare-creators': {
    platform: 'tiktok',
    category: 'Skincare',
    searchKeyword: 'skincare',
    title: 'Top TikTok Skincare Creators for Brand Partnerships',
    description:
      'Find verified TikTok skincare creators on #SkincareTok. Browse our database of dermatology influencers, estheticians, and skincare enthusiasts with real engagement data.',
    label: 'Skincare',
    emoji: '🧴',
    related: ['instagram-skincare-creators', 'tiktok-beauty-creators', 'tiktok-wellness-creators'],
  },
  'tiktok-nutrition-creators': {
    platform: 'tiktok',
    category: 'Nutrition',
    searchKeyword: 'nutrition',
    title: 'Top TikTok Nutrition Creators for Brand Partnerships',
    description:
      'Discover verified TikTok nutrition creators and healthy eating influencers. Find authentic partners for food, supplement, and wellness brand campaigns.',
    label: 'Nutrition',
    emoji: '🥗',
    related: ['instagram-nutrition-creators', 'tiktok-fitness-influencers', 'tiktok-food-influencers'],
  },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

export function getFollowerRange(followers: number): string {
  if (followers < 100_000) return '50K–100K';
  if (followers < 200_000) return '100K–200K';
  if (followers < 300_000) return '200K–300K';
  if (followers < 500_000) return '300K–500K';
  return '500K+';
}

export interface SafeCreator {
  firstName: string;
  categories: string[];
  platform: Platform;
  followerRange: string;
  location: string | null;
  teaser: string | null;
}

/**
 * Strips all identifying info from a raw row.
 * Maps from the joined social_profiles + creators query.
 * MUST be called server-side only.
 */
export function toSafeCreator(raw: {
  display_name?: any;
  platform?: string | null;
  follower_count?: number | null;
  detected_city?: string | null;
  detected_country?: string | null;
  ai_summary?: string | null;
}): any {
  // Handle Supabase returning display_name as nested object from join
  const rawName =
    typeof raw.display_name === 'object' && raw.display_name !== null
      ? (raw.display_name as any).display_name
      : raw.display_name;
  const firstName = rawName?.trim().split(/\s+/)[0] || 'Creator';
 
  const platform = (raw.platform as any) || 'instagram';
 
  // Strip @handle from the start of ai_summary before extracting teaser
  // ai_summary often starts with "@handle is a ..." — we remove the handle part
  let cleanSummary = raw.ai_summary || '';
  cleanSummary = cleanSummary.replace(/^@\S+\s+(is\s+)?/i, '').trim();
  // Capitalise first letter after stripping
  cleanSummary = cleanSummary.charAt(0).toUpperCase() + cleanSummary.slice(1);
 
  const teaser = cleanSummary
    ? cleanSummary.split(/(?<=[.!?])\s+/)[0].replace(/\.$/, '') + '.'
    : null;
 
  const location =
    [raw.detected_city, raw.detected_country].filter(Boolean).join(', ') || null;
 
  // Extract category hints from original ai_summary for display tags
  const categories: string[] = [];
  const summary = (raw.ai_summary || '').toLowerCase();
  const tagCandidates = [
    'Beauty', 'Fashion', 'Fitness', 'Lifestyle', 'Travel',
    'Food', 'Wellness', 'Skincare', 'Gaming', 'Tech',
    'Nutrition', 'Comedy', 'Parenting',
  ];
  for (const tag of tagCandidates) {
    if (summary.includes(tag.toLowerCase())) {
      categories.push(tag);
    }
    if (categories.length >= 3) break;
  }
 
  return {
    firstName,
    categories,
    platform,
    followerRange: raw.follower_count ? getFollowerRange(raw.follower_count) : '50K–100K',
    location,
    teaser,
  };
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
};

// ─────────────────────────────────────────────────────────────
// Educational content
// ─────────────────────────────────────────────────────────────

export const EDUCATIONAL_CONTENT: Record<
  string,
  { heading: string; paragraphs: string[] }
> = {
  Beauty: {
    heading: 'Working with Beauty Influencers: What Brands Need to Know',
    paragraphs: [
      'Mid-tier beauty creators (50K–500K followers) consistently outperform macro influencers when it comes to conversion. Their audiences are genuinely interested in beauty content rather than celebrity culture, leading to engagement rates 2–4× higher than accounts above 1 million followers.',
      'In the beauty niche, expect authentic engagement rates of 3–8% on Instagram and 5–12% on TikTok. Beauty audiences respond especially well to tutorial-format Reels, product comparison stories, and "honest review" content — these formats drive saves and shares, which amplify organic reach.',
      'Common content formats include Get Ready With Me (GRWM) videos, unboxing hauls, before-and-after skincare routines, and product dupes content. Brands that provide creative freedom and avoid scripted messaging see 40–60% higher engagement than those that restrict creators to rigid briefs.',
      'For campaign success, provide products 3–4 weeks ahead of the posting date, brief for "authentic use" rather than endorsement, and consider multi-post campaigns — beauty audiences trust creators who use products over time rather than one-off sponsored posts.',
    ],
  },
  Fashion: {
    heading: 'Working with Fashion Influencers: What Brands Need to Know',
    paragraphs: [
      "Fashion mid-tier influencers bridge the gap between high-fashion aspirational content and everyday style. With 50K–500K followers, they're accessible enough that audiences see them as peers, not celebrities — and purchase recommendations land much harder because of it.",
      'Fashion content on Instagram sees average engagement of 2.5–5%, with Reels and carousel "outfit of the day" posts driving the highest interaction. On TikTok, "Get The Look" and styling challenge formats regularly go viral in a way that static fashion posts on Instagram rarely do.',
      'The most effective fashion brand campaigns include "styling challenge" briefs where creators show multiple ways to wear a product, seasonal "closet refresh" integrations, and event-based content tied to Fashion Week or seasonal trends.',
      'Gifting campaigns work well for accessories and lower-price-point items, but for luxury fashion or significant product launches, paid partnerships drive more intentional, high-quality content. Budget 6–10 weeks for production timelines.',
    ],
  },
  Fitness: {
    heading: 'Working with Fitness Influencers: What Brands Need to Know',
    paragraphs: [
      'Fitness mid-tier creators have among the highest purchase intent audiences of any niche. Their followers are actively investing in their health — supplements, equipment, activewear, and apps all convert extremely well.',
      'Expect engagement rates of 4–9% for fitness content on Instagram and 6–15% on TikTok. Workout tutorial formats, transformation stories, and "what I eat in a day" content see the highest saves and shares.',
      'Campaign formats that work best: product integration into real workout content, 30-day challenge campaigns, and "athlete-style" storytelling that positions the creator as someone who genuinely uses your product.',
      'Seasonal peaks are January (new year), spring (summer prep), and September (back-to-routine). Booking creators 8–12 weeks in advance is essential during these windows.',
    ],
  },
  Lifestyle: {
    heading: 'Working with Lifestyle Influencers: What Brands Need to Know',
    paragraphs: [
      "Lifestyle creators are the most versatile category for brand partnerships. Their content naturally spans home, wellness, fashion, food, and travel — making them ideal for brands that don't fit neatly into a single niche.",
      'Lifestyle engagement rates sit at 3–6% on Instagram and 5–10% on TikTok. Long-form "Day in My Life" content and home setup posts drive unusually high saves.',
      'The most effective brand integrations feel like natural additions to the creator\'s life. Products that appear in "morning routine" or "weekend activities" content have 2–3× better recall than standalone review posts.',
      "Lifestyle creators typically work with multiple brands — vet for conflicts before signing. A creator who partnered with your direct competitor in the last 60 days is rarely the right choice, even if their metrics look perfect.",
    ],
  },
  Travel: {
    heading: 'Working with Travel Influencers: What Brands Need to Know',
    paragraphs: [
      "Travel influencers with 50K–500K followers represent some of the most highly engaged audiences in creator marketing. Their followers actively aspire to replicate their experiences — and they're searching for the gear, apps, and services that make it possible.",
      'Travel content on Instagram achieves 3–7% engagement, with location-tagged Reels often outperforming static posts by 3–5×. TikTok travel content is highly discovery-driven — creators regularly reach new audiences far beyond their follower count.',
      'Hotel and destination campaigns work best as multi-day story series complemented by a single hero Reel. Luggage, travel accessories, and booking apps convert well through discount codes and affiliate links.',
      'Travel content has unusually long shelf life. A well-produced travel Reel from 6 months ago often still generates saves and profile visits. Factor this into your ROI calculations.',
    ],
  },
  Food: {
    heading: 'Working with Food & Beverage Influencers: What Brands Need to Know',
    paragraphs: [
      'Food and beverage content creators have among the highest save rates of any category. Followers actively bookmark recipes and product recommendations — giving food brands extended exposure well beyond the initial post.',
      "Recipe content on TikTok regularly goes viral in ways Instagram content doesn't. If your product can be integrated into a visually satisfying recipe, TikTok food creators can generate reach disproportionate to their follower count.",
      'The highest-performing campaigns are product-as-ingredient integrations, honest taste-test content, and "pantry staple" positioning for everyday products. Food audiences have a highly tuned inauthenticity detector.',
      'Seasonal and trend-adjacent campaigns dramatically outperform evergreen content. Aligning with food trends can multiply organic reach by 5–10× compared to standard partnership content.',
    ],
  },
  Wellness: {
    heading: 'Working with Wellness Influencers: What Brands Need to Know',
    paragraphs: [
      'Wellness is one of the fastest-growing creator categories. Mid-tier wellness creators carry significant trust — often more than health publications — because followers see them as accessible guides rather than distant experts.',
      'Wellness content engagement sits at 4–8% on Instagram and 6–14% on TikTok. "Morning routine" and "what I take every day" formats drive the highest product consideration.',
      'Supplement, app, and service brands dominate this category, but physical wellness products — yoga mats, diffusers, sleep tech — also perform well when integrated into authentic daily routine content.',
      'Wellness audiences are skeptical of overtly commercial content. Long-term partnerships outperform one-off campaigns — audiences trust products that appear repeatedly over months.',
    ],
  },
  Gaming: {
    heading: 'Working with Gaming Influencers: What Brands Need to Know',
    paragraphs: [
      'Gaming influencers have some of the most loyal, high-intent audiences in creator marketing. Communities follow creators for years and trust their recommendations on hardware, software, and gaming-adjacent products.',
      'Engagement on gaming content averages 5–10% for mid-tier creators, with comment engagement unusually high. Gaming audiences actively discuss recommendations — creating community-driven social proof.',
      'Campaign formats that work: live-stream integrations, product reveal reactions, "setup tour" content, and sponsored gaming sessions with authentic product placement. Avoid overly scripted ad reads.',
      'Mid-tier gaming creators hit specific sub-niches (mobile, FPS, RPG) that macro creators blur. A 150K creator in a specific niche will outperform a 2M general gaming creator for targeted campaigns every time.',
    ],
  },
  Tech: {
    heading: 'Working with Tech Influencers: What Brands Need to Know',
    paragraphs: [
      'Tech influencers drive significant purchasing decisions in B2C and B2B categories. Mid-tier tech creators have highly educated, high-income audiences that index strongly on software tools, productivity apps, and consumer hardware.',
      "Tech content engagement is lower than lifestyle niches (2–4% on Instagram) but click-through and conversion rates are significantly higher. Tech audiences are in \"research mode\" — they save and share content because they're actively evaluating purchases.",
      'Long-form review and "first look" content outperforms short-form. Audiences want to see genuine use and honest comparison to alternatives. Brands that allow authentic reviews see dramatically better long-term performance.',
      'Tutorial and "how I use it in my workflow" content converts particularly well for software partnerships. Show the product solving a real problem — not just listing features.',
    ],
  },
  Comedy: {
    heading: 'Working with Comedy & Entertainment Creators: What Brands Need to Know',
    paragraphs: [
      'Comedy creators produce some of the highest-organic-reach content on TikTok and Instagram. Their content spreads through shares, duets, and reposts — making them uniquely powerful for broad awareness campaigns.',
      'Comedy content engagement ranges from 3–5% baseline to 20–50%+ for viral posts. Evaluate average engagement across 30+ posts rather than peak viral numbers, which can skew metrics significantly.',
      "The most effective brand integrations are ones where the brand becomes part of the joke — self-aware and willing to be gently mocked. Brands requiring earnest promotion from comedy creators consistently underperform.",
      "Comedy audiences skew younger (18–34) and are mobile-first. Give creators the premise, not the script — the best brand integrations feel like the creator's own idea.",
    ],
  },
  Skincare: {
    heading: 'Working with Skincare Influencers: What Brands Need to Know',
    paragraphs: [
      'Skincare is the beauty sub-niche with the highest purchase conversion rates. Audiences research, compare, and when a trusted creator recommends something, they buy. Mid-tier skincare creators have built audiences around trust and expertise.',
      "Skincare content engagement averages 4–9% on Instagram and 6–14% on TikTok. #SkincareTok is one of TikTok's most active beauty communities, with dermatology-adjacent content regularly reaching millions.",
      'Multi-week "skin journey" campaigns outperform single-post reviews because skincare results take time. Structure campaigns around genuine testing windows of 4–6 weeks, not 48-hour turnarounds.',
      'Ingredient transparency and science-backed messaging perform particularly well. Creators who can explain the formulation — not just say "it works" — drive higher purchase intent.',
    ],
  },
  Nutrition: {
    heading: 'Working with Nutrition Creators: What Brands Need to Know',
    paragraphs: [
      'Nutrition creators are among the most conversion-focused influencers in the wellness space. Their audiences actively seek recommendations for supplements, protein, healthy snacks, and functional foods — with high purchase intent.',
      'Nutrition content engagement sits at 4–8% on Instagram and 6–12% on TikTok. "What I eat in a day" and "meal prep" formats drive the highest engagement and saves.',
      'Campaign structures that work best: 30-day integration challenges, recipe development campaigns, and "supplement stack" explainer content. Avoid vague health claims — audiences and FTC guidelines both require specificity.',
      'Brief creators with full ingredient information early — nutrition-educated audiences ask detailed questions in the comments, and creators need to be prepared to answer authentically.',
    ],
  },
  Parenting: {
    heading: 'Working with Parenting Creators: What Brands Need to Know',
    paragraphs: [
      "Parenting influencers have some of the highest trust-based conversion rates in creator marketing. Parents are high-frequency buyers across categories — baby gear, children's products, education tools, and household brands.",
      'Parenting content engagement averages 4–8% on Instagram. Authenticity is paramount — audiences quickly disengage from unrealistically curated family content, and reward honest, vulnerable posts with unusually high loyalty.',
      'Campaign formats that perform well: product integration into genuine family routines, age-specific recommendations, and "comparison review" content. Testimonial-style content from genuine customers outperforms scripted endorsements.',
      "Regulatory considerations are heightened here. Ensure health claims for children's products are compliant, and brief creators on disclosure requirements carefully — parenting audiences are vocal about undisclosed sponsorships.",
    ],
  },
};

export function getEducationalContent(category: string) {
  return (
    EDUCATIONAL_CONTENT[category] || {
      heading: `Working with ${category} Influencers: What Brands Need to Know`,
      paragraphs: [
        `Mid-tier ${category.toLowerCase()} creators (50K–500K followers) consistently deliver stronger ROI than macro influencers. Their audiences are genuinely passionate about the niche, leading to engagement rates 2–4× higher than accounts above 1 million followers.`,
        `Authentic integration beats scripted endorsement in every creator category. Provide creative freedom within a clear brief and allow the creator to speak in their own voice. The most successful campaigns feel like genuine recommendations.`,
        `Structure ${category.toLowerCase()} campaigns around multi-post integrations rather than one-off posts. Audiences trust creators who use products over time, and multiple touchpoints drive higher awareness than a single sponsored post.`,
        'Brief creators 4–6 weeks ahead of the desired posting date to allow for product delivery, genuine use, and content production. Rushed timelines produce rushed content — and rushed content underperforms.',
      ],
    }
  );
}
