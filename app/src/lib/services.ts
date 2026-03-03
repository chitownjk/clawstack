// Service definitions for Tiker additional offerings
// Updated 2026-02-03 with real Stripe price IDs

export type PricingType = 'one_time' | 'recurring' | 'contact'

export interface PriceVariant {
  id: string
  label: string
  amount: number // in cents
  stripePriceId: string
  default?: boolean
}

export interface ServiceOffering {
  id: string
  name: string
  description: string
  shortDesc: string
  features: string[]
  pricing: {
    type: PricingType
    amount: number // in cents (primary price)
    interval?: 'month' | 'year'
  }
  variants?: PriceVariant[] // for products with size options
  ctaText: string
  ctaType: 'purchase' | 'contact'
  icon: string
  category: 'hardware' | 'service' | 'consulting'
  popular?: boolean
  shipsIn?: string // e.g., "7 days"
  stripePriceId?: string
  relatedLink?: {
    text: string
    anchor: string // e.g., "#sd-card"
  }
}

// =============================================================================
// HARDWARE PACKAGES
// =============================================================================

export const MAC_MINI_M4: ServiceOffering = {
  id: 'mac-mini-m4',
  name: 'Mac Mini M4 Complete',
  description: 'The premium option. Mac Mini M4 base unit with full setup, Command configured, and 1 month of priority support included. Ready to run your agent fleet.',
  shortDesc: 'Premium turnkey agent server',
  features: [
    'Mac Mini M4 base unit',
    'Full Tiker stack pre-installed',
    'Command configured',
    '1 month priority support',
    'Remote management enabled',
  ],
  pricing: {
    type: 'one_time',
    amount: 99900, // $999
  },
  ctaText: 'Buy Now',
  ctaType: 'purchase',
  icon: '🖥️',
  category: 'hardware',
  shipsIn: '7 days',
  stripePriceId: 'price_1SwYhiGTBC9prCAPVhdIt4HX',
}

export const RASPBERRY_PI_KIT: ServiceOffering = {
  id: 'raspberry-pi-kit',
  name: 'Raspberry Pi 5 Complete Kit',
  description: 'Everything you need to get started. Pi 5 8GB with case, power supply, and 128GB SD card pre-configured with Tiker. Includes 2 weeks of setup support.',
  shortDesc: 'Complete Pi 5 starter package',
  features: [
    'Raspberry Pi 5 (8GB RAM)',
    'Premium case + power supply',
    '128GB SD pre-configured',
    'Tiker stack ready to boot',
    '2 weeks setup support',
  ],
  pricing: {
    type: 'one_time',
    amount: 29900, // $299
  },
  ctaText: 'Buy Now',
  ctaType: 'purchase',
  icon: '🍓',
  category: 'hardware',
  shipsIn: '7 days',
  stripePriceId: 'price_1SwYhiGTBC9prCAPWLEsdwAa',
  relatedLink: {
    text: 'Already own a Pi 4/5? Get just the SD card →',
    anchor: '#sd-card',
  },
}

export const SD_CARD: ServiceOffering = {
  id: 'sd-card',
  name: 'Pre-configured SD Card',
  description: 'For existing Pi owners. High-endurance SD card with Tiker fully configured. Just swap, boot, and you\'re running. Choose your size.',
  shortDesc: 'Plug-and-play Tiker for existing Pi',
  features: [
    'High-endurance industrial grade',
    'Tiker stack pre-installed',
    'Command configured',
    'First-boot setup wizard',
    'Compatible with Pi 4 & 5',
  ],
  pricing: {
    type: 'one_time',
    amount: 4900, // $49 (default 128GB)
  },
  variants: [
    {
      id: '128gb',
      label: '128GB',
      amount: 4900,
      stripePriceId: 'price_1SwYhjGTBC9prCAPPuV5jtoW',
      default: true,
    },
    {
      id: '256gb',
      label: '256GB',
      amount: 7900,
      stripePriceId: 'price_1SwYhjGTBC9prCAPf7fJuItR',
    },
  ],
  ctaText: 'Buy Now',
  ctaType: 'purchase',
  icon: '💾',
  category: 'hardware',
  shipsIn: '7 days',
  stripePriceId: 'price_1SwYhjGTBC9prCAPPuV5jtoW', // default
}

// =============================================================================
// SETUP SERVICES
// =============================================================================

export const REMOTE_SETUP: ServiceOffering = {
  id: 'remote-setup',
  name: 'Remote Setup',
  description: 'Our bread and butter. 1-hour remote session where we configure Tiker on your existing VPS or home computer. You provide Tailscale or remote access, we do the rest.',
  shortDesc: '1-hour remote configuration session',
  features: [
    '1 hour dedicated session',
    'Full Tiker stack installation',
    'Your VPS or home computer',
    'Tailscale/remote access required',
    'Tunnel setup if needed',
  ],
  pricing: {
    type: 'one_time',
    amount: 9900, // $99
  },
  ctaText: 'Book Setup',
  ctaType: 'purchase',
  icon: '🔧',
  category: 'service',
  popular: true,
  stripePriceId: 'price_1SwYhjGTBC9prCAPiMJDXtTF',
}

export const VPS_PROVISIONING: ServiceOffering = {
  id: 'vps-provisioning',
  name: 'VPS Provisioning',
  description: 'We spin up a cloud instance for you, fully configured with Tiker. One-time setup fee. Hosting billed separately at $10/mo after first month.',
  shortDesc: 'Managed cloud agent hosting',
  features: [
    'Cloud instance provisioned',
    'Full Tiker configuration',
    'First month hosting included',
    'Then $10/mo hosting',
    'Monitoring & backups',
  ],
  pricing: {
    type: 'one_time',
    amount: 14900, // $149 setup (includes first month)
  },
  ctaText: 'Get Started',
  ctaType: 'purchase',
  icon: '☁️',
  category: 'service',
  stripePriceId: 'price_1SwYhkGTBC9prCAP31EGlovY',
}

// =============================================================================
// CONSULTING
// =============================================================================

export const CUSTOM_WORK: ServiceOffering = {
  id: 'custom-work',
  name: 'Custom Work',
  description: 'Complex integrations, enterprise deployments, custom builds. Tell us what you need and we\'ll scope it together. No commitment to inquire.',
  shortDesc: 'Enterprise & custom solutions',
  features: [
    'Complex integrations',
    'Enterprise deployments',
    'Custom agent development',
    'Architecture consulting',
    'Dedicated support',
  ],
  pricing: {
    type: 'contact',
    amount: 0,
  },
  ctaText: 'Contact Us',
  ctaType: 'contact',
  icon: '💼',
  category: 'consulting',
}

// =============================================================================
// EXPORTS
// =============================================================================

export const HARDWARE_PRODUCTS: ServiceOffering[] = [
  MAC_MINI_M4,
  RASPBERRY_PI_KIT,
  SD_CARD,
]

export const SETUP_SERVICES: ServiceOffering[] = [
  REMOTE_SETUP,
  VPS_PROVISIONING,
]

export const CONSULTING_SERVICES: ServiceOffering[] = [
  CUSTOM_WORK,
]

export const ALL_SERVICES: ServiceOffering[] = [
  ...HARDWARE_PRODUCTS,
  ...SETUP_SERVICES,
  ...CONSULTING_SERVICES,
]

// Legacy compatibility - maps to new structure
export const SERVICES: Record<string, ServiceOffering> = {
  'mac-mini-m4': MAC_MINI_M4,
  'raspberry-pi-kit': RASPBERRY_PI_KIT,
  'sd-card': SD_CARD,
  'remote-setup': REMOTE_SETUP,
  'vps-provisioning': VPS_PROVISIONING,
  'custom-work': CUSTOM_WORK,
}

export type ServiceType = keyof typeof SERVICES

export function getService(id: string): ServiceOffering | undefined {
  return SERVICES[id]
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export function getPriceDisplay(service: ServiceOffering): string {
  const { pricing } = service

  if (pricing.type === 'contact') {
    return 'Contact us'
  }

  const base = formatPrice(pricing.amount)

  if (pricing.type === 'recurring' && pricing.interval) {
    return `${base}/${pricing.interval === 'month' ? 'mo' : 'yr'}`
  }

  return base
}

export function getStripePriceId(service: ServiceOffering, variantId?: string): string | undefined {
  if (variantId && service.variants) {
    const variant = service.variants.find(v => v.id === variantId)
    return variant?.stripePriceId
  }
  return service.stripePriceId
}
