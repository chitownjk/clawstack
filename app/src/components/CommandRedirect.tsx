'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Checks localStorage for redirect preference and redirects logged-in users to Command
 */
export default function CommandRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check if user wants to redirect to Command
    const shouldRedirect = localStorage.getItem('tiker_redirect_to_mc') === 'true'
    
    if (shouldRedirect) {
      router.push('/command')
    }
  }, [router])

  return null
}
