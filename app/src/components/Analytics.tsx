'use client'

/**
 * Loads the GA4 gtag.js snippet and captures UTM parameters on every
 * client-side navigation. Drop this once inside RootLayout — it handles
 * all pages automatically.
 *
 * Requires NEXT_PUBLIC_GA4_MEASUREMENT_ID to be set; renders nothing if unset.
 */

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { captureUTMParams } from '@/lib/analytics'

const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID

export function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Capture UTM params on every navigation (survives OAuth redirects)
  useEffect(() => {
    captureUTMParams()
  }, [pathname, searchParams])

  if (!MEASUREMENT_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}', {
            send_page_view: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  )
}
