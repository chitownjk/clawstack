import { getAuthenticatedAdmin } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// POST /api/extension/context
// Takes a page URL, title, and text snippet from the browser extension.
// Returns detected context type and suggested actions.
// Also supports CORS for extension requests.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Cookie',
  'Access-Control-Allow-Credentials': 'true',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

// Fast pattern matching before hitting AI (no credits used)
function quickClassify(url: string, title: string): {
  type: string
  label: string
  suggestedTask: string
  confidence: 'high' | 'medium'
} | null {
  const u = url.toLowerCase()
  const t = title.toLowerCase()

  // Travel & flights
  if (u.includes('united.com') || u.includes('delta.com') || u.includes('aa.com') ||
      u.includes('southwest.com') || u.includes('jetblue.com') || u.includes('spirit.com') ||
      u.includes('alaskaair.com') || u.includes('google.com/travel/flights') ||
      u.includes('kayak.com') || u.includes('expedia.com/flights') ||
      u.includes('skiplagged.com') || u.includes('booking.com/flights')) {
    const isBooking = t.includes('book') || t.includes('confirm') || t.includes('itinerary') || t.includes('receipt') || t.includes('trip')
    const isSearch = t.includes('search') || t.includes('results') || t.includes('flights') || t.includes('choose')
    return {
      type: 'travel',
      label: isBooking ? 'Flight Booking' : isSearch ? 'Flight Search' : 'Travel',
      suggestedTask: isBooking
        ? 'Track this flight booking and add to calendar'
        : 'Research and compare flight options',
      confidence: 'high',
    }
  }

  // Hotels
  if (u.includes('marriott.com') || u.includes('hilton.com') || u.includes('hyatt.com') ||
      u.includes('ihg.com') || u.includes('airbnb.com') || u.includes('vrbo.com') ||
      u.includes('booking.com') || u.includes('hotels.com') || u.includes('expedia.com/hotels')) {
    return {
      type: 'travel',
      label: 'Hotel',
      suggestedTask: 'Track this hotel reservation',
      confidence: 'high',
    }
  }

  // Shopping / packages
  if (u.includes('amazon.com') || u.includes('walmart.com') || u.includes('target.com') ||
      u.includes('bestbuy.com') || u.includes('costco.com') || u.includes('ebay.com') ||
      u.includes('etsy.com') || u.includes('wayfair.com')) {
    const isOrder = t.includes('order') || t.includes('cart') || t.includes('checkout') || t.includes('confirm')
    return {
      type: 'shopping',
      label: isOrder ? 'Order' : 'Shopping',
      suggestedTask: isOrder
        ? 'Track this order and delivery'
        : 'Add item to shopping list',
      confidence: isOrder ? 'high' : 'medium',
    }
  }

  // Bills / Finance
  if (u.includes('chase.com') || u.includes('bankofamerica.com') || u.includes('wellsfargo.com') ||
      u.includes('citi.com') || u.includes('capitalone.com') || u.includes('discover.com') ||
      u.includes('mint.com') || u.includes('venmo.com') || u.includes('paypal.com') ||
      u.includes('turbotax.com') || u.includes('fidelity.com') || u.includes('vanguard.com')) {
    return {
      type: 'finance',
      label: 'Finance',
      suggestedTask: 'Track this financial item',
      confidence: 'medium',
    }
  }

  // Healthcare
  if (u.includes('mychart.com') || u.includes('zocdoc.com') || u.includes('onemedical.com') ||
      u.includes('teladoc.com') || t.includes('appointment') || t.includes('patient portal')) {
    return {
      type: 'health',
      label: 'Healthcare',
      suggestedTask: 'Track this appointment or health item',
      confidence: 'medium',
    }
  }

  // Kids / School
  if (u.includes('classdojo.com') || u.includes('seesaw.me') || u.includes('schoology.com') ||
      u.includes('parentvue.com') || u.includes('brightwheel.com') || u.includes('remind.com')) {
    return {
      type: 'family',
      label: 'School',
      suggestedTask: 'Track this school item',
      confidence: 'high',
    }
  }

  // Restaurants / Food
  if (u.includes('doordash.com') || u.includes('ubereats.com') || u.includes('grubhub.com') ||
      u.includes('opentable.com') || u.includes('resy.com') || u.includes('yelp.com/reservations')) {
    return {
      type: 'food',
      label: 'Food & Dining',
      suggestedTask: 'Track this reservation or order',
      confidence: 'medium',
    }
  }

  // Calendar-ish
  if (u.includes('calendar.google.com') || u.includes('outlook.live.com/calendar') ||
      u.includes('eventbrite.com') || u.includes('meetup.com') || u.includes('lu.ma')) {
    return {
      type: 'event',
      label: 'Event',
      suggestedTask: 'Add this event to your calendar',
      confidence: 'medium',
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedAdmin()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
    }

    const body = await request.json()
    const { url, title, snippet } = body

    if (!url) {
      return NextResponse.json({ error: 'URL required' }, { status: 400, headers: CORS_HEADERS })
    }

    // Try fast pattern matching first
    const quickResult = quickClassify(url, title || '')
    if (quickResult) {
      return NextResponse.json({
        detected: true,
        ...quickResult,
        source: 'pattern',
      }, { headers: CORS_HEADERS })
    }

    // If we have a snippet, try AI classification (costs credits, so only when we have content)
    if (snippet && snippet.length > 20) {
      try {
        const anthropic = new Anthropic()
        const response = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: `You detect what a user is doing on a web page and suggest how a personal life manager AI can help. You are looking for actionable life tasks: travel, shopping, bills, appointments, events, school, family, home maintenance, etc. Output JSON only. If the page is not actionable (news, social media browsing, entertainment), return {"detected": false}.`,
          messages: [{
            role: 'user',
            content: `URL: ${url}\nTitle: ${title || 'Unknown'}\nPage content: ${snippet.slice(0, 500)}\n\nIf this page represents an actionable life task, return:\n{"detected": true, "type": "travel|shopping|finance|health|family|food|event|home|other", "label": "Short label", "suggestedTask": "What Tiker should do", "confidence": "high|medium|low"}\n\nIf not actionable, return: {"detected": false}`,
          }],
        })

        const aiText = response.content
          .filter(block => block.type === 'text')
          .map(block => (block as any).text)
          .join('')

        const cleaned = aiText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        const result = JSON.parse(cleaned)

        return NextResponse.json({
          ...result,
          source: 'ai',
        }, { headers: CORS_HEADERS })
      } catch {
        // AI failed, return no detection
      }
    }

    return NextResponse.json({
      detected: false,
      source: 'none',
    }, { headers: CORS_HEADERS })
  } catch (error) {
    console.error('[Extension Context] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: CORS_HEADERS })
  }
}
