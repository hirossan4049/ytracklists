// Pending tracklist requests: tabId -> { resolve, reject }
const pendingRequests = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SEARCH_TRACKLIST') {
    searchTracklists(message.query)
      .then(results => sendResponse({ success: true, results }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'FETCH_TRACKLIST') {
    fetchTracklist(message.url)
      .then(tracks => sendResponse({ success: true, tracks }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Receive scraped data from scraper.js running on 1001tracklists tab
  if (message.type === 'TRACKLIST_SCRAPED' && sender.tab) {
    const tabId = sender.tab.id;
    const pending = pendingRequests.get(tabId);
    if (pending) {
      pendingRequests.delete(tabId);
      pending.resolve(message.tracks);
    }
    // Close the scraper tab
    chrome.tabs.remove(tabId).catch(() => {});
  }
});

async function searchTracklists(query) {
  const url = 'https://www.1001tracklists.com/ajax/search_tracklist.php'
    + '?p=' + encodeURIComponent(query)
    + '&noIDFieldCheck=true&fixedMode=true&sf=p';

  const response = await fetch(url, {
    headers: {
      'Referer': 'https://www.1001tracklists.com/'
    }
  });

  if (!response.ok) throw new Error(`Search failed: ${response.status}`);

  const json = await response.json();
  if (!json.success || !json.data || json.data.length === 0) {
    throw new Error('No results');
  }

  return json.data.slice(0, 5).map(item => {
    const p = item.properties || item;
    const slug = (p.url_name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return {
      id: p.id_tracklist,
      uniqueId: p.id_unique,
      name: p.tracklistname,
      url: `https://www.1001tracklists.com/tracklist/${p.id_unique}/${slug}.html`
    };
  });
}

async function fetchTracklist(tracklistUrl) {
  return new Promise((resolve, reject) => {
    // Open the tracklist page in a background tab
    chrome.tabs.create({ url: tracklistUrl, active: false }, (tab) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      pendingRequests.set(tab.id, { resolve, reject });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.has(tab.id)) {
          pendingRequests.delete(tab.id);
          chrome.tabs.remove(tab.id).catch(() => {});
          reject(new Error('Scrape timeout'));
        }
      }, 30000);
    });
  });
}
