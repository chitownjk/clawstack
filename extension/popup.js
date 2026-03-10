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

  // Check auth directly from popup (service worker can't reliably send cookies)
  let user = null;
  try {
    const res = await fetch(`${API_BASE}/api/account/me`, {
      credentials: 'include',
    });
    if (res.ok) {
      user = await res.json();
    }
  } catch (e) {
    console.error('[Tiker Popup] Auth check failed:', e);
  }

  loadingEl.classList.add('hidden');

  if (!user) {
    authEl.classList.remove('hidden');
    return;
  }

  mainEl.classList.remove('hidden');

  // Set greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  greetingEl.textContent = user.first_name
    ? `${timeGreeting}, ${user.first_name}`
    : timeGreeting;

  // Set default date
  const today = new Date().toISOString().split('T')[0];
  taskDate.value = '';
  taskDate.min = today;

  // Load briefing directly
  loadBriefing();

  // Task form submission
  taskSubmit.addEventListener('click', submitTask);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitTask();
  });

  // Focus the input
  taskInput.focus();

  async function submitTask() {
    const title = taskInput.value.trim();
    if (!title) {
      taskInput.focus();
      return;
    }

    taskSubmit.disabled = true;
    taskSubmit.textContent = '...';

    try {
      const res = await fetch(`${API_BASE}/api/command/tasks/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          due_date: taskDate.value || null,
          tags: ['extension'],
          status: 'inbox',
        }),
      });

      taskSubmit.disabled = false;
      taskSubmit.textContent = 'Add';

      if (res.ok) {
        taskInput.value = '';
        taskDate.value = '';
        taskSuccess.classList.remove('hidden');
        setTimeout(() => taskSuccess.classList.add('hidden'), 2000);
        // Tell background to refresh badge
        chrome.runtime.sendMessage({ type: 'refreshBadge' });
      } else {
        alert('Failed to add task. Please try again.');
      }
    } catch (err) {
      taskSubmit.disabled = false;
      taskSubmit.textContent = 'Add';
      alert('Network error. Check your connection.');
    }
  }

  async function loadBriefing() {
    try {
      // First try cached briefing from background
      const cached = await chrome.storage.local.get(['cachedBriefing']);
      if (cached.cachedBriefing) {
        renderBriefing(cached.cachedBriefing);
      }

      // Then fetch fresh
      const res = await fetch(`${API_BASE}/api/briefing/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.briefing) {
          renderBriefing(data.briefing);
          chrome.storage.local.set({ cachedBriefing: data.briefing, lastRefresh: Date.now() });
        }
      }
    } catch (e) {
      console.error('[Tiker Popup] Briefing load failed:', e);
      if (!briefingContent.querySelector('.attention-item')) {
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
      const shown = items.slice(0, 3);
      shown.forEach((item) => {
        const icon = getIcon(item.type);
        html += `
          <div class="attention-item">
            <span class="attention-icon">${icon}</span>
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
      html = '<div class="empty-state">No items needing attention right now.</div>';
    }

    briefingContent.innerHTML = html;
  }
});

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
    conflict: '\u26A0\uFE0F',
    review: '\u2B50',
    blocked: '\u274C',
    due: '\u23F0',
    extracted: '\u2709\uFE0F',
    flight: '\u2708\uFE0F',
    bill: '\uD83D\uDCB3',
    meeting: '\uD83D\uDCC5',
  };
  return icons[type] || '\u2022';
}
