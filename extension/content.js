// Tiker Content Script - runs on every page
// Extracts structured context from the page and sends it to the background
// script for classification. Designed to be lightweight and non-intrusive.

(function () {
  'use strict';

  // Don't run on extension pages or chrome internals
  if (location.protocol === 'chrome-extension:' || location.protocol === 'chrome:') return;

  // Debounce: don't fire more than once per 3 seconds
  let lastSent = 0;
  const DEBOUNCE_MS = 3000;

  // ---- Structured extractors ----

  function extractPrices() {
    const prices = [];
    // Look for price patterns in visible text
    const walker = document.createTreeWalker(
      document.body, NodeFilter.SHOW_TEXT, null
    );
    const priceRegex = /\$[\d,]+(?:\.\d{2})?/g;
    let count = 0;
    while (walker.nextNode() && count < 500) {
      count++;
      const text = walker.currentNode.textContent;
      if (!text) continue;
      const matches = text.match(priceRegex);
      if (matches) {
        matches.forEach(m => {
          if (prices.length < 10) prices.push(m);
        });
      }
    }
    // Also check common price selectors
    const priceEls = document.querySelectorAll(
      '[class*="price"], [class*="cost"], [class*="amount"], [class*="total"], [data-price], [itemprop="price"]'
    );
    priceEls.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 50 && prices.length < 10) {
        const m = text.match(priceRegex);
        if (m) m.forEach(p => { if (!prices.includes(p)) prices.push(p); });
      }
    });
    return [...new Set(prices)].slice(0, 5);
  }

  function extractDates() {
    const dates = [];
    const dateEls = document.querySelectorAll(
      '[class*="date"], [class*="depart"], [class*="arrive"], [class*="check"], time, [datetime], input[type="date"]'
    );
    dateEls.forEach(el => {
      // Prefer structured attributes over text content
      const val = el.getAttribute('datetime') ||
                  el.getAttribute('value') ||
                  el.textContent?.trim();
      if (!val || val.length > 60) return;
      // Clean up: strip common label prefixes that get included in textContent
      let cleaned = val
        .replace(/^(Date|Dates|Depart|Arrive|Check.in|Check.out|Return|Departure|Arrival)\s*/i, '')
        .replace(/Change\s*date\s*/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (cleaned && cleaned.length > 2 && dates.length < 5 && !dates.includes(cleaned)) {
        dates.push(cleaned);
      }
    });
    return dates;
  }

  function cleanLocationText(text) {
    if (!text) return '';
    return text
      // Strip common label prefixes (From, To, Origin, Destination, etc.)
      .replace(/^(From|To|Origin|Destination|Depart|Arrive|Departing|Arriving|Pick.up|Drop.off|Location|Address)\s*:?\s*/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function extractLocations() {
    const locations = [];
    const locEls = document.querySelectorAll(
      '[class*="city"], [class*="airport"], [class*="origin"], [class*="destination"], [class*="location"], [class*="address"]'
    );
    locEls.forEach(el => {
      const raw = el.textContent?.trim();
      const text = cleanLocationText(raw);
      if (text && text.length > 1 && text.length < 80 && locations.length < 5 && !locations.includes(text)) {
        locations.push(text);
      }
    });
    return locations;
  }

  function extractProducts() {
    const products = [];
    const productEls = document.querySelectorAll(
      '[class*="product-name"], [class*="product-title"], [class*="item-name"], [itemprop="name"], h1'
    );
    productEls.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 3 && text.length < 150 && products.length < 3) {
        products.push(text);
      }
    });
    return products;
  }

  function extractFlightInfo() {
    // Look for flight-specific patterns
    const flightData = {};
    const body = document.body?.innerText || '';

    // Airport codes (3 capital letters that look like airports)
    const airportRegex = /\b([A-Z]{3})\s*(?:to|->|->|->|->)\s*([A-Z]{3})\b/;
    const airportMatch = body.match(airportRegex);
    if (airportMatch) {
      flightData.from = airportMatch[1];
      flightData.to = airportMatch[2];
    }

    // Passenger count
    const paxRegex = /(\d+)\s*(?:passenger|adult|traveler)/i;
    const paxMatch = body.match(paxRegex);
    if (paxMatch) flightData.passengers = parseInt(paxMatch[1]);

    // Cabin class
    if (/business\s*class/i.test(body)) flightData.cabin = 'business';
    else if (/first\s*class/i.test(body)) flightData.cabin = 'first';
    else if (/economy/i.test(body)) flightData.cabin = 'economy';

    return Object.keys(flightData).length > 0 ? flightData : null;
  }

  function extractEventInfo() {
    const eventData = {};
    const ldJson = document.querySelectorAll('script[type="application/ld+json"]');
    ldJson.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type'] === 'Event' || data['@type']?.includes?.('Event')) {
          eventData.name = data.name;
          eventData.startDate = data.startDate;
          eventData.location = data.location?.name || data.location?.address;
          eventData.price = data.offers?.price;
        }
      } catch {}
    });
    return Object.keys(eventData).length > 0 ? eventData : null;
  }

  function extractFormData() {
    // Detect if user is filling out forms (booking, checkout, etc.)
    const forms = document.querySelectorAll('form');
    const formInfo = { hasForm: forms.length > 0, formTypes: [] };

    forms.forEach(form => {
      const action = form.action || '';
      const inputs = form.querySelectorAll('input, select, textarea');
      const fieldNames = Array.from(inputs)
        .map(i => (i.name || i.id || i.placeholder || '').toLowerCase())
        .filter(Boolean);

      if (fieldNames.some(f => /book|reserv|flight|travel/i.test(f))) {
        formInfo.formTypes.push('booking');
      }
      if (fieldNames.some(f => /cart|checkout|pay|card|billing/i.test(f))) {
        formInfo.formTypes.push('checkout');
      }
      if (fieldNames.some(f => /search|find|lookup/i.test(f))) {
        formInfo.formTypes.push('search');
      }
    });

    return formInfo.formTypes.length > 0 ? formInfo : null;
  }

  // ---- Main extraction ----

  function extractPageContext() {
    const now = Date.now();
    if (now - lastSent < DEBOUNCE_MS) return;
    lastSent = now;

    const url = location.href;
    const title = document.title;
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    const context = {
      url,
      title,
      h1,
      metaDescription: metaDesc.slice(0, 200),
      prices: extractPrices(),
      dates: extractDates(),
      locations: extractLocations(),
      products: extractProducts(),
      flightInfo: extractFlightInfo(),
      eventInfo: extractEventInfo(),
      formData: extractFormData(),
      // Send a small text snippet for AI classification fallback
      snippet: [h1, metaDesc].filter(Boolean).join(' | ').slice(0, 300),
    };

    // Only send if there's something meaningful
    const hasMeaningfulData = context.prices.length > 0 ||
      context.dates.length > 0 ||
      context.locations.length > 0 ||
      context.products.length > 0 ||
      context.flightInfo ||
      context.eventInfo ||
      context.formData;

    // Always send URL/title for pattern matching, but flag if we have rich data
    context.hasStructuredData = hasMeaningfulData;

    chrome.runtime.sendMessage({
      type: 'pageContext',
      context,
    }).catch(() => {
      // Extension context invalidated (e.g., extension reloaded) - ignore
    });
  }

  // ---- Lifecycle ----

  // Extract on initial load
  if (document.readyState === 'complete') {
    setTimeout(extractPageContext, 500);
  } else {
    window.addEventListener('load', () => setTimeout(extractPageContext, 500));
  }

  // Re-extract on significant DOM changes (SPA navigation, dynamic content)
  let mutationTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(mutationTimeout);
    mutationTimeout = setTimeout(extractPageContext, 2000);
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    characterData: false,
    attributes: false,
  });

  // Re-extract on URL changes (SPA navigation via pushState/replaceState)
  let lastUrl = location.href;
  const urlCheck = setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(extractPageContext, 1000);
    }
  }, 1500);

  // Cleanup if extension context is invalidated
  if (chrome.runtime?.id) {
    // Extension is still valid
  } else {
    observer.disconnect();
    clearInterval(urlCheck);
  }
})();
