import type { SearchResult, TracklistState } from './types';
import { sendSearchMessage } from './messages';
import { waitForElement } from './dom';

export function getVideoId(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('v');
}

export function cleanTitle(title: string): string {
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

export function extractTracklistName(url: string): string {
  try {
    const path = new URL(url).pathname;
    const parts = path.split('/');
    const slug = parts[parts.length - 1] || parts[parts.length - 2] || '';
    return slug
      .replace(/\.html$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return 'Tracklist';
  }
}

export async function findDescriptionUrl(): Promise<TracklistState | null> {
  try {
    const descEl = await waitForElement(
      'ytd-watch-metadata #description-inner, ytd-video-secondary-info-renderer #description, #meta #description',
      3000
    );

    const links = descEl.querySelectorAll('a[href*="1001tracklists.com/tracklist/"]');
    if (links.length > 0) {
      const url = (links[0] as HTMLAnchorElement).href;
      const name = extractTracklistName(url);
      return { results: [{ name, url }], selected: null, tracks: null, name: null, url: null };
    }

    const text = descEl.textContent || '';
    const match = text.match(/https?:\/\/(?:www\.)?1001tracklists\.com\/tracklist\/[^\s)}\]]+/);
    if (match) {
      const url = match[0];
      const name = extractTracklistName(url);
      return { results: [{ name, url }], selected: null, tracks: null, name: null, url: null };
    }
  } catch {
    // Description not found
  }
  return null;
}

export async function searchForTracklist(query: string): Promise<SearchResult[] | null> {
  try {
    const response = await sendSearchMessage(query);
    if (!response.success || !response.results || !response.results.length) {
      return null;
    }
    return response.results;
  } catch {
    return null;
  }
}
