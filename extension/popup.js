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
  const contextType = document.getElementById('context-type');
  const contextHeadline = document.getElementById('context-headline');
  const contextSuggestion = document.getElementById('context-suggestion');
  const contextAddBtn = document.getElementById('context-add');
  const contextDismissBtn = document.getElementById('context-dismiss');
  const noContext = document.getElementById('no-context');
  const aiToggle = document.getElementById('ai-toggle');
  const aiToggleLabel = document.getElementById('ai-toggle-label');

  // ---- Auth check ----
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

  // ---- Context display ----
  // Ask background for the already-classified context of the active tab
  let currentContext = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      currentContext = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'getTabContext', tabId: tab.id }, (res) => {
          resolve(res);
        });
      });
    }
  } catch (e) {
    console.error('[Tiker] Context fetch failed:', e);
  }

  if (currentContext?.classification) {
    showContextCard(currentContext);
  } else {
    noContext.classList.remove('hidden');
  }

  // ---- Briefing ----
  loadBriefing();

  // ---- Task Form ----
  let aiEnabled = true;
  aiToggle.checked = true;
  taskInput.focus();

  aiToggle.addEventListener('change', () => {
    aiEnabled = aiToggle.checked;
    aiToggleLabel.textContent = aiEnabled ? 'AI handles it' : 'Manual task';
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
        tags: aiEnabled ? ['extension', 'ai-handle'] : ['extension'],
        priority: aiEnabled ? 'high' : 'normal',
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
        const msg = result?.error || 'Failed to add task';
        console.error('[Tiker] Task create failed:', msg, result);
        showError(msg);
      }
    } catch (err) {
      taskSubmit.disabled = false;
      taskSubmit.textContent = 'Add';
      console.error('[Tiker] Task create error:', err);
      showError('Network error');
    }
  }

  // ---- Context card interactions ----

  function showContextCard(ctx) {
    const { classification, suggestion } = ctx;
    contextIcon.textContent = classification.icon;
    contextType.textContent = classification.label;
    contextHeadline.textContent = suggestion.headline;
    contextSuggestion.textContent = suggestion.suggestion;
    noContext.classList.add('hidden');
    contextCard.classList.remove('hidden');

    // Actually create the task when clicking "Add to Tiker"
    contextAddBtn.onclick = async () => {
      contextAddBtn.disabled = true;
      contextAddBtn.textContent = 'Adding...';

      try {
        const result = await bgFetch('/api/command/tasks/create', {
          method: 'POST',
          body: JSON.stringify({
            title: suggestion.taskTitle,
            description: `Detected from: ${ctx.context?.url || ''}\n${suggestion.headline}`,
            tags: ['extension', 'ai-handle', classification.type],
            priority: 'high',
          }),
        });

        if (result && !result.error) {
          contextAddBtn.textContent = 'Added!';
          contextAddBtn.style.background = '#22c55e';
          chrome.runtime.sendMessage({ type: 'refreshBadge' });
          setTimeout(() => {
            contextCard.classList.add('hidden');
            taskSuccess.classList.remove('hidden');
            setTimeout(() => taskSuccess.classList.add('hidden'), 2000);
          }, 800);
        } else {
          const msg = result?.error || 'Failed';
          contextAddBtn.textContent = msg.length > 20 ? 'Failed' : msg;
          contextAddBtn.disabled = false;
          setTimeout(() => { contextAddBtn.textContent = 'Add to Tiker'; }, 3000);
          console.error('[Tiker] Task create failed:', msg, result);
        }
      } catch (err) {
        contextAddBtn.textContent = 'Error';
        contextAddBtn.disabled = false;
        setTimeout(() => { contextAddBtn.textContent = 'Add to Tiker'; }, 2000);
        console.error('[Tiker] Task create error:', err);
      }
    };
  }

  contextDismissBtn.addEventListener('click', () => {
    contextCard.classList.add('hidden');
    noContext.classList.remove('hidden');
  });

  // ---- Briefing ----
  async function loadBriefing() {
    try {
      // Try cache first for instant display
      const cached = await chrome.storage.local.get(['cachedBriefing', 'lastRefresh']);
      if (cached.cachedBriefing) {
        renderBriefing(cached.cachedBriefing);
      }

      // Then fetch fresh in background
      const data = await bgFetch('/api/briefing/generate', {
        method: 'POST',
        body: JSON.stringify({ force: false }),
      });

      if (data?.briefing) {
        renderBriefing(data.briefing);
        chrome.storage.local.set({ cachedBriefing: data.briefing, lastRefresh: Date.now() });
      } else if (!cached.cachedBriefing) {
        briefingContent.innerHTML = '<div class="empty-state">No briefing yet. Visit Tiker to generate one.</div>';
      }
    } catch (e) {
      console.error('[Tiker] Briefing load failed:', e);
      if (!briefingContent.querySelector('.briefing-summary, .attention-item')) {
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
