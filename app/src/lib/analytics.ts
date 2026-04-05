/**
 * GA4 analytics helpers — client-side gtag wrappers and server-side
 * Measurement Protocol for events that fire in API routes (e.g. subscription_started).
 *
 * Env vars:
 *   NEXT_PUBLIC_GA4_MEASUREMENT_ID  — e.g. "G-XXXXXXXXXX"
 *   GA4_API_SECRET                  — Measurement Protocol API secret (server only)
 */

// ─── Client-side helpers ──────────────────────────────────────────────────────

/** Fire a GA4 event from the browser via gtag(). No-ops if GA4 is not configured. */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID) return
  type GtagFn = (command: string, eventName: string, params?: Record<string, unknown>) => void
  ;(window as Window & { gtag?: GtagFn }).gtag?.('event', name, params ?? {})
}

// UTM parameter keys we care about
const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const

const UTM_STORAGE_KEY = 'tiker_utm'

/**
 * Read UTM params from the current URL and persist them in sessionStorage so
 * they survive page transitions (e.g. OAuth redirect). Call this on every page
 * load; it only writes when params are actually present.
 */
export function captureUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const search = new URLSearchParams(window.location.search)
  const found: Record<string, string> = {}

  for (const key of UTM_KEYS) {
    const value = search.get(key)
    if (value) found[key] = value
  }

  if (Object.keys(found).length > 0) {
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(found))
    } catch {
      // sessionStorage may be unavailable in some contexts — safe to ignore
    }
  }

  return found
}

/** Return previously captured UTM params (from sessionStorage). */
export function getStoredUTMParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

// ─── Server-side Measurement Protocol ────────────────────────────────────────

/**
 * Fire a GA4 event from a server-side API route via the Measurement Protocol.
 *
 * Requires:
 *   NEXT_PUBLIC_GA4_MEASUREMENT_ID  (e.g. "G-XXXXXXXXXX")
 *   GA4_API_SECRET                  (from GA4 console → Data Streams → Measurement Protocol API secrets)
 *
 * @param clientId  The GA4 client_id — read from the "_ga" cookie if available,
 *                  otherwise a synthetic fallback is used so the event still lands.
 * @param eventName Conversion event name (e.g. "subscription_started")
 * @param params    Additional event parameters
 */
export async function trackServerEvent(
  clientId: string | null | undefined,
  eventName: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID
  const apiSecret = process.env.GA4_API_SECRET

  if (!measurementId || !apiSecret) return

  // Fall back to a synthetic client_id when none is available (e.g. first
  // server-side event before the browser has loaded gtag.js)
  const cid = clientId || `server.${Date.now()}`

  const payload = {
    client_id: cid,
    events: [
      {
        name: eventName,
        params: {
          engagement_time_msec: 1,
          ...(params ?? {}),
        },
      },
    ],
  }

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
  } catch (err) {
    // Analytics failures must never break the primary flow
    console.error('[Analytics] Measurement Protocol error:', err)
  }
}
