let currentVideoId = null;
let panelElement = null;

handlePageChange();
document.addEventListener('yt-navigate-finish', handlePageChange);

function handlePageChange() {
  const videoId = getVideoId();
  if (!videoId || videoId === currentVideoId) return;

  currentVideoId = videoId;
  removePanel();

  waitForElement('#above-the-fold #title h1 yt-formatted-string', 3000)
    .then(titleEl => {
      const title = titleEl.textContent.trim();
      if (!title) return;

      const query = cleanTitle(title);
      showPanel('loading');
      return searchAndDisplay(query);
    })
    .catch(() => {});
}

function getVideoId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

function cleanTitle(title) {
  return title
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/official\s*(video|audio|music\s*video)/gi, '')
    .replace(/\|/g, ' ')
    .replace(/full\s*set/gi, '')
    .replace(/live\s*set/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function searchAndDisplay(query) {
  try {
    const searchResponse = await chrome.runtime.sendMessage({
      type: 'SEARCH_TRACKLIST',
      query
    });

    if (!searchResponse.success || !searchResponse.results || !searchResponse.results.length) {
      removePanel();
      return;
    }

    const results = searchResponse.results;

    if (results.length === 1) {
      await fetchAndShowTracklist(results[0]);
    } else {
      showPanel('results', results);
    }
  } catch (err) {
    removePanel();
  }
}

async function fetchAndShowTracklist(result) {
  showPanel('loading');

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FETCH_TRACKLIST',
      url: result.url
    });

    if (!response.success || !response.tracks || !response.tracks.length) {
      removePanel();
      return;
    }

    showPanel('tracklist', { name: result.name, tracks: response.tracks, url: result.url });
  } catch (err) {
    removePanel();
  }
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timeout'));
    }, timeout);
  });
}

function ensurePanel() {
  if (panelElement && panelElement.parentNode) return;
  if (panelElement) panelElement.remove();

  panelElement = document.createElement('div');
  panelElement.id = 'yt-tracklist-panel';

  const secondary = document.querySelector('#secondary');
  if (secondary) {
    secondary.prepend(panelElement);
  }
}

function showPanel(state, data) {
  ensurePanel();

  switch (state) {
    case 'loading':
      panelElement.innerHTML = `
        <div class="ytl-header">
          <span class="ytl-title">1001Tracklists</span>
        </div>
        <div class="ytl-loading">Searching for tracklist...</div>
      `;
      break;

    case 'results': {
      const resultItems = data.map((r, i) => `
        <div class="ytl-result" data-index="${i}">
          <span class="ytl-result-name">${escapeHtml(r.name)}</span>
        </div>
      `).join('');

      panelElement.innerHTML = `
        <div class="ytl-header">
          <span class="ytl-title">1001Tracklists</span>
          <button class="ytl-close" title="Close">&times;</button>
        </div>
        <div class="ytl-results-label">Select a tracklist:</div>
        <div class="ytl-results">${resultItems}</div>
      `;

      panelElement.querySelectorAll('.ytl-result').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt(el.dataset.index);
          fetchAndShowTracklist(data[index]);
        });
      });
      break;
    }

    case 'tracklist': {
      const trackRows = data.tracks.map(t => `
        <div class="ytl-track">
          <span class="ytl-track-num">${escapeHtml(t.number)}</span>
          <span class="ytl-track-time">${escapeHtml(t.timestamp)}</span>
          <span class="ytl-track-info">
            <span class="ytl-track-artist">${escapeHtml(t.artist)}</span>${t.artist && t.title ? ' - ' : ''}<span class="ytl-track-title">${escapeHtml(t.title)}</span>
          </span>
        </div>
      `).join('');

      panelElement.innerHTML = `
        <div class="ytl-header">
          <span class="ytl-title">1001Tracklists</span>
          <a class="ytl-link" href="${escapeHtml(data.url)}" target="_blank" rel="noopener">
            Open on 1001Tracklists
          </a>
          <button class="ytl-close" title="Close">&times;</button>
        </div>
        <div class="ytl-name">${escapeHtml(data.name)}</div>
        <div class="ytl-tracks">${trackRows}</div>
      `;
      break;
    }
  }

  const closeBtn = panelElement.querySelector('.ytl-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', removePanel);
  }
}

function removePanel() {
  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
