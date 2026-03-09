import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
});

// Price ID mapping
export const PRICE_IDS = {
  brand: {
    starter: process.env.STRIPE_BRAND_STARTER_PRICE_ID!,
    growth: process.env.STRIPE_BRAND_GROWTH_PRICE_ID!,
    pro: process.env.STRIPE_BRAND_PRO_PRICE_ID!,
  },
  creator: {
    starter: process.env.STRIPE_CREATOR_STARTER_PRICE_ID!,
    active: process.env.STRIPE_CREATOR_ACTIVE_PRICE_ID!,
  },
} as const;

export const TOPUP_PRICE_IDS = {
  creator_100: process.env.STRIPE_CREATOR_TOPUP_100_PRICE_ID!,
  creator_250: process.env.STRIPE_CREATOR_TOPUP_250_PRICE_ID!,
} as const;

// Token amounts per tier (must match Stripe product metadata)
export const TIER_TOKENS = {
  brand: {
    starter: 400,
    growth: 1200,
    pro: 3000,
  },
  creator: {
    starter: 150,
    active: 500,
  },
} as const;

export const TOPUP_TOKENS = {
  creator_100: 100,
  creator_250: 250,
} as const;
