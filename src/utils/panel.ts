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
  if (!videoId || videoId === currentVideoId) return;

  currentVideoId = videoId;
  removePanel();
  removeButton();
  tracklistData = null;
  panelVisible = false;

  injectButton();
}

function injectButton(): void {
  removeButton();

  waitForElement('#owner', 5000).then(owner => {
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

async function togglePanel(): Promise<void> {
  if (panelVisible) {
    removePanel();
    panelVisible = false;
    return;
  }

  panelVisible = true;

  // Already have tracks cached — show immediately
  if (tracklistData?.tracks) {
    showPanel('tracklist', { name: tracklistData.name!, tracks: tracklistData.tracks, url: tracklistData.url! });
    return;
  }

  // Already have search results cached — show list or fetch single
  if (tracklistData?.results) {
    if (tracklistData.results.length === 1) {
      fetchAndShowTracklist(tracklistData.results[0]);
    } else {
      showPanel('results', tracklistData.results);
    }
    return;
  }

  // First click — search from scratch
  showPanel('loading');
  await searchAndShow();
}

async function searchAndShow(): Promise<void> {
  // 1. Check description for 1001tracklists URL
  const descState = await findDescriptionUrl();
  if (descState) {
    tracklistData = descState;
    fetchAndShowTracklist(descState.results[0]);
    return;
  }

  // 2. Fall back to title search
  try {
    const titleEl = await waitForElement('#above-the-fold #title h1 yt-formatted-string', 3000);
    const title = (titleEl as HTMLElement).textContent?.trim();
    if (!title) {
      showPanel('error', 'Could not find video title');
      return;
    }

    const query = cleanTitle(title);
    const results = await searchForTracklist(query);
    if (!results || results.length === 0) {
      showPanel('error', 'No tracklist found');
      return;
    }

    tracklistData = { results, selected: null, tracks: null, name: null, url: null };

    if (results.length === 1) {
      fetchAndShowTracklist(results[0]);
    } else {
      showPanel('results', results);
    }
  } catch {
    showPanel('error', 'No tracklist found');
  }
}

async function fetchAndShowTracklist(result: SearchResult): Promise<void> {
  showPanel('loading');

  try {
    const response = await sendFetchMessage(result.url);

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
  if (secondary) {
    secondary.prepend(panelElement);
  }
}

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
