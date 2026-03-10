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

  // Check auth (with timeout in case service worker is slow to wake)
  let authResult;
  try {
    authResult = await Promise.race([
      sendMessage({ type: 'checkAuth' }),
      new Promise((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
  } catch (e) {
    console.error('[Tiker Popup] Auth check failed:', e);
    authResult = null;
  }

  loadingEl.classList.add('hidden');

  if (!authResult?.authenticated) {
    authEl.classList.remove('hidden');
    return;
  }

  mainEl.classList.remove('hidden');

  // Set greeting
  const user = authResult.user;
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  greetingEl.textContent = user?.first_name
    ? `${timeGreeting}, ${user.first_name}`
    : timeGreeting;

  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  taskDate.value = '';
  taskDate.min = today;

  // Load briefing
  loadBriefing();

  // Task form submission
  taskSubmit.addEventListener('click', submitTask);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitTask();
  });

  async function submitTask() {
    const title = taskInput.value.trim();
    if (!title) {
      taskInput.focus();
      return;
    }

    taskSubmit.disabled = true;
    taskSubmit.textContent = '...';

    const result = await sendMessage({
      type: 'createTask',
      data: {
        title,
        dueDate: taskDate.value || null,
      },
    });

    taskSubmit.disabled = false;
    taskSubmit.textContent = 'Add';

    if (result?.success) {
      taskInput.value = '';
      taskDate.value = '';
      taskSuccess.classList.remove('hidden');
      setTimeout(() => taskSuccess.classList.add('hidden'), 2000);
    } else {
      alert('Failed to add task: ' + (result?.error || 'Unknown error'));
    }
  }

  async function loadBriefing() {
    const result = await sendMessage({ type: 'getBriefing' });
    const briefing = result?.briefing;

    if (!briefing) {
      briefingContent.innerHTML = '<div class="empty-state">No briefing yet. Open Tiker to generate one.</div>';
      return;
    }

    let html = '';

    // Summary
    const sections = typeof briefing.sections === 'string'
      ? tryParse(briefing.sections)
      : briefing.sections;

    const summary = sections?.summary || briefing.summary;
    if (summary && typeof summary === 'string' && !summary.startsWith('{')) {
      html += `<div class="briefing-summary">${escapeHtml(summary)}</div>`;
    }

    // Attention items
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

function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, resolve);
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
