/**
 * Product Mode Detection
 * 
 * Determines whether the app is running in:
 * - OSS mode (self-hosted, tiker.com production)
 * - Cloud mode (testcloud.tiker.com)
 */

export type ProductMode = 'oss' | 'cloud';

export function getProductMode(): ProductMode {
  // Server-side: use env var
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_PRODUCT_MODE === 'cloud' ? 'cloud' : 'oss';
  }
  
  // Client-side: check env var or URL
  if (process.env.NEXT_PUBLIC_PRODUCT_MODE === 'cloud') {
    return 'cloud';
  }
  
  // Fallback: detect from hostname
  if (typeof window !== 'undefined' && window.location.hostname.includes('testcloud')) {
    return 'cloud';
  }
  
  return 'oss';
}

export function isCloudMode(): boolean {
  return getProductMode() === 'cloud';
}

export function isOSSMode(): boolean {
  return getProductMode() === 'oss';
}

/**
 * Get base URL for API calls
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * Feature flags based on product mode
 */
export const features = {
  gatewayConnection: isCloudMode(),
  cloudAgents: false, // Coming in Phase 3
  billing: isCloudMode(),
  hubContributions: true, // Available in both modes
} as const;
