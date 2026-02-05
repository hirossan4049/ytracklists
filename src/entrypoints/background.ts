import { defineBackground } from 'wxt/sandbox';
import type { Track, ApiSearchResponse } from '~/utils/types';
import { MSG } from '~/utils/messages';

export default defineBackground({
  main() {
    const pendingRequests = new Map<number, {
      resolve: (tracks: Track[]) => void;
      reject: (error: Error) => void;
    }>();

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === MSG.SEARCH_TRACKLIST) {
        searchTracklists(message.query)
          .then(results => sendResponse({ success: true, results }))
          .catch(err => sendResponse({ success: false, error: (err as Error).message }));
        return true;
      }

      if (message.type === MSG.FETCH_TRACKLIST) {
        resolveShortUrl(message.url)
          .then(url => fetchTracklist(url, pendingRequests))
          .then(tracks => sendResponse({ success: true, tracks }))
          .catch(err => sendResponse({ success: false, error: (err as Error).message }));
        return true;
      }

      if (message.type === MSG.TRACKLIST_SCRAPED && sender.tab?.id) {
        const tabId = sender.tab.id;
        const pending = pendingRequests.get(tabId);
        if (pending) {
          pendingRequests.delete(tabId);
          pending.resolve(message.tracks);
        }
        browser.tabs.remove(tabId).catch(() => {});
      }
    });
  },
});

async function resolveShortUrl(url: string): Promise<string> {
  if (!url.includes('1001.tl/')) return url;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return response.url;
  } catch {
    return url;
  }
}

async function searchTracklists(query: string) {
  const url = 'https://www.1001tracklists.com/ajax/search_tracklist.php'
    + '?p=' + encodeURIComponent(query)
    + '&noIDFieldCheck=true&fixedMode=true&sf=p';

  const response = await fetch(url, {
    headers: {
      'Referer': 'https://www.1001tracklists.com/',
    },
  });

  if (!response.ok) throw new Error(`Search failed: ${response.status}`);

  const json: ApiSearchResponse = await response.json();
  if (!json.success || !json.data || json.data.length === 0) {
    throw new Error('No results');
  }

  return json.data.slice(0, 5).map(item => {
    const p = item.properties || item;
    const slug = ((p as any).url_name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return {
      id: (p as any).id_tracklist,
      uniqueId: (p as any).id_unique,
      name: (p as any).tracklistname,
      url: `https://www.1001tracklists.com/tracklist/${(p as any).id_unique}/${slug}.html`,
    };
  });
}

async function fetchTracklist(
  tracklistUrl: string,
  pendingRequests: Map<number, { resolve: (tracks: Track[]) => void; reject: (error: Error) => void }>
): Promise<Track[]> {
  return new Promise((resolve, reject) => {
    browser.tabs.create({ url: tracklistUrl, active: false }).then(tab => {
      if (!tab.id) {
        reject(new Error('Failed to create tab'));
        return;
      }

      pendingRequests.set(tab.id, { resolve, reject });

      setTimeout(() => {
        if (tab.id && pendingRequests.has(tab.id)) {
          pendingRequests.delete(tab.id);
          browser.tabs.remove(tab.id).catch(() => {});
          reject(new Error('Scrape timeout'));
        }
      }, 30000);
    }).catch(err => reject(err));
  });
}
