const API_BASE = 'https://tiker.com';

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
    const res = await fetch(`${API_BASE}/api/command/tasks/create`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        tags: ['extension'],
        status: 'inbox',
      }),
    });

    if (res.ok) {
      // Show success badge briefly
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      setTimeout(() => refreshBadge(), 2000);
    } else if (res.status === 401) {
      // Not logged in - open Tiker login
      chrome.tabs.create({ url: `${API_BASE}/auth/login` });
    }
  } catch (err) {
    console.error('[Tiker] Failed to create task:', err);
  }
});

// ---- Badge (attention item count) ----

async function refreshBadge() {
  try {
    const res = await fetch(`${API_BASE}/api/briefing/generate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: false }),
    });

    if (!res.ok) {
      chrome.action.setBadgeText({ text: '' });
      return;
    }

    const data = await res.json();
    const briefing = data.briefing;

    // Count attention items
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

    // Cache briefing for popup
    chrome.storage.local.set({ cachedBriefing: briefing, lastRefresh: Date.now() });
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
  if (msg.type === 'createTask') {
    createTask(msg.data).then(sendResponse);
    return true; // async
  }
  if (msg.type === 'getBriefing') {
    getCachedBriefing().then(sendResponse);
    return true;
  }
  if (msg.type === 'checkAuth') {
    checkAuth().then(sendResponse);
    return true;
  }
  if (msg.type === 'refreshBadge') {
    refreshBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function createTask(data) {
  try {
    const res = await fetch(`${API_BASE}/api/command/tasks/create`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.title,
        due_date: data.dueDate || null,
        tags: ['extension'],
        status: 'inbox',
      }),
    });

    if (res.ok) {
      refreshBadge();
      return { success: true };
    }
    return { success: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function getCachedBriefing() {
  const stored = await chrome.storage.local.get(['cachedBriefing', 'lastRefresh']);
  const age = Date.now() - (stored.lastRefresh || 0);

  // If cache is older than 15 min, refresh in background
  if (age > 15 * 60 * 1000) {
    refreshBadge(); // fire and forget
  }

  return { briefing: stored.cachedBriefing || null };
}

async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/api/account/me`, {
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      return { authenticated: true, user: data };
    }
    return { authenticated: false };
  } catch {
    return { authenticated: false };
  }
}
