import type { SearchResult, TracklistState } from './types';
import { sendFetchMessage } from './messages';
import { waitForElement, seekTo } from './dom';
import { renderLoadingHtml, renderErrorHtml, renderResultsHtml, renderTracklistHtml } from './html';
import { getVideoId, cleanTitle, findDescriptionUrl, searchForTracklist } from './search';

let currentVideoId: string | null = null;
let panelElement: HTMLElement | null = null;
let buttonElement: HTMLElement | null = null;
let tracklistData: TracklistState | null = null;
let panelVisible = false;

export function handlePageChange(): void {
  const videoId = getVideoId();
  console.log('[YT-Tracklists] handlePageChange, videoId:', videoId, 'current:', currentVideoId);
  if (!videoId || videoId === currentVideoId) return;

  currentVideoId = videoId;
  removePanel();
  removeButton();
  tracklistData = null;
  panelVisible = false;

  findDescriptionUrl().then(state => {
    console.log('[YT-Tracklists] descriptionUrl result:', state);
    if (state) {
      tracklistData = state;
      injectButton();
      return;
    }

    waitForElement('#above-the-fold #title h1 yt-formatted-string', 3000)
      .then(titleEl => {
        const title = (titleEl as HTMLElement).textContent?.trim();
        if (!title) return;

        const query = cleanTitle(title);
        console.log('[YT-Tracklists] searching:', query);
        return searchForTracklist(query).then(results => {
          console.log('[YT-Tracklists] search results:', results);
          if (results) {
            tracklistData = { results, selected: null, tracks: null, name: null, url: null };
            injectButton();
          }
        });
      })
      .catch(err => console.log('[YT-Tracklists] title search error:', err));
  });
}

function injectButton(): void {
  removeButton();

  waitForElement('#owner', 3000).then(owner => {
    buttonElement = document.createElement('button');
    buttonElement.id = 'ytl-btn';
    buttonElement.textContent = '1001';
    buttonElement.title = 'Show tracklist from 1001Tracklists';
    buttonElement.addEventListener('click', togglePanel);
    owner.appendChild(buttonElement);
  }).catch(() => {});
}

function removeButton(): void {
  if (buttonElement) {
    buttonElement.remove();
    buttonElement = null;
  }
}

function togglePanel(): void {
  console.log('[YT-Tracklists] togglePanel, visible:', panelVisible, 'data:', tracklistData);
  if (panelVisible) {
    removePanel();
    panelVisible = false;
    return;
  }

  panelVisible = true;

  if (!tracklistData) {
    console.log('[YT-Tracklists] no tracklistData!');
    return;
  }

  if (tracklistData.tracks) {
    showPanel('tracklist', { name: tracklistData.name!, tracks: tracklistData.tracks, url: tracklistData.url! });
  } else if (tracklistData.results.length === 1) {
    console.log('[YT-Tracklists] fetching single result:', tracklistData.results[0]);
    fetchAndShowTracklist(tracklistData.results[0]);
  } else {
    showPanel('results', tracklistData.results);
  }
}

async function fetchAndShowTracklist(result: SearchResult): Promise<void> {
  console.log('[YT-Tracklists] fetchAndShowTracklist:', result.url);
  showPanel('loading');

  try {
    const response = await sendFetchMessage(result.url);
    console.log('[YT-Tracklists] fetchResponse:', response);

    if (!response.success || !response.tracks || !response.tracks.length) {
      showPanel('error', 'Could not load tracklist');
      return;
    }

    if (tracklistData) {
      tracklistData.selected = result;
      tracklistData.tracks = response.tracks;
      tracklistData.name = result.name;
      tracklistData.url = result.url;
    }

    showPanel('tracklist', { name: result.name, tracks: response.tracks, url: result.url });
  } catch (err) {
    showPanel('error', (err as Error).message);
  }
}

function ensurePanel(): void {
  if (panelElement && panelElement.parentNode) return;
  if (panelElement) panelElement.remove();

  panelElement = document.createElement('div');
  panelElement.id = 'yt-tracklist-panel';

  const secondary = document.querySelector('#secondary');
  console.log('[YT-Tracklists] ensurePanel, #secondary:', secondary);
  if (secondary) {
    secondary.prepend(panelElement);
  } else {
    console.log('[YT-Tracklists] #secondary not found!');
  }
}

type PanelData =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'results'; results: SearchResult[] }
  | { state: 'tracklist'; data: { name: string; tracks: import('./types').Track[]; url: string } };

function showPanel(state: 'loading'): void;
function showPanel(state: 'error', message: string): void;
function showPanel(state: 'results', results: SearchResult[]): void;
function showPanel(state: 'tracklist', data: { name: string; tracks: import('./types').Track[]; url: string }): void;
function showPanel(state: string, data?: unknown): void {
  ensurePanel();
  if (!panelElement) return;

  switch (state) {
    case 'loading':
      panelElement.innerHTML = renderLoadingHtml();
      break;

    case 'error':
      panelElement.innerHTML = renderErrorHtml(data as string);
      break;

    case 'results': {
      const results = data as SearchResult[];
      panelElement.innerHTML = renderResultsHtml(results);

      panelElement.querySelectorAll('.ytl-result').forEach(el => {
        el.addEventListener('click', () => {
          const index = parseInt((el as HTMLElement).dataset.index!);
          fetchAndShowTracklist(results[index]);
        });
      });
      break;
    }

    case 'tracklist': {
      const tData = data as { name: string; tracks: import('./types').Track[]; url: string };
      panelElement.innerHTML = renderTracklistHtml(tData);

      panelElement.querySelectorAll('.ytl-track-time-link').forEach(el => {
        el.addEventListener('click', () => {
          const seconds = parseInt((el as HTMLElement).dataset.seconds!);
          seekTo(seconds);
        });
      });
      break;
    }
  }

  const closeBtn = panelElement.querySelector('.ytl-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      removePanel();
      panelVisible = false;
    });
  }
}

function removePanel(): void {
  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }
}
