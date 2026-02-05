import type { SearchResponse, FetchResponse, Track } from './types';

export const MSG = {
  SEARCH_TRACKLIST: 'SEARCH_TRACKLIST',
  FETCH_TRACKLIST: 'FETCH_TRACKLIST',
  TRACKLIST_SCRAPED: 'TRACKLIST_SCRAPED',
} as const;

export async function sendSearchMessage(query: string): Promise<SearchResponse> {
  return browser.runtime.sendMessage({ type: MSG.SEARCH_TRACKLIST, query });
}

export async function sendFetchMessage(url: string): Promise<FetchResponse> {
  return browser.runtime.sendMessage({ type: MSG.FETCH_TRACKLIST, url });
}

export function sendScrapedMessage(tracks: Track[]): void {
  browser.runtime.sendMessage({ type: MSG.TRACKLIST_SCRAPED, tracks });
}
