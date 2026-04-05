import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { Analytics } from '@/components/Analytics'
import { Suspense } from 'react'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'Tiker - Your AI-Powered Life Operator',
    template: '%s | Tiker',
  },
  description: 'AI agents that handle your tasks, calendar, and daily operations. Tiker works while you sleep.',
  openGraph: {
    title: 'Tiker - Your AI-Powered Life Operator',
    description: 'AI agents that handle your tasks, calendar, and daily operations. Tiker works while you sleep.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        {/* Analytics must be wrapped in Suspense because it uses useSearchParams */}
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
        <NavBar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
