// Google Flights result extractor
// Injected into Google Flights tabs created by the background script.
// Waits for results to load, parses flight cards, sends data back.

(function() {
  'use strict';

  const MAX_WAIT = 20000; // 20s max wait for results
  const CHECK_INTERVAL = 500;
  let elapsed = 0;

  function extractFlightResults() {
    const results = [];

    // Google Flights uses list items for flight results.
    // Each result is typically in a list item with price, airline, times, etc.
    // The DOM structure changes, so we use multiple selector strategies.

    // Strategy 1: Look for flight result items by common patterns
    const listItems = document.querySelectorAll('li[data-ved], ul li');

    for (const item of listItems) {
      const text = item.textContent || '';

      // Must contain a price pattern ($XXX or from $XXX)
      const priceMatch = text.match(/\$(\d{1,3}(?:,\d{3})*)/);
      if (!priceMatch) continue;

      // Must contain time patterns (HH:MM AM/PM)
      const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/g);
      if (!timeMatches || timeMatches.length < 2) continue;

      const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
      const departTime = timeMatches[0];
      const arriveTime = timeMatches[1];

      // Extract airline name - usually in a span or div near the top
      let airline = 'Unknown Airline';
      const airlineEl = item.querySelector('[data-airline], img[alt]');
      if (airlineEl) {
        airline = airlineEl.getAttribute('alt') || airlineEl.textContent || airline;
      } else {
        // Try to find airline name from known patterns
        const knownAirlines = [
          'United', 'American', 'Delta', 'Southwest', 'JetBlue', 'Alaska',
          'Spirit', 'Frontier', 'Hawaiian', 'Allegiant', 'Sun Country',
          'British Airways', 'Air Canada', 'Lufthansa', 'Air France', 'KLM',
          'Emirates', 'Qatar', 'Turkish', 'Cathay Pacific', 'Singapore Airlines',
          'Japan Airlines', 'ANA', 'Korean Air', 'Qantas', 'Virgin Atlantic'
        ];
        for (const a of knownAirlines) {
          if (text.includes(a)) { airline = a; break; }
        }
      }

      // Extract duration (e.g., "4 hr 30 min" or "4h 30m")
      let duration = '';
      const durMatch = text.match(/(\d+)\s*(?:hr?|hour)s?\s*(?:(\d+)\s*(?:min|m))?/i);
      if (durMatch) {
        duration = durMatch[2]
          ? `${durMatch[1]}h ${durMatch[2]}m`
          : `${durMatch[1]}h`;
      }

      // Extract stops
      let stops = 'Unknown';
      if (/\bnonstop\b/i.test(text) || /\bdirect\b/i.test(text)) {
        stops = 'Nonstop';
      } else {
        const stopMatch = text.match(/(\d+)\s*stop/i);
        if (stopMatch) {
          stops = `${stopMatch[1]} stop${parseInt(stopMatch[1]) > 1 ? 's' : ''}`;
        }
      }

      // Try to find a booking link
      let bookingUrl = '';
      const links = item.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href') || '';
        if (href.includes('flights') || href.includes('book') || href.startsWith('http')) {
          bookingUrl = href.startsWith('http') ? href : `https://www.google.com${href}`;
          break;
        }
      }

      // Deduplicate by price + departure time
      const key = `${price}-${departTime}-${airline}`;
      if (results.find(r => `${r.price_cents / 100}-${r.depart_time}-${r.airline}` === key)) {
        continue;
      }

      results.push({
        airline,
        depart_time: departTime,
        arrive_time: arriveTime,
        duration,
        stops,
        price_cents: price * 100,
        booking_url: bookingUrl,
        raw_text: text.substring(0, 300),
      });
    }

    // Strategy 2: If Strategy 1 found nothing, try broader price-based extraction
    if (results.length === 0) {
      // Look for any elements containing price + flight-like content
      const allElements = document.querySelectorAll('[role="listitem"], [class*="result"], [class*="flight"]');
      for (const el of allElements) {
        const text = el.textContent || '';
        const priceMatch = text.match(/\$(\d{1,3}(?:,\d{3})*)/);
        const timeMatches = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)/g);

        if (priceMatch && timeMatches && timeMatches.length >= 2) {
          results.push({
            airline: extractAirlineFromText(text),
            depart_time: timeMatches[0],
            arrive_time: timeMatches[1],
            duration: extractDurationFromText(text),
            stops: extractStopsFromText(text),
            price_cents: parseInt(priceMatch[1].replace(/,/g, ''), 10) * 100,
            booking_url: '',
            raw_text: text.substring(0, 300),
          });
        }
      }
    }

    return results;
  }

  function extractAirlineFromText(text) {
    const airlines = [
      'United', 'American', 'Delta', 'Southwest', 'JetBlue', 'Alaska',
      'Spirit', 'Frontier', 'Hawaiian', 'Allegiant', 'Sun Country',
      'British Airways', 'Air Canada', 'Lufthansa', 'Air France', 'KLM',
      'Emirates', 'Qatar Airways', 'Turkish Airlines', 'Cathay Pacific',
      'Singapore Airlines', 'Japan Airlines', 'ANA', 'Korean Air', 'Qantas'
    ];
    for (const a of airlines) {
      if (text.includes(a)) return a;
    }
    return 'Unknown Airline';
  }

  function extractDurationFromText(text) {
    const m = text.match(/(\d+)\s*(?:hr?|hour)s?\s*(?:(\d+)\s*(?:min|m))?/i);
    if (m) return m[2] ? `${m[1]}h ${m[2]}m` : `${m[1]}h`;
    return '';
  }

  function extractStopsFromText(text) {
    if (/\bnonstop\b/i.test(text) || /\bdirect\b/i.test(text)) return 'Nonstop';
    const m = text.match(/(\d+)\s*stop/i);
    if (m) return `${m[1]} stop${parseInt(m[1]) > 1 ? 's' : ''}`;
    return '';
  }

  function waitAndExtract() {
    const results = extractFlightResults();

    if (results.length > 0) {
      // Sort by price
      results.sort((a, b) => a.price_cents - b.price_cents);

      // Take top 5
      const top = results.slice(0, 5);

      // Send back to background
      chrome.runtime.sendMessage({
        type: 'flightSearchResults',
        results: top,
        total_found: results.length,
        url: window.location.href,
      });
      return;
    }

    elapsed += CHECK_INTERVAL;
    if (elapsed >= MAX_WAIT) {
      // Timed out, send empty results
      chrome.runtime.sendMessage({
        type: 'flightSearchResults',
        results: [],
        total_found: 0,
        url: window.location.href,
        error: 'No results found within timeout',
      });
      return;
    }

    // Keep waiting for results to load
    setTimeout(waitAndExtract, CHECK_INTERVAL);
  }

  // Start extraction after a brief delay for page to render
  setTimeout(waitAndExtract, 2000);
})();
