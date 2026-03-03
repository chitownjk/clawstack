'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard')
  }, [router])
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-neutral-100 mb-4"></div>
        <p className="text-neutral-600 dark:text-neutral-400">Redirecting to dashboard...</p>
      </div>
    </div>
  )
}
