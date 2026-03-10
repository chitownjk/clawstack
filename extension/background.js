const API_BASE = 'https://www.tiker.com';

// ---- Context Menu ----

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-tiker',
    title: 'Add to Tiker',
    contexts: ['page', 'selection', 'link'],
  });

  // Set up badge refresh alarm (every 15 minutes)
  chrome.alarms.create('refresh-badge', { periodInMinutes: 15 });

  // Initial badge refresh
  refreshBadge();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'add-to-tiker') return;

  const title = info.selectionText
    ? info.selectionText.slice(0, 200)
    : tab?.title || 'Untitled page';

  const description = info.linkUrl
    ? `Link: ${info.linkUrl}\nFrom: ${tab?.url || ''}`
    : tab?.url
    ? `From: ${tab.url}`
    : '';

  try {
    const result = await authenticatedFetch('/api/command/tasks/create', {
      method: 'POST',
      body: JSON.stringify({
        title,
        description,
        tags: ['extension'],
        status: 'inbox',
      }),
    });

    if (result && !result.error) {
      chrome.action.setBadgeText({ text: '\u2713' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(() => refreshBadge(), 2000);
    } else if (result?.status === 401) {
      chrome.tabs.create({ url: `${API_BASE}/auth/login` });
    }
  } catch (err) {
    console.error('[Tiker] Failed to create task:', err);
  }
});

// ---- Authenticated fetch helper ----
// Background service worker can send cookies via credentials:'include'
// for domains listed in host_permissions.

async function authenticatedFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body || undefined,
  });

  if (!res.ok) {
    return { error: `HTTP ${res.status}`, status: res.status };
  }

  try {
    return await res.json();
  } catch {
    return { error: 'Parse error', status: res.status };
  }
}

// ---- Badge (attention item count) ----

async function refreshBadge() {
  try {
    const data = await authenticatedFetch('/api/briefing/generate', {
      method: 'POST',
      body: JSON.stringify({ force: false }),
    });

    const briefing = data?.briefing;

    let count = 0;
    if (briefing?.sections?.attention_items) {
      count = briefing.sections.attention_items.length;
    } else if (briefing?.attention_items) {
      count = briefing.attention_items.length;
    }

    if (count > 0) {
      chrome.action.setBadgeText({ text: String(count) });
      chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    if (briefing) {
      chrome.storage.local.set({ cachedBriefing: briefing, lastRefresh: Date.now() });
    }
  } catch {
    chrome.action.setBadgeText({ text: '' });
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh-badge') {
    refreshBadge();
  }
});

// ---- Message handler for popup ----

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'refreshBadge') {
    refreshBadge().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'apiFetch') {
    authenticatedFetch(msg.path, msg.options || {})
      .then((data) => sendResponse(data))
      .catch(() => sendResponse({ error: 'Background fetch failed' }));
    return true; // Keep message channel open for async response
  }
});
