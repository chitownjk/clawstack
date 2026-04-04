import Stripe from 'stripe'

// Lazy-initialize Stripe client to avoid build-time errors
let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return stripeClient
}

// DEPRECATED: Use getStripe() instead - this export may be null at runtime
// Keeping for backwards compatibility but will be removed in future version
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  : null

// Pricing tiers - simplified to Free / Pro / Team
export const TIERS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    maxBots: 1,
    maxTasks: -1, // unlimited manual tasks
    canInviteGuests: false,
    trialDays: 0,
  },
  pro: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    maxTasks: 200,
    canInviteGuests: false,
    trialDays: 7,
  },
  team: {
    name: 'Team',
    price: 99,
    priceId: process.env.STRIPE_TEAM_PRICE_ID,
    maxTasks: 1000,
    canInviteGuests: true,
    maxGuests: 10,
    trialDays: 0,
  },

  // Legacy tier aliases - kept for backward compatibility with existing subscriptions
  solo: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    maxTasks: 200,
    canInviteGuests: false,
    trialDays: 7,
  },
  developer: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    maxTasks: 200,
    canInviteGuests: false,
    trialDays: 7,
  },
} as const

export type TierName = keyof typeof TIERS

// Helper to get tier limits
export function getTierLimits(tier: TierName) {
  return TIERS[tier] || TIERS.free
}

// Map Stripe plan metadata names to canonical DB plan_tier values.
// DB canonical names are used by SQL functions (is_over_limit, get_monthly_usage,
// the trigger that auto-updates the features column, etc.)
export const STRIPE_PLAN_TO_DB_TIER: Record<string, string> = {
  // Current Stripe product plan names
  solo: 'cloud',
  developer: 'cloud-developer',
  team: 'cloud-plus',
  team_plus: 'cloud-plus',
  // Pro/legacy aliases
  pro: 'cloud',
  // Pass-through for already-canonical names
  free: 'free',
  cloud: 'cloud',
  'cloud-developer': 'cloud-developer',
  'cloud-plus': 'cloud-plus',
}

// Return a human-readable plan name for any plan_tier value (handles both old
// DB canonical names and incoming Stripe plan names).
export function getTierDisplayName(planTier: string | null | undefined): string {
  switch (planTier) {
    case 'cloud-plus':
    case 'team':
    case 'team_plus':
      return 'Team'
    case 'cloud-developer':
    case 'developer':
      return 'Developer'
    case 'cloud':
    case 'solo':
    case 'pro':
      return 'Solo'
    case 'free':
      return 'Free'
    default:
      return 'Free'
  }
}
