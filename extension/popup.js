const API_BASE = 'https://www.tiker.com';

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const authEl = document.getElementById('auth-screen');
  const mainEl = document.getElementById('main-screen');
  const greetingEl = document.getElementById('greeting');
  const taskInput = document.getElementById('task-input');
  const taskDate = document.getElementById('task-date');
  const taskSubmit = document.getElementById('task-submit');
  const taskSuccess = document.getElementById('task-success');
  const briefingContent = document.getElementById('briefing-content');
  const contextCard = document.getElementById('context-card');
  const contextIcon = document.getElementById('context-icon');
  const contextLabel = document.getElementById('context-label');
  const contextAction = document.getElementById('context-action');
  const contextAddBtn = document.getElementById('context-add');
  const aiToggle = document.getElementById('ai-toggle');
  const aiToggleLabel = document.getElementById('ai-toggle-label');

  // Try fetching account via background (reads cookies via chrome.cookies API
  // and forwards them through a custom header to bypass SameSite restrictions)
  let user = null;
  try {
    user = await bgFetch('/api/account/me');
  } catch (e) {
    console.error('[Tiker] Account fetch failed:', e);
  }

  loadingEl.classList.add('hidden');

  if (!user || user.error || user.status === 401) {
    authEl.classList.remove('hidden');
    return;
  }

  mainEl.classList.remove('hidden');

  // Greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  greetingEl.textContent = user.first_name
    ? `${timeGreeting}, ${user.first_name}`
    : timeGreeting;

  // Date input defaults
  const today = new Date().toISOString().split('T')[0];
  taskDate.min = today;

  // Focus input
  taskInput.focus();

  // ---- Context Detection ----
  detectPageContext();

  // ---- Briefing ----
  loadBriefing();

  // ---- Task Form ----
  let aiEnabled = true;
  aiToggle.checked = true;

  aiToggle.addEventListener('change', () => {
    aiEnabled = aiToggle.checked;
    aiToggleLabel.textContent = aiEnabled ? 'AI will handle' : 'Manual task';
  });

  taskSubmit.addEventListener('click', submitTask);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitTask();
  });

  async function submitTask() {
    const title = taskInput.value.trim();
    if (!title) { taskInput.focus(); return; }

    taskSubmit.disabled = true;
    taskSubmit.textContent = '...';

    try {
      const payload = {
        title,
        due_date: taskDate.value || null,
        tags: aiEnabled ? ['extension', 'ai-handle'] : ['extension'],
        status: 'inbox',
        priority: aiEnabled ? 'soon' : undefined,
      };

      const result = await bgFetch('/api/command/tasks/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      taskSubmit.disabled = false;
      taskSubmit.textContent = 'Add';

      if (result && !result.error) {
        taskInput.value = '';
        taskDate.value = '';
        taskSuccess.classList.remove('hidden');
        setTimeout(() => taskSuccess.classList.add('hidden'), 2000);
        chrome.runtime.sendMessage({ type: 'refreshBadge' });
      } else {
        showError('Failed to add task');
      }
    } catch (err) {
      taskSubmit.disabled = false;
      taskSubmit.textContent = 'Add';
      showError('Network error');
    }
  }

  // Context "Add to Tiker" button
  contextAddBtn?.addEventListener('click', async () => {
    const suggested = contextAction.textContent;
    taskInput.value = suggested;
    taskInput.focus();
    // Scroll to input
    taskInput.scrollIntoView({ behavior: 'smooth' });
  });

  // ---- Context Detection ----
  async function detectPageContext() {
    try {
      // Get active tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        return;
      }

      // Try to extract page content
      let snippet = '';
      try {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Extract meaningful text from the page
            const selectors = [
              'h1', 'h2', '.price', '.total', '.amount',
              '[class*="flight"]', '[class*="booking"]', '[class*="itinerary"]',
              '[class*="order"]', '[class*="confirm"]', '[class*="receipt"]',
              'title', 'meta[name="description"]',
            ];
            const texts = [];
            selectors.forEach(sel => {
              document.querySelectorAll(sel).forEach(el => {
                const text = el.textContent?.trim();
                if (text && text.length < 200) texts.push(text);
              });
            });
            // Also get meta description
            const meta = document.querySelector('meta[name="description"]');
            if (meta?.getAttribute('content')) texts.push(meta.getAttribute('content'));
            return texts.slice(0, 10).join(' | ');
          },
        });
        snippet = result?.result || '';
      } catch {
        // Can't inject into some pages (chrome://, etc.)
      }

      // Send to classification API
      const context = await bgFetch('/api/extension/context', {
        method: 'POST',
        body: JSON.stringify({
          url: tab.url,
          title: tab.title || '',
          snippet,
        }),
      });

      if (context?.detected) {
        showContextCard(context);
      }
    } catch (e) {
      console.error('[Tiker] Context detection failed:', e);
    }
  }

  function showContextCard(context) {
    const icons = {
      travel: '\u2708\uFE0F',
      shopping: '\uD83D\uDED2',
      finance: '\uD83D\uDCB3',
      health: '\uD83C\uDFE5',
      family: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
      food: '\uD83C\uDF7D\uFE0F',
      event: '\uD83D\uDCC5',
      home: '\uD83C\uDFE0',
      other: '\u2B50',
    };

    contextIcon.textContent = icons[context.type] || icons.other;
    contextLabel.textContent = context.label;
    contextAction.textContent = context.suggestedTask;
    contextCard.classList.remove('hidden');
  }

  // ---- Briefing ----
  async function loadBriefing() {
    try {
      const data = await bgFetch('/api/briefing/generate', {
        method: 'POST',
        body: JSON.stringify({ force: false }),
      });

      if (data?.briefing) {
        renderBriefing(data.briefing);
        chrome.storage.local.set({ cachedBriefing: data.briefing, lastRefresh: Date.now() });
      } else {
        briefingContent.innerHTML = '<div class="empty-state">No briefing yet. Visit Tiker to generate one.</div>';
      }
    } catch (e) {
      console.error('[Tiker] Briefing load failed:', e);
      // Try cache
      const cached = await chrome.storage.local.get(['cachedBriefing']);
      if (cached.cachedBriefing) {
        renderBriefing(cached.cachedBriefing);
      } else {
        briefingContent.innerHTML = '<div class="empty-state">Could not load briefing.</div>';
      }
    }
  }

  function renderBriefing(briefing) {
    let html = '';
    const sections = typeof briefing.sections === 'string'
      ? tryParse(briefing.sections)
      : briefing.sections;

    const summary = sections?.summary || briefing.summary;
    if (summary && typeof summary === 'string' && !summary.startsWith('{')) {
      html += `<div class="briefing-summary">${escapeHtml(summary)}</div>`;
    }

    const items = sections?.attention_items || briefing.attention_items || [];
    if (items.length > 0) {
      items.slice(0, 3).forEach((item) => {
        html += `
          <div class="attention-item">
            <span class="attention-icon">${getIcon(item.type)}</span>
            <div class="attention-text">
              <div class="attention-title">${escapeHtml(item.title)}</div>
              ${item.action ? `<div class="attention-action">${escapeHtml(item.action)}</div>` : ''}
            </div>
          </div>`;
      });
      if (items.length > 3) {
        html += `<div class="empty-state">+${items.length - 3} more in Tiker</div>`;
      }
    }

    if (!html) {
      html = '<div class="empty-state">No items needing attention.</div>';
    }

    briefingContent.innerHTML = html;
  }

  function showError(msg) {
    taskSuccess.textContent = msg;
    taskSuccess.style.color = '#dc2626';
    taskSuccess.classList.remove('hidden');
    setTimeout(() => {
      taskSuccess.classList.add('hidden');
      taskSuccess.textContent = '\u2713 Task added!';
      taskSuccess.style.color = '';
    }, 2000);
  }
});

// ---- Background fetch helper ----
// Routes API calls through background script which uses chrome.cookies API
function bgFetch(path, options = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: 'apiFetch', path, options },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('[Tiker] bgFetch error:', chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(response);
      }
    );
  });
}

function tryParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getIcon(type) {
  const icons = {
    conflict: '\u26A0\uFE0F', review: '\u2B50', blocked: '\u274C',
    due: '\u23F0', extracted: '\u2709\uFE0F', flight: '\u2708\uFE0F',
    bill: '\uD83D\uDCB3', meeting: '\uD83D\uDCC5',
  };
  return icons[type] || '\u2022';
}
