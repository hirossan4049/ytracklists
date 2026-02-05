import type { SearchResult, Track } from './types';
import { escapeHtml, parseTimestamp } from './dom';

export function renderLoadingHtml(): string {
  return `
    <div class="ytl-header">
      <span class="ytl-title">1001Tracklists</span>
      <button class="ytl-close" title="Close">&times;</button>
    </div>
    <div class="ytl-loading">Loading tracklist...</div>
  `;
}

export function renderErrorHtml(message: string): string {
  return `
    <div class="ytl-header">
      <span class="ytl-title">1001Tracklists</span>
      <button class="ytl-close" title="Close">&times;</button>
    </div>
    <div class="ytl-loading">${escapeHtml(message)}</div>
  `;
}

export function renderResultsHtml(results: SearchResult[]): string {
  const items = results.map((r, i) => `
    <div class="ytl-result" data-index="${i}">
      <span class="ytl-result-name">${escapeHtml(r.name)}</span>
    </div>
  `).join('');

  return `
    <div class="ytl-header">
      <span class="ytl-title">1001Tracklists</span>
      <button class="ytl-close" title="Close">&times;</button>
    </div>
    <div class="ytl-results-label">Select a tracklist:</div>
    <div class="ytl-results">${items}</div>
  `;
}

export function renderTracklistHtml(data: { name: string; tracks: Track[]; url: string }): string {
  const trackRows = data.tracks.map(t => {
    const seconds = parseTimestamp(t.timestamp);
    const hasTime = seconds !== null;
    const timeClass = hasTime ? 'ytl-track-time ytl-track-time-link' : 'ytl-track-time';
    return `
    <div class="ytl-track">
      <span class="ytl-track-num">${escapeHtml(t.number)}</span>
      <span class="${timeClass}"${hasTime ? ` data-seconds="${seconds}"` : ''}>${escapeHtml(t.timestamp)}</span>
      <span class="ytl-track-info">
        <span class="ytl-track-artist">${escapeHtml(t.artist)}</span>${t.artist && t.title ? ' - ' : ''}<span class="ytl-track-title">${escapeHtml(t.title)}</span>
      </span>
    </div>
  `;
  }).join('');

  return `
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
}
