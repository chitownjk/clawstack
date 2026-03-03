'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ServicesPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [contactSent, setContactSent] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })

  const handleCheckout = async (serviceId: string, priceId: string) => {
    setLoading(serviceId)
    try {
      const response = await fetch('/api/services/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Ensure cookies are sent
        body: JSON.stringify({ service_type: serviceId, price_id: priceId }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        if (response.status === 401) {
          // Not logged in - redirect to login then back here
          window.location.href = '/auth/login?redirect=/services'
        } else {
          alert(`Checkout error: ${data.error}`)
        }
        setLoading(null)
      } else {
        console.error('Unexpected response:', data)
        setLoading(null)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to start checkout. Please try again.')
      setLoading(null)
    }
  }

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading('contact')
    try {
      await fetch('/api/services/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, service_type: 'custom' }),
      })
      setContactSent(true)
    } catch (err) {
      console.error(err)
    }
    setLoading(null)
  }

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Get running in a day, not a week
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Setting up AI infrastructure shouldn't be your job. We'll configure everything so you can focus on building.
          </p>
        </div>
      </section>

      {/* Two Options */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Option 1: Remote Setup */}
            <div className="card p-8 border-2 border-blue-200 dark:border-blue-800 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              
              <div className="text-center mb-6">
                <span className="text-4xl mb-4 block">🔧</span>
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Remote Setup
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  We configure Tiker on your hardware
                </p>
              </div>
              
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">$99</span>
                <span className="text-neutral-500 dark:text-neutral-400 ml-2">one-time</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  'Your VPS, Pi, or old laptop',
                  '1-hour remote session',
                  'Full Tiker stack configured',
                  'Tailscale tunnel setup',
                  'OpenClaw gateway running',
                  'Test bot ready to go',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleCheckout('remote-setup', 'price_1SwYhjGTBC9prCAPiMJDXtTF')}
                disabled={loading === 'remote-setup'}
                className="w-full btn btn-primary py-3"
              >
                {loading === 'remote-setup' ? 'Redirecting...' : 'Book Setup'}
              </button>
              
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
                Done within 24 hours of booking
              </p>
            </div>
            
            {/* Option 2: Full Kit */}
            <div className="card p-8">
              <div className="text-center mb-6">
                <span className="text-4xl mb-4 block">🍓</span>
                <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                  Pi 5 Kit Shipped
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Hardware + setup, delivered to your door
                </p>
              </div>
              
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">$299</span>
                <span className="text-neutral-500 dark:text-neutral-400 ml-2">shipped</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  'Raspberry Pi 5 (8GB)',
                  '128GB SD pre-configured',
                  'Power supply + case',
                  'Tiker fully installed',
                  '2 weeks setup support',
                  'Plug in and go',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleCheckout('raspberry-pi-kit', 'price_1SwYhiGTBC9prCAPWLEsdwAa')}
                disabled={loading === 'raspberry-pi-kit'}
                className="w-full btn btn-secondary py-3"
              >
                {loading === 'raspberry-pi-kit' ? 'Redirecting...' : 'Order Kit'}
              </button>
              
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
                Ships within 7 days
              </p>
            </div>
          </div>
          
          {/* Additional Options */}
          <div className="mt-8 space-y-4 text-center">
            <p className="text-neutral-600 dark:text-neutral-400">
              Want more power?{' '}
              <button
                onClick={() => handleCheckout('mac-mini-m4', 'price_1SwYhiGTBC9prCAPVhdIt4HX')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Mac Mini M4 for $999
              </button>
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              Already have a Raspberry Pi?{' '}
              <button
                onClick={() => handleCheckout('sd-card', 'price_1SwYhjGTBC9prCAPPuV5jtoW')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Just get the SD card ($49)
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Why not DIY */}
      <section className="py-16 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8 text-center">
            Why not do it yourself?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⏱️</span>
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Save 4-8 hours</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Node, Python, Supabase, Tailscale, OpenClaw, systemd services... it adds up fast.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Done right</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Security hardened. Proper tunneling. No exposed ports. We've done this hundreds of times.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Focus on building</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Your time is better spent teaching your agents than debugging systemd.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Custom Work */}
      <section className="py-16 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Need something custom?
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Enterprise deployments, complex integrations, or unique requirements. Let's talk.
            </p>
          </div>
          
          {contactSent ? (
            <div className="card p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Message sent!</h3>
              <p className="text-neutral-600 dark:text-neutral-400">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="card p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <textarea
                required
                rows={4}
                placeholder="Tell us about your project..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
              <button
                type="submit"
                disabled={loading === 'contact'}
                className="w-full btn btn-primary py-3"
              >
                {loading === 'contact' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8 text-center">
            Quick answers
          </h2>
          
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                What hardware do I need for Remote Setup?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Any computer that can run 24/7: a VPS ($5/mo from DigitalOcean), Raspberry Pi 4 or 5, old laptop, or home server. 2GB RAM minimum, 4GB+ recommended.
              </p>
            </div>
            
            <div className="card p-5">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                How does the remote session work?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                You set up Tailscale on your machine (takes 2 minutes). Then we SSH in and configure everything. You can watch if you want to learn, or just check back when it's done.
              </p>
            </div>
            
            <div className="card p-5">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                What's included in the Full Kit?
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Raspberry Pi 5 (8GB), official power supply, case with cooling, 64GB SD card with Tiker pre-installed, ethernet cable. Just plug it into power and your router.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
