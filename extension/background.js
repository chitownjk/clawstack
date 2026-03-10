const API_BASE = 'https://www.tiker.com';

// ---- Per-tab context cache ----
// Stores the latest classified context for each tab so the popup
// opens instantly with the right info.
const tabContexts = new Map();

// ---- Context Menu ----

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-tiker',
    title: 'Add to Tiker',
    contexts: ['page', 'selection', 'link'],
  });
  chrome.alarms.create('refresh-badge', { periodInMinutes: 15 });
  refreshBadge();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'add-to-tiker') return;
  const title = info.selectionText
    ? info.selectionText.slice(0, 200)
    : tab?.title || 'Untitled page';
  const description = info.linkUrl
    ? `Link: ${info.linkUrl}\nFrom: ${tab?.url || ''}`
    : tab?.url ? `From: ${tab.url}` : '';
  try {
    const result = await authenticatedFetch('/api/command/tasks/create', {
      method: 'POST',
      body: JSON.stringify({ title, description, tags: ['extension'], status: 'inbox' }),
    });
    if (result && !result.error) {
      chrome.action.setBadgeText({ text: '\u2713' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(() => updateBadgeForTab(tab.id), 2000);
    }
  } catch (err) {
    console.error('[Tiker] Failed to create task:', err);
  }
});

// ---- Authenticated fetch ----
// Reads cookies via chrome.cookies.getAll() and forwards them through
// X-Extension-Cookies header to bypass SameSite=Lax restrictions.

async function authenticatedFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  let cookieString = '';
  try {
    const cookies = await chrome.cookies.getAll({ url: API_BASE });
    cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  } catch (e) {
    console.warn('[Tiker] Could not read cookies:', e);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Cookies': cookieString,
      'X-Tiker-Extension': '1',
      ...(options.headers || {}),
    },
    body: options.body || undefined,
  });

  if (!res.ok) return { error: `HTTP ${res.status}`, status: res.status };
  try { return await res.json(); }
  catch { return { error: 'Parse error', status: res.status }; }
}

// ---- Local context classification ----
// Fast pattern matching so we don't need to call the server on every page.
// Only uses AI for ambiguous contexts.

const SITE_PATTERNS = {
  travel: {
    domains: [
      'united.com', 'delta.com', 'aa.com', 'southwest.com', 'jetblue.com',
      'alaskaair.com', 'spirit.com', 'frontier.com', 'hawaiianairlines.com',
      'google.com/travel', 'kayak.com', 'expedia.com', 'priceline.com',
      'skyscanner.com', 'hopper.com', 'momondo.com', 'kiwi.com',
      'marriott.com', 'hilton.com', 'ihg.com', 'hyatt.com', 'airbnb.com',
      'booking.com', 'vrbo.com', 'hotels.com',
      'hertz.com', 'enterprise.com', 'avis.com', 'turo.com',
    ],
    icon: '\u2708\uFE0F',
    color: '#2563eb',
    label: 'Travel',
  },
  shopping: {
    domains: [
      'amazon.com', 'walmart.com', 'target.com', 'bestbuy.com', 'costco.com',
      'ebay.com', 'etsy.com', 'wayfair.com', 'homedepot.com', 'lowes.com',
      'macys.com', 'nordstrom.com', 'zappos.com', 'nike.com', 'adidas.com',
      'apple.com/shop', 'newegg.com', 'overstock.com',
    ],
    icon: '\uD83D\uDED2',
    color: '#ea580c',
    label: 'Shopping',
  },
  finance: {
    domains: [
      'chase.com', 'bankofamerica.com', 'wellsfargo.com', 'citi.com',
      'capitalone.com', 'discover.com', 'amex.com', 'usbank.com',
      'mint.com', 'ynab.com', 'personalcapital.com',
      'fidelity.com', 'vanguard.com', 'schwab.com', 'robinhood.com',
      'venmo.com', 'paypal.com', 'zelle.com',
    ],
    icon: '\uD83D\uDCB3',
    color: '#16a34a',
    label: 'Finance',
  },
  health: {
    domains: [
      'mychart.com', 'zocdoc.com', 'onemedical.com', 'teladoc.com',
      'cvs.com', 'walgreens.com', 'goodrx.com', 'healthgrades.com',
      'webmd.com',
    ],
    icon: '\uD83C\uDFE5',
    color: '#dc2626',
    label: 'Healthcare',
  },
  family: {
    domains: [
      'classdojo.com', 'seesaw.me', 'remind.com', 'schoology.com',
      'canvas.instructure.com', 'parentvue.com', 'powerschool.com',
      'brightwheel.com', 'kiddieacademy.com',
    ],
    icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
    color: '#9333ea',
    label: 'Family',
  },
  food: {
    domains: [
      'doordash.com', 'ubereats.com', 'grubhub.com', 'instacart.com',
      'opentable.com', 'resy.com', 'yelp.com/reservations',
      'hellofresh.com', 'blueapron.com',
    ],
    icon: '\uD83C\uDF7D\uFE0F',
    color: '#ca8a04',
    label: 'Food & Dining',
  },
  events: {
    domains: [
      'eventbrite.com', 'meetup.com', 'ticketmaster.com', 'stubhub.com',
      'seatgeek.com', 'axs.com', 'dice.fm', 'universe.com',
    ],
    icon: '\uD83D\uDCC5',
    color: '#0891b2',
    label: 'Events',
  },
  home: {
    domains: [
      'zillow.com', 'realtor.com', 'redfin.com', 'trulia.com',
      'apartments.com', 'thumbtack.com', 'angi.com', 'nextdoor.com',
    ],
    icon: '\uD83C\uDFE0',
    color: '#65a30d',
    label: 'Home',
  },
};

function classifyUrl(url) {
  const hostname = new URL(url).hostname.replace(/^www\./, '');
  for (const [type, config] of Object.entries(SITE_PATTERNS)) {
    if (config.domains.some(d => hostname.includes(d.replace(/^www\./, '')) || hostname.endsWith(d.replace(/^www\./, '')))) {
      return { type, ...config };
    }
  }
  return null;
}

function generateSuggestion(classification, context) {
  const { type } = classification;
  const { prices, dates, locations, products, flightInfo, eventInfo, title, h1 } = context;

  switch (type) {
    case 'travel': {
      let msg = 'Looks like you\'re planning travel.';
      if (flightInfo?.from && flightInfo?.to) {
        msg = `Looking at flights from ${flightInfo.from} to ${flightInfo.to}.`;
      } else if (locations.length >= 2) {
        msg = `Looking at travel: ${locations.slice(0, 2).join(' to ')}.`;
      } else if (locations.length === 1) {
        msg = `Looking at travel to ${locations[0]}.`;
      }
      if (prices.length > 0) msg += ` Prices from ${prices[0]}.`;
      if (dates.length > 0) msg += ` Dates: ${dates[0]}.`;
      return {
        headline: msg,
        suggestion: 'Want me to track this trip? I can compare options, watch for price drops, and add it to your calendar.',
        taskTitle: flightInfo?.from && flightInfo?.to
          ? `Book flight: ${flightInfo.from} to ${flightInfo.to}`
          : locations.length > 0
            ? `Book travel: ${locations[0]}`
            : `Book travel: ${h1 || title}`,
      };
    }
    case 'shopping': {
      const product = products[0] || h1 || title;
      let msg = `Shopping: ${product.slice(0, 80)}`;
      if (prices.length > 0) msg += ` - ${prices[0]}`;
      return {
        headline: msg,
        suggestion: 'Want me to track this item? I can watch for price drops and remind you before any deals expire.',
        taskTitle: `Buy: ${product.slice(0, 80)}${prices.length ? ' (' + prices[0] + ')' : ''}`,
      };
    }
    case 'finance': {
      return {
        headline: 'Managing finances.',
        suggestion: 'I can track bills, remind you about payments, and flag unusual charges.',
        taskTitle: prices.length > 0
          ? `Financial task: ${prices[0]} - ${title.slice(0, 60)}`
          : `Financial task: ${title.slice(0, 80)}`,
      };
    }
    case 'health': {
      return {
        headline: 'Healthcare activity detected.',
        suggestion: 'Need to schedule an appointment, refill a prescription, or track a health task?',
        taskTitle: `Health: ${h1 || title}`.slice(0, 80),
      };
    }
    case 'family': {
      return {
        headline: 'School or family activity.',
        suggestion: 'I can add events to your calendar, track assignments, or set reminders for school deadlines.',
        taskTitle: `Family: ${h1 || title}`.slice(0, 80),
      };
    }
    case 'food': {
      return {
        headline: 'Food or dining.',
        suggestion: 'Want me to save this restaurant, track a reservation, or plan meals for the week?',
        taskTitle: products[0]
          ? `Food: ${products[0].slice(0, 60)}`
          : `Dining: ${h1 || title}`.slice(0, 80),
      };
    }
    case 'events': {
      let msg = 'Event found.';
      if (eventInfo?.name) msg = `Event: ${eventInfo.name}`;
      else if (h1) msg = `Event: ${h1}`;
      return {
        headline: msg.slice(0, 100),
        suggestion: 'Want me to add this to your calendar and set a reminder?',
        taskTitle: eventInfo?.name
          ? `Attend: ${eventInfo.name}`.slice(0, 80)
          : `Event: ${h1 || title}`.slice(0, 80),
      };
    }
    case 'home': {
      return {
        headline: 'Home-related activity.',
        suggestion: 'I can track listings, remind you about viewings, or help coordinate home projects.',
        taskTitle: `Home: ${h1 || title}`.slice(0, 80),
      };
    }
    default:
      return {
        headline: title.slice(0, 100),
        suggestion: 'Want to save this to your task list?',
        taskTitle: title.slice(0, 80),
      };
  }
}

// ---- Badge management ----

const BADGE_COLORS = {
  context: '#2563eb',  // Blue for detected context
  tasks: '#f59e0b',    // Amber for pending tasks
  success: '#22c55e',  // Green for success
};

function updateBadgeForTab(tabId) {
  const ctx = tabContexts.get(tabId);
  if (ctx?.classification) {
    chrome.action.setBadgeText({ text: ' ', tabId });
    chrome.action.setBadgeBackgroundColor({
      color: ctx.classification.color || BADGE_COLORS.context,
      tabId,
    });
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// ---- Message handlers ----

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Content script detected page context
  if (msg.type === 'pageContext') {
    const tabId = sender.tab?.id;
    if (!tabId) return;

    const context = msg.context;
    const classification = classifyUrl(context.url);

    if (classification) {
      const suggestion = generateSuggestion(classification, context);
      const detected = {
        classification,
        suggestion,
        context,
        timestamp: Date.now(),
      };
      tabContexts.set(tabId, detected);
      updateBadgeForTab(tabId);

      // If there's rich structured data and we want AI enhancement,
      // we could call the server here for a better suggestion.
      // For now, local classification is fast and good enough.
      if (context.hasStructuredData) {
        // Future: call server for AI-enhanced suggestion
        // authenticatedFetch('/api/extension/context', { ... })
      }
    } else {
      // No known site pattern matched
      tabContexts.delete(tabId);
      chrome.action.setBadgeText({ text: '', tabId });

      // If there's structured data on an unknown site, try AI classification
      if (context.hasStructuredData && context.snippet) {
        authenticatedFetch('/api/extension/context', {
          method: 'POST',
          body: JSON.stringify({
            url: context.url,
            title: context.title,
            snippet: context.snippet,
            structuredData: {
              prices: context.prices,
              dates: context.dates,
              locations: context.locations,
              products: context.products,
            },
          }),
        }).then(result => {
          if (result?.detected) {
            const aiSuggestion = {
              headline: result.label || context.title,
              suggestion: result.suggestedTask || 'Want to save this?',
              taskTitle: result.suggestedTask || context.title,
            };
            tabContexts.set(tabId, {
              classification: {
                type: result.type,
                icon: getTypeIcon(result.type),
                color: getTypeColor(result.type),
                label: result.label,
              },
              suggestion: aiSuggestion,
              context,
              timestamp: Date.now(),
              source: 'ai',
            });
            updateBadgeForTab(tabId);
          }
        }).catch(() => {});
      }
    }
    return;
  }

  // Popup requesting tab context
  if (msg.type === 'getTabContext') {
    const ctx = tabContexts.get(msg.tabId);
    sendResponse(ctx || null);
    return;
  }

  // Popup requesting API fetch
  if (msg.type === 'apiFetch') {
    authenticatedFetch(msg.path, msg.options || {})
      .then(data => sendResponse(data))
      .catch(() => sendResponse({ error: 'Background fetch failed' }));
    return true;
  }

  // Badge refresh
  if (msg.type === 'refreshBadge') {
    refreshBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
});

// Clean up when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabContexts.delete(tabId);
});

// ---- Briefing badge refresh ----

async function refreshBadge() {
  try {
    const data = await authenticatedFetch('/api/briefing/generate', {
      method: 'POST',
      body: JSON.stringify({ force: false }),
    });
    const briefing = data?.briefing;
    if (briefing) {
      chrome.storage.local.set({ cachedBriefing: briefing, lastRefresh: Date.now() });
    }
  } catch {}
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh-badge') refreshBadge();
});

// ---- Helpers ----

function getTypeIcon(type) {
  const icons = {
    travel: '\u2708\uFE0F', shopping: '\uD83D\uDED2', finance: '\uD83D\uDCB3',
    health: '\uD83C\uDFE5', family: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
    food: '\uD83C\uDF7D\uFE0F', events: '\uD83D\uDCC5', home: '\uD83C\uDFE0',
  };
  return icons[type] || '\u2B50';
}

function getTypeColor(type) {
  const colors = {
    travel: '#2563eb', shopping: '#ea580c', finance: '#16a34a',
    health: '#dc2626', family: '#9333ea', food: '#ca8a04',
    events: '#0891b2', home: '#65a30d',
  };
  return colors[type] || '#6b7280';
}
