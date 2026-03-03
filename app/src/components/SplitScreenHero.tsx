'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export function SplitScreenHero() {
  const [showAfter, setShowAfter] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24 w-full">
        {/* Top: Bold Statement */}
        <div className={`max-w-4xl mb-16 md:mb-24 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-semibold text-neutral-900 dark:text-neutral-100 leading-[0.95] tracking-tight mb-8">
            Stop babysitting
            <br />
            <span className="text-neutral-400 dark:text-neutral-600">your AI tools.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-neutral-500 dark:text-neutral-400 max-w-2xl leading-relaxed mb-10">
            Your AI agents should work together. Not wait for you to copy-paste between windows.
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <Link 
              href="/auth/login" 
              className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all active:scale-95"
            >
              Start your AI team
            </Link>
            <p className="text-sm text-neutral-400 dark:text-neutral-500">
              Free forever. No credit card.
            </p>
          </div>
        </div>

        {/* Bottom: Interactive Before/After */}
        <div className={`relative transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Toggle */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setShowAfter(false)}
              className={`text-sm font-medium transition-colors relative ${!showAfter ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600'}`}
              aria-pressed={!showAfter}
            >
              Without Tiker
              {!showAfter && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-neutral-900 dark:bg-neutral-100"></span>}
            </button>
            <button
              onClick={() => setShowAfter(true)}
              className={`text-sm font-medium transition-colors relative ${showAfter ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400 dark:text-neutral-500 hover:text-neutral-600'}`}
              aria-pressed={showAfter}
            >
              With Tiker
              {showAfter && <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-neutral-900 dark:bg-neutral-100"></span>}
            </button>
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800"></div>
          </div>

          {/* Image Container */}
          <div className="relative rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-[21/9] md:aspect-[21/8]">
            {/* Before Image */}
            <div 
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${showAfter ? 'opacity-0' : 'opacity-100'}`}
              aria-hidden={showAfter}
            >
              <img 
                src="/images/screenshots/chaos-before.jpg" 
                alt="Context chaos: Multiple windows and terminals"
                className="w-full h-full object-cover object-left"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"></div>
              <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8">
                <p className="text-white/60 text-sm mb-1">The chaos</p>
                <p className="text-white text-lg md:text-xl font-medium">3 VS Code windows. 5 terminals. Lost context.</p>
              </div>
            </div>

            {/* After Image */}
            <div 
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${showAfter ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={!showAfter}
            >
              <img 
                src="/images/screenshots/mc-hero.png" 
                alt="Mission Control: Organized task board"
                className="w-full h-full object-cover object-left"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8">
                <p className="text-white/60 text-sm mb-1">The solution</p>
                <p className="text-white text-lg md:text-xl font-medium">One dashboard. All agents. Complete visibility.</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-8 mt-8 max-w-2xl">
            <div>
              <p className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100">2</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Active agents</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100">39</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Tasks queued</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100">0</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Copy-paste needed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
