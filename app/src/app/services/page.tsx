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
        credentials: 'include',
        body: JSON.stringify({ service_type: serviceId, price_id: priceId }),
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        if (response.status === 401) {
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
      {/* Hero - Campaign optimized */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-neutral-950">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Professional AI Setup
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 dark:text-neutral-100 leading-tight mb-6">
            Stop spending weekends
            <br />
            <span className="text-blue-600 dark:text-blue-400">configuring AI tools.</span>
          </h1>

          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto mb-10">
            We set up your entire AI agent infrastructure in one session. Done right, done fast, done for you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a href="#plans" className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-lg">
              See Plans
            </a>
            <a href="#how-it-works" className="px-8 py-4 bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-lg font-semibold hover:border-neutral-400 dark:hover:border-neutral-600 transition text-lg">
              How It Works
            </a>
          </div>

          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Typical setup: under 1 hour. No recurring fees.
          </p>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">The problem</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-8">
            AI setup consultants charge $2,000+. DIY takes days. Neither is worth it.
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-3xl mb-3">&#9200;</div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">4-8 hours to DIY</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Node, Python, Supabase, Tailscale, OpenClaw, systemd services, SSL certs, DNS... it adds up fast.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">&#128176;</div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Consultants overcharge</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Most "AI setup" services charge $1,500-5,000 for what takes an expert about 45 minutes.
              </p>
            </div>
            <div>
              <div className="text-3xl mb-3">&#128293;</div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Mistakes are costly</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Open ports, missing auth, broken tunnels. One mistake means starting over or worse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-4">How it works</p>
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-12">
            Three steps. One hour. Done.
          </h2>

          <div className="space-y-12">
            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-lg flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">You book a session</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Pick a plan below. We'll reach out within 24 hours to schedule your setup window. You choose the time.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-lg flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">We configure everything</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  You install Tailscale (2 minutes). We SSH in and set up the full Tiker stack: OpenClaw gateway, AI agents, secure tunneling, and test everything end-to-end.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-lg flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">You start building</h3>
                <p className="text-neutral-600 dark:text-neutral-400">
                  Your AI team is live. Create tasks, assign agents, and let them work while you focus on strategy. We stick around to make sure everything runs smooth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-4">
              Pick your setup
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              One-time payment. No subscriptions. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Remote Setup */}
            <div id="remote-setup" className="rounded-2xl border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-neutral-900 p-8 relative">
              <div className="absolute -top-3 left-6">
                <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Remote Setup</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">We configure Tiker on your hardware</p>
              </div>

              <div className="text-center mb-8">
                <span className="text-5xl font-bold text-neutral-900 dark:text-neutral-100">$99</span>
                <span className="text-neutral-500 dark:text-neutral-400 ml-2">one-time</span>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Your VPS, Pi, or old laptop',
                  '1-hour remote session',
                  'Full Tiker stack configured',
                  'Tailscale tunnel setup',
                  'OpenClaw gateway running',
                  'Test bot verified and ready',
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
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-lg"
              >
                {loading === 'remote-setup' ? 'Redirecting...' : 'Book Remote Setup'}
              </button>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
                Scheduled within 24 hours of booking
              </p>
            </div>

            {/* Pi Kit */}
            <div id="pi-kit" className="rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-1">Pi 5 Kit Shipped</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">Hardware + setup, delivered to your door</p>
              </div>

              <div className="text-center mb-8">
                <span className="text-5xl font-bold text-neutral-900 dark:text-neutral-100">$299</span>
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
                className="w-full py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 transition text-lg"
              >
                {loading === 'raspberry-pi-kit' ? 'Redirecting...' : 'Order Pi Kit'}
              </button>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-4">
                Ships within 7 days
              </p>
            </div>
          </div>

          {/* Additional options */}
          <div className="mt-10 grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div id="mac-mini" className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">Mac Mini M4</h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Maximum power, pre-configured</p>
              </div>
              <button
                onClick={() => handleCheckout('mac-mini-m4', 'price_1SwYhiGTBC9prCAPVhdIt4HX')}
                disabled={loading === 'mac-mini-m4'}
                className="px-5 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition text-sm whitespace-nowrap"
              >
                {loading === 'mac-mini-m4' ? '...' : '$999'}
              </button>
            </div>

            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">SD Card Only</h4>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Already have a Pi? Just need the image</p>
              </div>
              <button
                onClick={() => handleCheckout('sd-card', 'price_1SwYhjGTBC9prCAPPuV5jtoW')}
                disabled={loading === 'sd-card'}
                className="px-5 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-lg font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 transition text-sm whitespace-nowrap"
              >
                {loading === 'sd-card' ? '...' : '$49'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Us vs. Alternatives */}
      <section className="py-20 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 leading-tight mb-10 text-center">
            How we compare
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-neutral-200 dark:border-neutral-700">
                  <th className="text-left p-4 font-semibold text-neutral-900 dark:text-neutral-100"></th>
                  <th className="text-center p-4 font-semibold text-neutral-500 dark:text-neutral-400">DIY</th>
                  <th className="text-center p-4 font-semibold text-neutral-500 dark:text-neutral-400">Consultants</th>
                  <th className="text-center p-4 font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded-t-lg">Tiker Setup</th>
                </tr>
              </thead>
              <tbody className="text-neutral-600 dark:text-neutral-400">
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="p-4 font-medium text-neutral-900 dark:text-neutral-100">Cost</td>
                  <td className="text-center p-4">$0 + your time</td>
                  <td className="text-center p-4">$2,000-5,000</td>
                  <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 font-semibold text-blue-700 dark:text-blue-300">$99</td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="p-4 font-medium text-neutral-900 dark:text-neutral-100">Time to live</td>
                  <td className="text-center p-4">4-8 hours</td>
                  <td className="text-center p-4">1-2 weeks</td>
                  <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 font-semibold text-blue-700 dark:text-blue-300">&lt; 1 hour</td>
                </tr>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="p-4 font-medium text-neutral-900 dark:text-neutral-100">Security hardened</td>
                  <td className="text-center p-4">Maybe</td>
                  <td className="text-center p-4">Varies</td>
                  <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 font-semibold text-green-600 dark:text-green-400">Always</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-neutral-900 dark:text-neutral-100">Support after</td>
                  <td className="text-center p-4">Stack Overflow</td>
                  <td className="text-center p-4">Extra $$$</td>
                  <td className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-b-lg font-semibold text-blue-700 dark:text-blue-300">Included</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Custom Work */}
      <section id="custom" className="py-20 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
              Need something custom?
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">
              Enterprise deployments, complex integrations, or unique requirements. Let's talk.
            </p>
          </div>

          {contactSent ? (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">Message sent!</h3>
              <p className="text-neutral-600 dark:text-neutral-400">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleContact} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
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
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading === 'contact' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-neutral-50 dark:bg-neutral-900">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8 text-center">
            Questions
          </h2>

          <div className="space-y-4">
            {[
              {
                q: 'What hardware do I need for Remote Setup?',
                a: 'Any computer that can run 24/7: a VPS ($5/mo from DigitalOcean), Raspberry Pi 4 or 5, old laptop, or home server. 2GB RAM minimum, 4GB+ recommended.'
              },
              {
                q: 'How does the remote session work?',
                a: 'You set up Tailscale on your machine (takes 2 minutes). Then we SSH in and configure everything. You can watch if you want to learn, or just check back when it\'s done.'
              },
              {
                q: 'What\'s included in the Pi Kit?',
                a: 'Raspberry Pi 5 (8GB), official power supply, case with cooling, 128GB SD card with Tiker pre-installed, ethernet cable. Plug it into power and your router.'
              },
              {
                q: 'Do I need a Tiker subscription too?',
                a: 'These services are for self-hosted setup. You bring your own API keys and run Tiker for free on your own hardware. No subscription required.'
              },
              {
                q: 'What if something breaks after setup?',
                a: 'Remote Setup includes 1 week of support. Pi Kit includes 2 weeks. After that, you have our Discord community and docs. We also offer ongoing support plans if needed.'
              },
            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5">
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">{faq.q}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Your AI team, running by tonight.
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            $99 for a complete setup. Most consultants charge 20x that.
          </p>
          <a
            href="#plans"
            className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-lg"
          >
            Get Started
          </a>
        </div>
      </section>
    </main>
  )
}
