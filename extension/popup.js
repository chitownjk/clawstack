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
  const contextSearchBtn = document.getElementById('context-search');
  const contextDismissBtn = document.getElementById('context-dismiss');
  const noContext = document.getElementById('no-context');
  const aiToggle = document.getElementById('ai-toggle');
  const aiToggleLabel = document.getElementById('ai-toggle-label');
  const agentJobCard = document.getElementById('agent-job-card');
  const jobSearching = document.getElementById('job-searching');
  const jobOptions = document.getElementById('job-options');
  const jobFailed = document.getElementById('job-failed');
  const jobOptionsTitle = document.getElementById('job-options-title');
  const flightOptionsList = document.getElementById('flight-options-list');
  const jobSearchDetail = document.getElementById('job-search-detail');
  const jobErrorMsg = document.getElementById('job-error-msg');
  const jobRetryBtn = document.getElementById('job-retry');

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

  // Check for active agent job first, then context
  let activeTabId = null;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    activeTabId = tab?.id;
  } catch {}

  let agentJob = null;
  if (activeTabId) {
    agentJob = await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'getAgentJob', tabId: activeTabId }, resolve);
    });
  }

  if (agentJob) {
    showAgentJob(agentJob);
  } else if (currentContext?.classification) {
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

    // Show "Find me a deal" button for flights
    if (suggestion.canSearchFlights) {
      contextSearchBtn.classList.remove('hidden');
      contextSearchBtn.onclick = () => startFlightSearch(ctx);
    } else {
      contextSearchBtn.classList.add('hidden');
    }

    // "Add to Tiker" creates a task
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

  // ---- Agent Job: Flight Search ----

  async function startFlightSearch(ctx) {
    const { suggestion } = ctx;
    if (!suggestion.flightParams) return;

    // Hide context card, show agent job card in searching state
    contextCard.classList.add('hidden');
    agentJobCard.classList.remove('hidden');
    jobSearching.classList.remove('hidden');
    jobOptions.classList.add('hidden');
    jobFailed.classList.add('hidden');
    jobSearchDetail.textContent = `Searching ${suggestion.flightParams.origin} to ${suggestion.flightParams.destination}...`;

    // Tell background to start the search
    const result = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'startAgentJob',
        originTabId: activeTabId,
        flightParams: suggestion.flightParams,
        sourceUrl: ctx.context?.url || '',
      }, resolve);
    });

    if (result?.error) {
      showJobFailed(result.error);
      return;
    }

    // Poll for results
    pollForResults(activeTabId);
  }

  function pollForResults(tabId) {
    let attempts = 0;
    const maxAttempts = 20; // 40 seconds total

    const interval = setInterval(async () => {
      attempts++;
      const job = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'getAgentJob', tabId }, resolve);
      });

      if (!job) {
        clearInterval(interval);
        showJobFailed('Search lost');
        return;
      }

      if (job.status === 'options_ready' && job.options?.length > 0) {
        clearInterval(interval);
        showJobOptions(job);
        return;
      }

      if (job.status === 'failed') {
        clearInterval(interval);
        showJobFailed(job.error || 'Search failed');
        return;
      }

      // Update searching text
      const dots = '.'.repeat((attempts % 3) + 1);
      jobSearchDetail.textContent = `Comparing prices across all airlines${dots}`;

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        showJobFailed('Search timed out. Try again?');
      }
    }, 2000);
  }

  function showAgentJob(job) {
    agentJobCard.classList.remove('hidden');
    noContext.classList.add('hidden');
    contextCard.classList.add('hidden');

    if (job.status === 'searching') {
      jobSearching.classList.remove('hidden');
      jobOptions.classList.add('hidden');
      jobFailed.classList.add('hidden');
      pollForResults(activeTabId);
    } else if (job.status === 'options_ready' && job.options?.length > 0) {
      showJobOptions(job);
    } else if (job.status === 'failed') {
      showJobFailed(job.error || 'Search failed');
    }
  }

  function showJobOptions(job) {
    jobSearching.classList.add('hidden');
    jobFailed.classList.add('hidden');
    jobOptions.classList.remove('hidden');

    const options = job.options || [];
    jobOptionsTitle.textContent = `${options.length} flight${options.length !== 1 ? 's' : ''} found`;

    flightOptionsList.innerHTML = '';
    options.forEach((opt, i) => {
      const data = opt.option_data || {};
      const price = opt.price_cents ? `$${(opt.price_cents / 100).toFixed(0)}` : '';
      const badge = i === 0 ? opt.ranking_reason || 'cheapest' : (opt.ranking_reason || '');

      const card = document.createElement('div');
      card.className = 'flight-card';
      card.innerHTML = `
        <div class="flight-card-top">
          <span class="flight-airline">${escapeHtml(data.airline || opt.provider || 'Unknown')}</span>
          <span class="flight-price">${price}</span>
        </div>
        <div class="flight-card-bottom">
          <span class="flight-times">${escapeHtml(data.depart_time || '')} - ${escapeHtml(data.arrive_time || '')} ${data.duration ? '(' + data.duration + ')' : ''}</span>
          <span class="flight-stops">${escapeHtml(data.stops || '')}</span>
        </div>
        ${badge ? `<span class="flight-badge">${escapeHtml(badge)}</span>` : ''}
      `;

      card.addEventListener('click', () => {
        // Open booking URL if available
        const bookingUrl = opt.booking_url;
        if (bookingUrl) {
          chrome.tabs.create({ url: bookingUrl });
        }
        // Also create a tracking task
        bgFetch('/api/command/tasks/create', {
          method: 'POST',
          body: JSON.stringify({
            title: `Book flight: ${data.airline || opt.provider} ${data.depart_time || ''} - ${price}`,
            description: `${opt.display_summary || ''}\nBooking: ${bookingUrl || 'See extension'}`,
            tags: ['extension', 'flight', 'agent-booked'],
            priority: 'high',
          }),
        }).catch(() => {});
      });

      flightOptionsList.appendChild(card);
    });
  }

  function showJobFailed(errorMsg) {
    jobSearching.classList.add('hidden');
    jobOptions.classList.add('hidden');
    jobFailed.classList.remove('hidden');
    jobErrorMsg.textContent = errorMsg || 'Could not find flights';
  }

  if (jobRetryBtn) {
    jobRetryBtn.addEventListener('click', () => {
      // Re-check context and try again
      if (currentContext?.suggestion?.canSearchFlights) {
        startFlightSearch(currentContext);
      }
    });
  }

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
