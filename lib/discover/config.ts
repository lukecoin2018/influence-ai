// ─────────────────────────────────────────────────────────────
// lib/discover/config.ts
// ─────────────────────────────────────────────────────────────

export type Platform = 'instagram' | 'tiktok';
export type PageType = 'niche' | 'location' | 'tier';

// ─────────────────────────────────────────────────────────────
// NICHE PAGES
// ─────────────────────────────────────────────────────────────

export interface DiscoverPageConfig {
  type: 'niche';
  platform: Platform;
  category: string;
  searchKeyword: string;
  title: string;
  description: string;
  label: string;
  emoji: string;
  related: string[];
}

export const DISCOVER_PAGES: Record<string, DiscoverPageConfig> = {
  'instagram-beauty-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Beauty',
    searchKeyword: 'beauty',
    title: 'Top Instagram Beauty Creators for Brand Partnerships',
    description: 'Discover verified Instagram beauty creators with real engagement data. Our curated database includes skincare specialists, makeup artists, beauty reviewers, and wellness influencers — all in the 50K–500K follower sweet spot.',
    label: 'Beauty',
    emoji: '✨',
    related: ['instagram-skincare-creators', 'instagram-fashion-creators', 'instagram-lifestyle-creators', 'tiktok-beauty-creators'],
  },
  'instagram-fashion-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Fashion',
    searchKeyword: 'fashion',
    title: 'Top Instagram Fashion Creators for Brand Partnerships',
    description: 'Find verified Instagram fashion creators and style influencers with authentic audiences. Browse our database of 50K–500K fashion creators ready for brand collaborations.',
    label: 'Fashion',
    emoji: '👗',
    related: ['instagram-beauty-creators', 'instagram-lifestyle-creators', 'tiktok-fashion-creators', 'instagram-skincare-creators'],
  },
  'instagram-fitness-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Fitness',
    searchKeyword: 'fitness',
    title: 'Top Instagram Fitness Creators for Brand Partnerships',
    description: 'Connect with verified Instagram fitness creators and wellness influencers. Our database covers personal trainers, gym enthusiasts, yoga instructors, and nutrition experts with real engagement data.',
    label: 'Fitness',
    emoji: '💪',
    related: ['instagram-wellness-creators', 'instagram-lifestyle-creators', 'tiktok-fitness-influencers', 'instagram-nutrition-creators'],
  },
  'instagram-lifestyle-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Lifestyle',
    searchKeyword: 'lifestyle',
    title: 'Top Instagram Lifestyle Creators for Brand Partnerships',
    description: 'Discover verified Instagram lifestyle creators who blend daily life, inspiration, and brand storytelling. Browse real engagement data for 50K–500K lifestyle influencers.',
    label: 'Lifestyle',
    emoji: '🌿',
    related: ['instagram-beauty-creators', 'instagram-fashion-creators', 'instagram-travel-creators', 'tiktok-lifestyle-creators'],
  },
  'instagram-travel-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Travel',
    searchKeyword: 'travel',
    title: 'Top Instagram Travel Creators for Brand Partnerships',
    description: 'Find verified Instagram travel creators and destination influencers with highly engaged audiences. Our database includes travel photographers, adventure creators, and luxury travel influencers.',
    label: 'Travel',
    emoji: '✈️',
    related: ['instagram-lifestyle-creators', 'tiktok-travel-creators', 'instagram-food-creators'],
  },
  'instagram-food-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Food',
    searchKeyword: 'food',
    title: 'Top Instagram Food Creators for Brand Partnerships',
    description: 'Discover verified Instagram food creators, recipe developers, and culinary influencers. Browse real engagement data for food and beverage brand collaborations.',
    label: 'Food & Drink',
    emoji: '🍽️',
    related: ['tiktok-food-influencers', 'instagram-lifestyle-creators', 'instagram-wellness-creators', 'instagram-nutrition-creators'],
  },
  'instagram-wellness-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Wellness',
    searchKeyword: 'wellness',
    title: 'Top Instagram Wellness Creators for Brand Partnerships',
    description: 'Connect with verified Instagram wellness creators covering mental health, mindfulness, yoga, and holistic living. Find influencers with authentic, engaged wellness audiences.',
    label: 'Wellness',
    emoji: '🧘',
    related: ['instagram-fitness-creators', 'instagram-lifestyle-creators', 'tiktok-wellness-creators', 'instagram-nutrition-creators'],
  },
  'instagram-parenting-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Parenting',
    searchKeyword: 'parenting',
    title: 'Top Instagram Parenting Creators for Brand Partnerships',
    description: 'Discover verified Instagram parenting influencers and family creators. Our database includes mommy bloggers, dad influencers, and family content creators with authentic engaged audiences.',
    label: 'Parenting',
    emoji: '👨‍👩‍👧',
    related: ['instagram-lifestyle-creators', 'instagram-wellness-creators'],
  },
  'instagram-tech-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Tech',
    searchKeyword: 'tech',
    title: 'Top Instagram Tech Creators for Brand Partnerships',
    description: 'Find verified Instagram tech creators, gadget reviewers, and software influencers. Browse authentic engagement data for technology and software brand partnerships.',
    label: 'Tech',
    emoji: '💻',
    related: ['tiktok-tech-creators', 'instagram-gaming-creators'],
  },
  'instagram-gaming-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Gaming',
    searchKeyword: 'gaming',
    title: 'Top Instagram Gaming Creators for Brand Partnerships',
    description: 'Discover verified Instagram gaming creators and esports influencers. Our database covers mobile gaming, PC gaming, and game culture creators with real audience data.',
    label: 'Gaming',
    emoji: '🎮',
    related: ['tiktok-gaming-creators', 'instagram-tech-creators'],
  },
  'instagram-skincare-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Skincare',
    searchKeyword: 'skincare',
    title: 'Top Instagram Skincare Creators for Brand Partnerships',
    description: 'Find verified Instagram skincare creators and dermatology influencers. Browse our database of skincare specialists, estheticians, and beauty experts with highly engaged audiences.',
    label: 'Skincare',
    emoji: '🧴',
    related: ['instagram-beauty-creators', 'instagram-wellness-creators', 'tiktok-skincare-creators'],
  },
  'instagram-nutrition-creators': {
    type: 'niche',
    platform: 'instagram',
    category: 'Nutrition',
    searchKeyword: 'nutrition',
    title: 'Top Instagram Nutrition Creators for Brand Partnerships',
    description: 'Discover verified Instagram nutrition creators, dietitians, and healthy eating influencers. Find authentic food and supplement brand partners with real engagement data.',
    label: 'Nutrition',
    emoji: '🥗',
    related: ['instagram-fitness-creators', 'instagram-wellness-creators', 'instagram-food-creators', 'tiktok-nutrition-creators'],
  },
  'tiktok-fitness-influencers': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Fitness',
    searchKeyword: 'fitness',
    title: 'Top TikTok Fitness Influencers for Brand Partnerships',
    description: 'Find verified TikTok fitness influencers with real engagement data. Our database covers gym creators, home workout specialists, and sports nutrition influencers — all in the high-engagement 50K–500K range.',
    label: 'Fitness',
    emoji: '💪',
    related: ['instagram-fitness-creators', 'tiktok-wellness-creators', 'tiktok-nutrition-creators', 'tiktok-lifestyle-creators'],
  },
  'tiktok-food-influencers': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Food',
    searchKeyword: 'food',
    title: 'Top TikTok Food Influencers for Brand Partnerships',
    description: 'Discover verified TikTok food creators with viral recipe content and real engagement. Browse our database of food reviewers, recipe developers, and culinary creators ready for brand partnerships.',
    label: 'Food & Drink',
    emoji: '🍽️',
    related: ['instagram-food-creators', 'tiktok-lifestyle-creators', 'tiktok-nutrition-creators'],
  },
  'tiktok-comedy-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Comedy',
    searchKeyword: 'comedy',
    title: 'Top TikTok Comedy Creators for Brand Partnerships',
    description: 'Find verified TikTok comedy creators and entertainment influencers with massive organic reach. Our database includes sketch comedians, relatable content creators, and viral humor accounts.',
    label: 'Comedy',
    emoji: '😂',
    related: ['tiktok-lifestyle-creators', 'tiktok-beauty-creators'],
  },
  'tiktok-beauty-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Beauty',
    searchKeyword: 'beauty',
    title: 'Top TikTok Beauty Creators for Brand Partnerships',
    description: 'Discover verified TikTok beauty creators with authentic, highly-engaged audiences. From #BeautyTok specialists to GRWM creators, find beauty influencers with real data.',
    label: 'Beauty',
    emoji: '✨',
    related: ['instagram-beauty-creators', 'tiktok-skincare-creators', 'tiktok-fashion-creators'],
  },
  'tiktok-fashion-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Fashion',
    searchKeyword: 'fashion',
    title: 'Top TikTok Fashion Creators for Brand Partnerships',
    description: 'Find verified TikTok fashion creators and style influencers. Our database covers outfit creators, thrift flippers, and trend-forward fashion accounts with real engagement data.',
    label: 'Fashion',
    emoji: '👗',
    related: ['instagram-fashion-creators', 'tiktok-beauty-creators', 'tiktok-lifestyle-creators'],
  },
  'tiktok-lifestyle-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Lifestyle',
    searchKeyword: 'lifestyle',
    title: 'Top TikTok Lifestyle Creators for Brand Partnerships',
    description: 'Discover verified TikTok lifestyle creators with authentic day-in-the-life content. Browse our database of vlog-style, productivity, and everyday lifestyle influencers.',
    label: 'Lifestyle',
    emoji: '🌿',
    related: ['instagram-lifestyle-creators', 'tiktok-wellness-creators', 'tiktok-food-influencers'],
  },
  'tiktok-wellness-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Wellness',
    searchKeyword: 'wellness',
    title: 'Top TikTok Wellness Creators for Brand Partnerships',
    description: 'Find verified TikTok wellness creators covering mental health, mindfulness, and holistic living. Our database includes yoga creators, therapist influencers, and wellness educators.',
    label: 'Wellness',
    emoji: '🧘',
    related: ['instagram-wellness-creators', 'tiktok-fitness-influencers', 'tiktok-nutrition-creators'],
  },
  'tiktok-travel-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Travel',
    searchKeyword: 'travel',
    title: 'Top TikTok Travel Creators for Brand Partnerships',
    description: 'Discover verified TikTok travel creators and destination influencers with viral reach. Browse our database of budget travel, luxury travel, and adventure creators.',
    label: 'Travel',
    emoji: '✈️',
    related: ['instagram-travel-creators', 'tiktok-lifestyle-creators', 'tiktok-food-influencers'],
  },
  'tiktok-gaming-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Gaming',
    searchKeyword: 'gaming',
    title: 'Top TikTok Gaming Creators for Brand Partnerships',
    description: 'Find verified TikTok gaming creators and esports influencers with highly engaged audiences. Our database covers mobile gaming, console gaming, and gaming culture creators.',
    label: 'Gaming',
    emoji: '🎮',
    related: ['instagram-gaming-creators', 'tiktok-tech-creators'],
  },
  'tiktok-tech-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Tech',
    searchKeyword: 'tech',
    title: 'Top TikTok Tech Creators for Brand Partnerships',
    description: 'Discover verified TikTok tech creators, gadget reviewers, and software influencers. Browse authentic data for technology brand partnerships on TikTok.',
    label: 'Tech',
    emoji: '💻',
    related: ['instagram-tech-creators', 'tiktok-gaming-creators'],
  },
  'tiktok-skincare-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Skincare',
    searchKeyword: 'skincare',
    title: 'Top TikTok Skincare Creators for Brand Partnerships',
    description: 'Find verified TikTok skincare creators on #SkincareTok. Browse our database of dermatology influencers, estheticians, and skincare enthusiasts with real engagement data.',
    label: 'Skincare',
    emoji: '🧴',
    related: ['instagram-skincare-creators', 'tiktok-beauty-creators', 'tiktok-wellness-creators'],
  },
  'tiktok-nutrition-creators': {
    type: 'niche',
    platform: 'tiktok',
    category: 'Nutrition',
    searchKeyword: 'nutrition',
    title: 'Top TikTok Nutrition Creators for Brand Partnerships',
    description: 'Discover verified TikTok nutrition creators and healthy eating influencers. Find authentic partners for food, supplement, and wellness brand campaigns.',
    label: 'Nutrition',
    emoji: '🥗',
    related: ['instagram-nutrition-creators', 'tiktok-fitness-influencers', 'tiktok-food-influencers'],
  },
};

// ─────────────────────────────────────────────────────────────
// LOCATION PAGES
// ─────────────────────────────────────────────────────────────

export interface LocationPageConfig {
  type: 'location';
  platform?: Platform;
  searchKeyword?: string;
  locationMatch: string[];
  locationLabel: string;
  title: string;
  description: string;
  label: string;
  emoji: string;
  related: string[];
}

export const LOCATION_PAGES: Record<string, LocationPageConfig> = {
  // ── City pages ─────────────────────────────────────────────
  'instagram-creators-new-york': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Nyc', 'New York'],
    locationLabel: 'New York',
    title: 'Top Instagram Creators in New York for Brand Partnerships',
    description: 'Discover verified Instagram creators based in New York City with real engagement data. Browse fashion, lifestyle, food, and beauty influencers from the world\'s most influential city.',
    label: 'New York',
    emoji: '🗽',
    related: ['instagram-creators-los-angeles', 'instagram-creators-united-states', 'instagram-creators-miami'],
  },
  'instagram-creators-los-angeles': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['La', 'Los Angeles'],
    locationLabel: 'Los Angeles',
    title: 'Top Instagram Creators in Los Angeles for Brand Partnerships',
    description: 'Find verified Instagram creators based in Los Angeles with authentic audiences. LA is home to some of the world\'s most influential content creators across beauty, fashion, fitness, and lifestyle.',
    label: 'Los Angeles',
    emoji: '🌴',
    related: ['instagram-creators-new-york', 'instagram-creators-united-states', 'instagram-creators-miami'],
  },
  'instagram-creators-london': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['London'],
    locationLabel: 'London',
    title: 'Top Instagram Creators in London for Brand Partnerships',
    description: 'Discover verified Instagram creators based in London with real engagement data. London\'s creator scene spans fashion, beauty, food, and lifestyle with a uniquely cosmopolitan audience.',
    label: 'London',
    emoji: '🇬🇧',
    related: ['instagram-creators-united-kingdom', 'instagram-creators-paris', 'instagram-creators-madrid'],
  },
  'instagram-creators-miami': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Miami'],
    locationLabel: 'Miami',
    title: 'Top Instagram Creators in Miami for Brand Partnerships',
    description: 'Find verified Instagram creators based in Miami with highly engaged audiences. Miami\'s vibrant creator community covers fashion, fitness, lifestyle, and luxury content.',
    label: 'Miami',
    emoji: '🌊',
    related: ['instagram-creators-new-york', 'instagram-creators-los-angeles', 'instagram-creators-united-states'],
  },
  'instagram-creators-dallas': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Dallas'],
    locationLabel: 'Dallas',
    title: 'Top Instagram Creators in Dallas for Brand Partnerships',
    description: 'Discover verified Instagram creators based in Dallas, Texas with real engagement data. Dallas has a thriving creator community across lifestyle, fashion, food, and fitness.',
    label: 'Dallas',
    emoji: '⭐',
    related: ['instagram-creators-united-states', 'instagram-creators-miami', 'instagram-creators-new-york'],
  },
  'instagram-creators-paris': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Paris'],
    locationLabel: 'Paris',
    title: 'Top Instagram Creators in Paris for Brand Partnerships',
    description: 'Find verified Instagram creators based in Paris with authentic audiences. Parisian creators are known for their sophisticated aesthetic across fashion, beauty, food, and lifestyle.',
    label: 'Paris',
    emoji: '🗼',
    related: ['instagram-creators-france', 'instagram-creators-london', 'instagram-creators-madrid'],
  },
  'instagram-creators-madrid': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Madrid'],
    locationLabel: 'Madrid',
    title: 'Top Instagram Creators in Madrid for Brand Partnerships',
    description: 'Discover verified Instagram creators based in Madrid with real engagement data. Madrid\'s creator scene is one of Europe\'s most dynamic, spanning fashion, lifestyle, and food content.',
    label: 'Madrid',
    emoji: '🇪🇸',
    related: ['instagram-creators-spain', 'instagram-creators-paris', 'instagram-creators-london'],
  },
  'instagram-creators-dubai': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Dubai', 'UAE', 'United Arab Emirates'],
    locationLabel: 'Dubai',
    title: 'Top Instagram Creators in Dubai for Brand Partnerships',
    description: 'Find verified Instagram creators based in Dubai and the UAE with authentic audiences. Dubai\'s creator community is internationally connected, spanning luxury lifestyle, fashion, travel, and wellness.',
    label: 'Dubai',
    emoji: '🏙️',
    related: ['instagram-creators-london', 'instagram-creators-paris', 'instagram-fashion-creators'],
  },

  // ── Country pages ──────────────────────────────────────────
  'instagram-creators-united-states': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['United States', 'USA', 'Nyc', 'New York', 'La', 'Los Angeles', 'Dallas', 'Miami', 'Houston', 'Chicago', 'Atlanta', 'Boston', 'Nashville'],
    locationLabel: 'the United States',
    title: 'Top Instagram Creators in the United States for Brand Partnerships',
    description: 'Browse verified US-based Instagram creators with real engagement data. From New York to Los Angeles, our database covers American creators across every niche and follower range.',
    label: 'United States',
    emoji: '🇺🇸',
    related: ['instagram-creators-new-york', 'instagram-creators-los-angeles', 'instagram-creators-miami', 'instagram-creators-dallas'],
  },
  'instagram-creators-united-kingdom': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'London'],
    locationLabel: 'the United Kingdom',
    title: 'Top Instagram Creators in the UK for Brand Partnerships',
    description: 'Discover verified UK-based Instagram creators with real engagement data. British creators are known for authentic storytelling across fashion, beauty, lifestyle, and food.',
    label: 'United Kingdom',
    emoji: '🇬🇧',
    related: ['instagram-creators-london', 'instagram-creators-paris', 'instagram-creators-germany'],
  },
  'instagram-creators-france': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['France', 'Paris'],
    locationLabel: 'France',
    title: 'Top Instagram Creators in France for Brand Partnerships',
    description: 'Find verified French Instagram creators with authentic audiences. French creators bring a distinctive aesthetic to fashion, beauty, food, and lifestyle content.',
    label: 'France',
    emoji: '🇫🇷',
    related: ['instagram-creators-paris', 'instagram-creators-united-kingdom', 'instagram-creators-spain'],
  },
  'instagram-creators-germany': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Germany', 'Berlin'],
    locationLabel: 'Germany',
    title: 'Top Instagram Creators in Germany for Brand Partnerships',
    description: 'Discover verified German Instagram creators with real engagement data. Germany\'s creator market is one of Europe\'s largest, with strong audiences across fitness, lifestyle, and tech.',
    label: 'Germany',
    emoji: '🇩🇪',
    related: ['instagram-creators-united-kingdom', 'instagram-creators-france', 'instagram-creators-spain'],
  },
  'instagram-creators-spain': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Spain', 'Madrid', 'Barcelona'],
    locationLabel: 'Spain',
    title: 'Top Instagram Creators in Spain for Brand Partnerships',
    description: 'Find verified Spanish Instagram creators with authentic audiences. Spanish creators are known for vibrant fashion, lifestyle, and food content with highly engaged local audiences.',
    label: 'Spain',
    emoji: '🇪🇸',
    related: ['instagram-creators-madrid', 'instagram-creators-france', 'instagram-creators-united-kingdom'],
  },
  'instagram-creators-canada': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Canada', 'Toronto', 'Vancouver'],
    locationLabel: 'Canada',
    title: 'Top Instagram Creators in Canada for Brand Partnerships',
    description: 'Discover verified Canadian Instagram creators with real engagement data. Canada\'s creator scene spans lifestyle, fashion, fitness, and food with bilingual English and French audiences.',
    label: 'Canada',
    emoji: '🇨🇦',
    related: ['instagram-creators-united-states', 'instagram-creators-united-kingdom'],
  },
  'instagram-creators-brazil': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Brazil', 'Brasil'],
    locationLabel: 'Brazil',
    title: 'Top Instagram Creators in Brazil for Brand Partnerships',
    description: 'Find verified Brazilian Instagram creators with authentic audiences. Brazil has one of the world\'s most active Instagram communities, with creators known for fashion, beauty, and lifestyle.',
    label: 'Brazil',
    emoji: '🇧🇷',
    related: ['instagram-creators-colombia', 'instagram-creators-spain'],
  },
  'instagram-creators-colombia': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Colombia'],
    locationLabel: 'Colombia',
    title: 'Top Instagram Creators in Colombia for Brand Partnerships',
    description: 'Discover verified Colombian Instagram creators with real engagement data. Colombian creators produce highly engaged fashion, beauty, and lifestyle content for both local and international audiences.',
    label: 'Colombia',
    emoji: '🇨🇴',
    related: ['instagram-creators-brazil', 'instagram-creators-spain'],
  },
  'instagram-creators-mexico': {
    type: 'location',
    platform: 'instagram',
    locationMatch: ['Mexico', 'México'],
    locationLabel: 'Mexico',
    title: 'Top Instagram Creators in Mexico for Brand Partnerships',
    description: 'Find verified Mexican Instagram creators with authentic audiences. Mexico\'s creator market is one of Latin America\'s largest, with strong content across fashion, food, beauty, and lifestyle.',
    label: 'Mexico',
    emoji: '🇲🇽',
    related: ['instagram-creators-colombia', 'instagram-creators-brazil', 'instagram-creators-united-states'],
  },
  'tiktok-creators-new-york': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['Nyc', 'New York'],
  locationLabel: 'New York',
  title: 'Top TikTok Creators in New York for Brand Partnerships',
  description: 'Discover verified TikTok creators based in New York City with real engagement data. NYC creators lead trends across fashion, lifestyle, food, and entertainment.',
  label: 'New York',
  emoji: '🗽',
  related: ['instagram-creators-new-york', 'tiktok-creators-los-angeles', 'tiktok-creators-united-states'],
},
'tiktok-creators-los-angeles': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['La', 'Los Angeles'],
  locationLabel: 'Los Angeles',
  title: 'Top TikTok Creators in Los Angeles for Brand Partnerships',
  description: 'Find verified TikTok creators based in Los Angeles with authentic audiences. LA is the epicenter of viral TikTok content across beauty, fashion, fitness, and entertainment.',
  label: 'Los Angeles',
  emoji: '🌴',
  related: ['instagram-creators-los-angeles', 'tiktok-creators-new-york', 'tiktok-creators-united-states'],
},
'tiktok-creators-london': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['London'],
  locationLabel: 'London',
  title: 'Top TikTok Creators in London for Brand Partnerships',
  description: 'Discover verified TikTok creators based in London with real engagement data. London\'s TikTok scene is one of Europe\'s most vibrant, spanning fashion, food, lifestyle, and comedy.',
  label: 'London',
  emoji: '🇬🇧',
  related: ['instagram-creators-london', 'tiktok-creators-united-kingdom', 'tiktok-creators-new-york'],
},
'tiktok-creators-dallas': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['Dallas'],
  locationLabel: 'Dallas',
  title: 'Top TikTok Creators in Dallas for Brand Partnerships',
  description: 'Find verified TikTok creators based in Dallas, Texas with authentic audiences. Dallas has a fast-growing TikTok creator community across lifestyle, food, fashion, and fitness.',
  label: 'Dallas',
  emoji: '⭐',
  related: ['instagram-creators-dallas', 'tiktok-creators-united-states', 'tiktok-creators-miami'],
},
'tiktok-creators-miami': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['Miami'],
  locationLabel: 'Miami',
  title: 'Top TikTok Creators in Miami for Brand Partnerships',
  description: 'Discover verified TikTok creators based in Miami with highly engaged audiences. Miami\'s vibrant energy translates perfectly to TikTok content across fashion, fitness, lifestyle, and food.',
  label: 'Miami',
  emoji: '🌊',
  related: ['instagram-creators-miami', 'tiktok-creators-new-york', 'tiktok-creators-united-states'],
},
'tiktok-creators-united-states': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['United States', 'USA', 'Nyc', 'New York', 'La', 'Los Angeles', 'Dallas', 'Miami', 'Houston', 'Chicago', 'Atlanta', 'Boston', 'Nashville'],
  locationLabel: 'the United States',
  title: 'Top TikTok Creators in the United States for Brand Partnerships',
  description: 'Browse verified US-based TikTok creators with real engagement data. American TikTok creators dominate global trends across every niche — from beauty and fashion to fitness and food.',
  label: 'United States',
  emoji: '🇺🇸',
  related: ['instagram-creators-united-states', 'tiktok-creators-new-york', 'tiktok-creators-los-angeles', 'tiktok-creators-miami'],
},
'tiktok-creators-united-kingdom': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['United Kingdom', 'UK', 'England', 'Scotland', 'Wales', 'London'],
  locationLabel: 'the United Kingdom',
  title: 'Top TikTok Creators in the UK for Brand Partnerships',
  description: 'Find verified UK-based TikTok creators with authentic audiences. British TikTok creators are known for witty, relatable content across fashion, beauty, lifestyle, and comedy.',
  label: 'United Kingdom',
  emoji: '🇬🇧',
  related: ['instagram-creators-united-kingdom', 'tiktok-creators-london', 'tiktok-creators-new-york'],
},
'tiktok-creators-mexico': {
  type: 'location',
  platform: 'tiktok',
  locationMatch: ['Mexico', 'México'],
  locationLabel: 'Mexico',
  title: 'Top TikTok Creators in Mexico for Brand Partnerships',
  description: 'Discover verified Mexican TikTok creators with real engagement data. Mexico has one of Latin America\'s most active TikTok communities with creators spanning food, fashion, comedy, and lifestyle.',
  label: 'Mexico',
  emoji: '🇲🇽',
  related: ['instagram-creators-mexico', 'tiktok-creators-united-states', 'tiktok-creators-los-angeles'],
},
};

// ─────────────────────────────────────────────────────────────
// TIER PAGES
// ─────────────────────────────────────────────────────────────

export const FOLLOWER_TIERS = {
  micro: { min: 50_000, max: 100_000, label: 'Micro-Influencers', range: '50K–100K' },
  'mid-tier': { min: 100_001, max: 250_000, label: 'Mid-Tier Creators', range: '100K–250K' },
  top: { min: 250_001, max: 500_000, label: 'Top Influencers', range: '250K–500K' },
} as const;

export type TierKey = keyof typeof FOLLOWER_TIERS;

export interface TierPageConfig {
  type: 'tier';
  tier: TierKey;
  searchKeyword: string;
  category: string;
  title: string;
  description: string;
  label: string;
  emoji: string;
  related: string[];
}

export const TIER_PAGES: Record<string, TierPageConfig> = {
  // ── Micro (50K–100K) ───────────────────────────────────────
  'micro-influencers-beauty': {
    type: 'tier',
    tier: 'micro',
    searchKeyword: 'beauty',
    category: 'Beauty',
    title: 'Best Beauty Micro-Influencers for Brand Campaigns (50K–100K)',
    description: 'Discover beauty micro-influencers with 50K–100K followers and engagement rates 2–3× higher than macro accounts. Authentic audiences, accessible rates, and niche communities that convert.',
    label: 'Beauty Micro',
    emoji: '✨',
    related: ['mid-tier-beauty-creators', 'micro-influencers-fashion', 'instagram-beauty-creators', 'tiktok-beauty-creators'],
  },
  'micro-influencers-fashion': {
    type: 'tier',
    tier: 'micro',
    searchKeyword: 'fashion',
    category: 'Fashion',
    title: 'Best Fashion Micro-Influencers for Brand Campaigns (50K–100K)',
    description: 'Find fashion micro-influencers with 50K–100K followers. Micro fashion creators have tightly-knit style communities that trust their recommendations and act on them.',
    label: 'Fashion Micro',
    emoji: '👗',
    related: ['mid-tier-fashion-creators', 'micro-influencers-beauty', 'instagram-fashion-creators'],
  },
  'micro-influencers-fitness': {
    type: 'tier',
    tier: 'micro',
    searchKeyword: 'fitness',
    category: 'Fitness',
    title: 'Best Fitness Micro-Influencers for Brand Campaigns (50K–100K)',
    description: 'Connect with fitness micro-influencers in the 50K–100K range. Fitness micro-creators have some of the highest purchase intent audiences in the creator economy — perfect for supplements, gear, and apps.',
    label: 'Fitness Micro',
    emoji: '💪',
    related: ['mid-tier-fitness-creators', 'micro-influencers-wellness', 'tiktok-fitness-influencers'],
  },
  'micro-influencers-lifestyle': {
    type: 'tier',
    tier: 'micro',
    searchKeyword: 'lifestyle',
    category: 'Lifestyle',
    title: 'Best Lifestyle Micro-Influencers for Brand Campaigns (50K–100K)',
    description: 'Discover lifestyle micro-influencers with 50K–100K followers. These creators blend daily life, inspiration, and genuine product recommendations — ideal for brands wanting authentic, relatable content.',
    label: 'Lifestyle Micro',
    emoji: '🌿',
    related: ['mid-tier-lifestyle-creators', 'micro-influencers-beauty', 'instagram-lifestyle-creators'],
  },
  'micro-influencers-wellness': {
    type: 'tier',
    tier: 'micro',
    searchKeyword: 'wellness',
    category: 'Wellness',
    title: 'Best Wellness Micro-Influencers for Brand Campaigns (50K–100K)',
    description: 'Find wellness micro-influencers with 50K–100K followers and highly engaged health-focused audiences. Perfect for supplement, app, and wellness product brands seeking authentic partnerships.',
    label: 'Wellness Micro',
    emoji: '🧘',
    related: ['mid-tier-wellness-creators', 'micro-influencers-fitness', 'instagram-wellness-creators'],
  },

  // ── Mid-tier (100K–250K) ───────────────────────────────────
  'mid-tier-beauty-creators': {
    type: 'tier',
    tier: 'mid-tier',
    searchKeyword: 'beauty',
    category: 'Beauty',
    title: 'Mid-Tier Beauty Creators for Brand Partnerships (100K–250K)',
    description: 'Find beauty creators in the 100K–250K sweet spot — large enough for real reach, engaged enough for real results. The ideal tier for beauty brands seeking both visibility and conversion.',
    label: 'Beauty Mid-Tier',
    emoji: '✨',
    related: ['micro-influencers-beauty', 'top-beauty-influencers', 'instagram-beauty-creators'],
  },
  'mid-tier-fashion-creators': {
    type: 'tier',
    tier: 'mid-tier',
    searchKeyword: 'fashion',
    category: 'Fashion',
    title: 'Mid-Tier Fashion Creators for Brand Partnerships (100K–250K)',
    description: 'Discover fashion creators in the 100K–250K range. Mid-tier fashion creators deliver the balance of aspirational reach and authentic engagement that converts browsers into buyers.',
    label: 'Fashion Mid-Tier',
    emoji: '👗',
    related: ['micro-influencers-fashion', 'top-fashion-influencers', 'instagram-fashion-creators'],
  },
  'mid-tier-fitness-creators': {
    type: 'tier',
    tier: 'mid-tier',
    searchKeyword: 'fitness',
    category: 'Fitness',
    title: 'Mid-Tier Fitness Creators for Brand Partnerships (100K–250K)',
    description: 'Connect with fitness creators in the 100K–250K range. This tier offers the best combination of audience size, engagement quality, and accessible partnership rates for fitness brands.',
    label: 'Fitness Mid-Tier',
    emoji: '💪',
    related: ['micro-influencers-fitness', 'top-fitness-influencers', 'instagram-fitness-creators'],
  },
  'mid-tier-lifestyle-creators': {
    type: 'tier',
    tier: 'mid-tier',
    searchKeyword: 'lifestyle',
    category: 'Lifestyle',
    title: 'Mid-Tier Lifestyle Creators for Brand Partnerships (100K–250K)',
    description: 'Find lifestyle creators in the 100K–250K sweet spot. Mid-tier lifestyle creators have established audiences that trust them — and the reach to meaningfully amplify your brand.',
    label: 'Lifestyle Mid-Tier',
    emoji: '🌿',
    related: ['micro-influencers-lifestyle', 'top-lifestyle-influencers', 'instagram-lifestyle-creators'],
  },
  'mid-tier-wellness-creators': {
    type: 'tier',
    tier: 'mid-tier',
    searchKeyword: 'wellness',
    category: 'Wellness',
    title: 'Mid-Tier Wellness Creators for Brand Partnerships (100K–250K)',
    description: 'Discover wellness creators in the 100K–250K range with established, health-focused audiences. The ideal tier for brands wanting authentic wellness content with meaningful reach.',
    label: 'Wellness Mid-Tier',
    emoji: '🧘',
    related: ['micro-influencers-wellness', 'top-wellness-influencers', 'instagram-wellness-creators'],
  },

  // ── Top (250K–500K) ────────────────────────────────────────
  'top-beauty-influencers': {
    type: 'tier',
    tier: 'top',
    searchKeyword: 'beauty',
    category: 'Beauty',
    title: 'Top Beauty Influencers for Brand Partnerships (250K–500K)',
    description: 'Find established beauty influencers with 250K–500K followers. These creators deliver maximum brand visibility while maintaining the authenticity that makes influencer marketing outperform traditional advertising.',
    label: 'Beauty Top',
    emoji: '✨',
    related: ['mid-tier-beauty-creators', 'instagram-beauty-creators', 'tiktok-beauty-creators'],
  },
  'top-fashion-influencers': {
    type: 'tier',
    tier: 'top',
    searchKeyword: 'fashion',
    category: 'Fashion',
    title: 'Top Fashion Influencers for Brand Partnerships (250K–500K)',
    description: 'Discover established fashion influencers with 250K–500K followers. Top fashion creators offer premium visibility and aspirational positioning for brands ready to make a statement.',
    label: 'Fashion Top',
    emoji: '👗',
    related: ['mid-tier-fashion-creators', 'instagram-fashion-creators', 'tiktok-fashion-creators'],
  },
  'top-fitness-influencers': {
    type: 'tier',
    tier: 'top',
    searchKeyword: 'fitness',
    category: 'Fitness',
    title: 'Top Fitness Influencers for Brand Partnerships (250K–500K)',
    description: 'Connect with established fitness influencers with 250K–500K followers. These creators have built loyal fitness communities with proven purchase intent — perfect for fitness brands with scale.',
    label: 'Fitness Top',
    emoji: '💪',
    related: ['mid-tier-fitness-creators', 'instagram-fitness-creators', 'tiktok-fitness-influencers'],
  },
  'top-lifestyle-influencers': {
    type: 'tier',
    tier: 'top',
    searchKeyword: 'lifestyle',
    category: 'Lifestyle',
    title: 'Top Lifestyle Influencers for Brand Partnerships (250K–500K)',
    description: 'Find established lifestyle influencers with 250K–500K followers. Top lifestyle creators combine massive reach with authentic storytelling — ideal for brands that want wide awareness and genuine brand love.',
    label: 'Lifestyle Top',
    emoji: '🌿',
    related: ['mid-tier-lifestyle-creators', 'instagram-lifestyle-creators', 'tiktok-lifestyle-creators'],
  },
  'top-wellness-influencers': {
    type: 'tier',
    tier: 'top',
    searchKeyword: 'wellness',
    category: 'Wellness',
    title: 'Top Wellness Influencers for Brand Partnerships (250K–500K)',
    description: 'Discover established wellness influencers with 250K–500K followers. These creators have built trusted health and wellness communities that respond strongly to authentic product recommendations.',
    label: 'Wellness Top',
    emoji: '🧘',
    related: ['mid-tier-wellness-creators', 'instagram-wellness-creators', 'tiktok-wellness-creators'],
  },
};

// ─────────────────────────────────────────────────────────────
// UNIFIED PAGE LOOKUP
// Used by [slug]/page.tsx to find any page type
// ─────────────────────────────────────────────────────────────

export type AnyPageConfig = DiscoverPageConfig | LocationPageConfig | TierPageConfig;

export function getPageConfig(slug: string): AnyPageConfig | null {
  return DISCOVER_PAGES[slug] || LOCATION_PAGES[slug] || TIER_PAGES[slug] || null;
}

export function getAllSlugs(): string[] {
  return [
    ...Object.keys(DISCOVER_PAGES),
    ...Object.keys(LOCATION_PAGES),
    ...Object.keys(TIER_PAGES),
  ];
}

// ─────────────────────────────────────────────────────────────
// HELPERS
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

export function toSafeCreator(raw: {
  display_name?: any;
  platform?: string | null;
  follower_count?: number | null;
  detected_city?: string | null;
  detected_country?: string | null;
  ai_summary?: string | null;
}): SafeCreator {
  const rawName =
    typeof raw.display_name === 'object' && raw.display_name !== null
      ? (raw.display_name as any).display_name
      : raw.display_name;
  const firstName = rawName?.trim().split(/\s+/)[0] || 'Creator';
  const platform = (raw.platform as Platform) || 'instagram';

  let cleanSummary = raw.ai_summary || '';
  cleanSummary = cleanSummary.replace(/^@\S+\s+(is\s+)?/i, '').trim();
  cleanSummary = cleanSummary.charAt(0).toUpperCase() + cleanSummary.slice(1);

  const teaser = cleanSummary
    ? cleanSummary.split(/(?<=[.!?])\s+/)[0].replace(/\.$/, '') + '.'
    : null;

  const location =
    [raw.detected_city, raw.detected_country].filter(Boolean).join(', ') || null;

  const categories: string[] = [];
  const summary = (raw.ai_summary || '').toLowerCase();
  const tagCandidates = [
    'Beauty', 'Fashion', 'Fitness', 'Lifestyle', 'Travel',
    'Food', 'Wellness', 'Skincare', 'Gaming', 'Tech',
    'Nutrition', 'Comedy', 'Parenting',
  ];
  for (const tag of tagCandidates) {
    if (summary.includes(tag.toLowerCase())) categories.push(tag);
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
// EDUCATIONAL CONTENT
// ─────────────────────────────────────────────────────────────

export function getEducationalContent(config: AnyPageConfig): { heading: string; paragraphs: string[] } {
  if (config.type === 'tier') {
    return getTierEducationalContent(config.tier, config.category);
  }
  if (config.type === 'location') {
    return getLocationEducationalContent(config.locationLabel);
  }
  return getNicheEducationalContent((config as DiscoverPageConfig).category);
}

function getTierEducationalContent(tier: TierKey, category: string): { heading: string; paragraphs: string[] } {
  const tierInfo = FOLLOWER_TIERS[tier];
  const categoryLower = category.toLowerCase();

  if (tier === 'micro') {
    return {
      heading: `Why ${category} Micro-Influencers (50K–100K) Outperform Larger Accounts`,
      paragraphs: [
        `${category} micro-influencers consistently deliver engagement rates 2–4× higher than accounts above 500K followers. Their audiences are tight-knit communities built around genuine shared interest in ${categoryLower} — not celebrity following.`,
        `For brands, this translates directly to better ROI. A micro-influencer with 80K ${categoryLower} followers and a 7% engagement rate will drive more product consideration than a 2M follower macro account with 1% engagement. The numbers consistently favor micro for conversion-focused campaigns.`,
        `${category} micro-influencers are also significantly more accessible. Partnership rates are typically 3–5× lower than mid-tier accounts, making it possible to work with 5–10 micro creators for the cost of a single macro partnership — diversifying your reach and testing multiple audiences simultaneously.`,
        `Best use cases for ${categoryLower} micro-influencers: new product launches needing authentic early adopters, niche targeting where specific ${categoryLower} sub-communities matter, and always-on campaigns that need consistent content volume at sustainable cost.`,
      ],
    };
  }

  if (tier === 'mid-tier') {
    return {
      heading: `Why Mid-Tier ${category} Creators (100K–250K) Are the Brand Partnership Sweet Spot`,
      paragraphs: [
        `Mid-tier ${categoryLower} creators sit in the ideal intersection of reach and authenticity. With 100K–250K followers, they've built substantial audiences while maintaining the personal connection that makes influencer marketing work — their followers still feel like they know them.`,
        `Engagement rates for mid-tier ${categoryLower} creators typically run 3–6%, significantly outperforming macro influencers while providing meaningfully more reach than micro accounts. This combination makes them the most efficient tier for brand awareness campaigns that also need to convert.`,
        `From a budget perspective, mid-tier creators offer predictable, professional partnership terms. They're experienced enough to produce consistently high-quality content but not yet priced at the premium of top-tier accounts. Most brands find the best CPM and cost-per-engagement in this tier.`,
        `Mid-tier ${categoryLower} creators work especially well for: seasonal campaigns needing real reach, product launches targeting established ${categoryLower} audiences, and long-term ambassador relationships where consistency and quality both matter.`,
      ],
    };
  }

  return {
    heading: `Working with Top ${category} Influencers (250K–500K): Maximum Reach, Real Engagement`,
    paragraphs: [
      `Top-tier ${categoryLower} influencers with 250K–500K followers offer something rare: genuine scale without the authenticity collapse that affects celebrity accounts above 1M. Their audiences are still highly engaged ${categoryLower} enthusiasts — just a lot of them.`,
      `At this follower range, expect engagement rates of 2–4% — lower than micro accounts but applied to a much larger base. A top-tier creator with 400K followers at 3% engagement produces 12,000 direct interactions per post. For awareness campaigns, this reach is unmatched in the mid-market.`,
      `Top-tier ${categoryLower} influencers are typically highly professional content producers. They have established content pipelines, professional photography and editing, and experience working with major brands — meaning less hand-holding and more consistently premium output.`,
      `Best use cases: major product launches needing broad category awareness, brand repositioning campaigns, hero content creation where production quality matters, and campaigns where a single high-visibility partnership is more valuable than distributed micro reach.`,
    ],
  };
}

function getLocationEducationalContent(locationLabel: string): { heading: string; paragraphs: string[] } {
  return {
    heading: `Why Work with Influencers Based in ${locationLabel}?`,
    paragraphs: [
      `Location matters in influencer marketing more than most brands realize. Creators based in ${locationLabel} have audiences that skew heavily toward that market — meaning your brand reaches consumers who can actually buy, visit, or engage with your product locally. Geographic alignment between creator and audience dramatically improves campaign relevance.`,
      `${locationLabel}-based creators also bring authentic local cultural context to brand partnerships. They understand local trends, seasonality, consumer behaviors, and platform preferences in ways that international creators simply can't replicate. This cultural fluency shows in the content and resonates with local audiences.`,
      `For brands targeting ${locationLabel} consumers specifically, local creators offer significantly better cost efficiency than running broad national or international campaigns. You're not paying to reach audiences in markets you don't serve — every impression is a relevant impression.`,
      `Practical considerations: when working with ${locationLabel}-based creators, factor in local content regulations, platform usage patterns in the region, and language preferences. InfluenceIT's database includes verified location data, language detection, and AI summaries that flag these factors for every creator — ensuring you partner with creators genuinely based in the markets you care about.`,
    ],
  };
}

function getNicheEducationalContent(category: string): { heading: string; paragraphs: string[] } {
  const content: Record<string, { heading: string; paragraphs: string[] }> = {
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
        "Fashion mid-tier influencers bridge the gap between high-fashion aspirational content and everyday style. With 50K–500K followers, they're accessible enough that audiences see them as peers, not celebrities — and purchase recommendations land much harder.",
        'Fashion content on Instagram sees average engagement of 2.5–5%, with Reels and carousel posts driving the highest interaction. On TikTok, "Get The Look" and styling challenge formats regularly go viral.',
        'The most effective fashion brand campaigns include "styling challenge" briefs, seasonal "closet refresh" integrations, and event-based content. Avoid briefs that require creators to abandon their signature aesthetic.',
        'Gifting campaigns work well for accessories and lower-price-point items, but for luxury fashion or significant product launches, paid partnerships drive better results. Budget 6–10 weeks for production timelines.',
      ],
    },
    Fitness: {
      heading: 'Working with Fitness Influencers: What Brands Need to Know',
      paragraphs: [
        'Fitness mid-tier creators have among the highest purchase intent audiences of any niche. Their followers are actively investing in their health — supplements, equipment, activewear, and apps all convert extremely well.',
        'Expect engagement rates of 4–9% for fitness content on Instagram and 6–15% on TikTok. Workout tutorial formats, transformation stories, and "what I eat in a day" content see the highest saves.',
        'Campaign formats that work best: product integration into real workout content, 30-day challenge campaigns, and "athlete-style" storytelling that positions the creator as someone who genuinely uses your product.',
        'Seasonal peaks are January, spring, and September. Booking creators 8–12 weeks in advance is essential during these windows.',
      ],
    },
    Lifestyle: {
      heading: 'Working with Lifestyle Influencers: What Brands Need to Know',
      paragraphs: [
        "Lifestyle creators are the most versatile category for brand partnerships. Their content naturally spans home, wellness, fashion, food, and travel — making them ideal for brands that don't fit neatly into a single niche.",
        'Lifestyle engagement rates sit at 3–6% on Instagram and 5–10% on TikTok. Long-form "Day in My Life" content and home setup posts drive unusually high saves.',
        "The most effective brand integrations feel like natural additions to the creator's life. Products in 'morning routine' or 'weekend activities' content have 2–3× better recall than standalone review posts.",
        "Lifestyle creators typically work with multiple brands — vet for conflicts before signing.",
      ],
    },
    Wellness: {
      heading: 'Working with Wellness Influencers: What Brands Need to Know',
      paragraphs: [
        'Wellness is one of the fastest-growing creator categories. Mid-tier wellness creators carry significant trust — often more than health publications — because followers see them as accessible guides.',
        'Wellness content engagement sits at 4–8% on Instagram and 6–14% on TikTok. "Morning routine" and "what I take every day" formats drive the highest product consideration.',
        'Supplement, app, and service brands dominate this category, but physical wellness products also perform well when integrated into authentic daily routine content.',
        'Wellness audiences are skeptical of overtly commercial content. Long-term partnerships outperform one-off campaigns significantly.',
      ],
    },
  };

  return content[category] || {
    heading: `Working with ${category} Influencers: What Brands Need to Know`,
    paragraphs: [
      `Mid-tier ${category.toLowerCase()} creators (50K–500K followers) consistently deliver stronger ROI than macro influencers. Their audiences are genuinely passionate about the niche, leading to engagement rates 2–4× higher than accounts above 1 million followers.`,
      `Authentic integration beats scripted endorsement in every creator category. Provide creative freedom within a clear brief and allow the creator to speak in their own voice.`,
      `Structure ${category.toLowerCase()} campaigns around multi-post integrations rather than one-off posts. Audiences trust creators who use products over time.`,
      'Brief creators 4–6 weeks ahead of the desired posting date to allow for product delivery, genuine use, and content production.',
    ],
  };
}
