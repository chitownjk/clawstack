'use client'

import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'

export function NavBar() {
  const [user, setUser] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const servicesRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        const { data: accountData } = await supabase
          .from('accounts')
          .select('execution_mode, plan_tier')
          .eq('auth_uid', user.id)
          .single()
        setAccount(accountData)
      }
      
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) {
        setAccount(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  // Scroll detection for enhanced nav background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close services dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (servicesRef.current && !servicesRef.current.contains(event.target as Node)) {
        setServicesOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 shadow-sm' 
        : 'bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800'
    }`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <img 
                src="/images/tiker-logo-light.svg" 
                alt="Tiker" 
                className="h-8 dark:hidden"
              />
              <img 
                src="/images/tiker-logo-dark.svg" 
                alt="Tiker" 
                className="h-8 hidden dark:block"
              />
            </Link>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              {user ? (
                /* Logged IN nav - Work focused */
                <>
                  <Link 
                    href="/command" 
                    className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    Command
                  </Link>
                  {/* Agents link - different for cloud vs self-hosted */}
                  {account?.execution_mode === 'openclaw' ? (
                    <Link href="/hub" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                      Hub
                    </Link>
                  ) : account ? (
                    <Link href="/agents" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                      Agents
                    </Link>
                  ) : null}
                  <div ref={servicesRef} className="relative">
                    <button
                      onClick={() => setServicesOpen(!servicesOpen)}
                      onMouseEnter={() => setServicesOpen(true)}
                      className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors flex items-center gap-1 font-semibold"
                    >
                      Services
                      <svg 
                        className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Services Dropdown */}
                    {servicesOpen && (
                      <div 
                        className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-4 z-50"
                        onMouseLeave={() => setServicesOpen(false)}
                      >
                        <div className="px-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
                          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Setup Services</p>
                        </div>
                        <div className="px-2">
                          <Link 
                            href="/services" 
                            className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-neutral-100">Browse All Services</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">Get Tiker running in a day</p>
                            </div>
                          </Link>
                          
                          <div className="my-2 px-3">
                            <div className="h-px bg-neutral-100 dark:bg-neutral-800"></div>
                          </div>
                          
                          <Link 
                            href="/services#remote-setup" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Remote Install ($99)
                          </Link>
                          <Link 
                            href="/services#pi-kit" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Pi 5 Kit ($299)
                          </Link>
                          <Link 
                            href="/services#mac-mini" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                            Mac Mini M4 ($999)
                          </Link>
                          <Link 
                            href="/services#custom" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Custom Builds
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Logged OUT nav - Simplified with Services prominent */
                <>
                  <div ref={servicesRef} className="relative">
                    <button
                      onClick={() => setServicesOpen(!servicesOpen)}
                      onMouseEnter={() => setServicesOpen(true)}
                      className="text-neutral-900 dark:text-neutral-100 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors flex items-center gap-1 font-semibold relative group"
                    >
                      Services
                      <svg 
                        className={`w-4 h-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="absolute -bottom-5 left-0 w-full h-0.5 bg-neutral-900 dark:bg-neutral-100"></span>
                    </button>
                    
                    {/* Services Dropdown */}
                    {servicesOpen && (
                      <div 
                        className="absolute top-full left-0 mt-4 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-4 z-50"
                        onMouseLeave={() => setServicesOpen(false)}
                      >
                        <div className="px-4 pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-3">
                          <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Setup Services</p>
                        </div>
                        <div className="px-2">
                          <Link 
                            href="/services" 
                            className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-neutral-100">Browse All Services</p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">Get Tiker running in a day</p>
                            </div>
                          </Link>
                          
                          <div className="my-2 px-3">
                            <div className="h-px bg-neutral-100 dark:bg-neutral-800"></div>
                          </div>
                          
                          <Link 
                            href="/services#remote-setup" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Remote Install ($99)
                          </Link>
                          <Link 
                            href="/services#pi-kit" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            Pi 5 Kit ($299)
                          </Link>
                          <Link 
                            href="/services#mac-mini" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                            Mac Mini M4 ($999)
                          </Link>
                          <Link 
                            href="/services#custom" 
                            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                            Custom Builds
                          </Link>
                        </div>
                        
                        <div className="mt-3 mx-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                          <Link 
                            href="/services"
                            className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                            onClick={() => setServicesOpen(false)}
                          >
                            View All Options
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Link href="/use-cases" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors relative group">
                    Use Cases
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-neutral-900 dark:bg-neutral-100 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                  <Link href="/#pricing" className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors relative group">
                    Pricing
                    <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-neutral-900 dark:bg-neutral-100 transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* GitHub link */}
            <a
              href="https://github.com/chitownjk/tiker"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="GitHub"
              title="View on GitHub"
            >
              <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
            
            {/* Discord link */}
            <a
              href="https://discord.gg/EVQ43psANY"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Discord"
              title="Join our Discord community"
            >
              <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
              </svg>
            </a>
            
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {loading ? (
              <div className="w-16 h-8 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <Link href="/settings" className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors" title="Settings">
                  <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
                {user.user_metadata?.avatar_url && (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt="Profile" 
                    className="w-7 h-7 rounded-full"
                  />
                )}
                <button
                  onClick={handleSignOut}
                  className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors ml-1"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link 
                href="/auth/login" 
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all active:scale-95"
              >
                Start your AI team
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
