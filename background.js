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

  return json.data.slice(0, 5).map(item => ({
    id: item.id_tracklist,
    uniqueId: item.id_unique,
    name: item.tracklistname,
    url: `https://www.1001tracklists.com/tracklist/${item.id_unique}/${item.url_name}.html`
  }));
}

async function fetchTracklist(tracklistUrl) {
  const response = await fetch(tracklistUrl, {
    headers: {
      'Referer': 'https://www.1001tracklists.com/'
    }
  });

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const html = await response.text();
  return parseTracklistHTML(html);
}

function parseTracklistHTML(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const tracks = [];
  const trackRows = doc.querySelectorAll('.tlpItem');

  trackRows.forEach((row, index) => {
    const trackValueEl = row.querySelector('.trackValue');
    const trackText = trackValueEl ? trackValueEl.textContent.trim() : '';

    let artist = '';
    let title = trackText;
    const dashIndex = trackText.indexOf(' - ');
    if (dashIndex > -1) {
      artist = trackText.substring(0, dashIndex).trim();
      title = trackText.substring(dashIndex + 3).trim();
    }

    const cueEl = row.querySelector('.cueValueField');
    const timestamp = cueEl ? cueEl.textContent.trim() : '';

    const numberEl = row.querySelector('[id$="_tracknumber_value"]');
    const number = numberEl ? numberEl.textContent.trim() : String(index + 1);

    if (trackText) {
      tracks.push({ number, artist, title, timestamp, raw: trackText });
    }
  });

  return tracks;
}
