// scraper.js — runs on 1001tracklists.com/tracklist/* pages
// Waits for track items to load, parses them, sends to background

(function () {
  function parseTracks() {
    const tracks = [];

    // Try multiple selectors - 1001tracklists uses different class names
    const selectors = [
      '.tlpItem',
      '.bItm',
      '[id^="tlp"]',
      'div[id^="tlp"]',
      'tr[id^="tlp"]'
    ];

    let rows = [];
    for (const sel of selectors) {
      rows = document.querySelectorAll(sel);
      if (rows.length > 0) break;
    }

    console.log('[YT-Tracklists] Found', rows.length, 'track rows');

    rows.forEach((row) => {
      // Try multiple selectors for track name
      const trackEl =
        row.querySelector('.trackValue') ||
        row.querySelector('.trackFormat') ||
        row.querySelector('[class*="track"]') ||
        row.querySelector('span > a'); // fallback: linked track name

      const trackText = trackEl ? trackEl.textContent.trim() : '';
      if (!trackText) return;

      let artist = '';
      let title = trackText;
      const dashIndex = trackText.indexOf(' - ');
      if (dashIndex > -1) {
        artist = trackText.substring(0, dashIndex).trim();
        title = trackText.substring(dashIndex + 3).trim();
      }

      const cueEl =
        row.querySelector('.cueValueField') ||
        row.querySelector('.cueVal') ||
        row.querySelector('.cueI') ||
        row.querySelector('.time') ||
        row.querySelector('[class*="cue"]');
      const timestamp = cueEl ? cueEl.textContent.trim() : '';

      const numberEl = row.querySelector('[id$="_tracknumber_value"]');
      const number = numberEl ? numberEl.textContent.trim() : String(tracks.length + 1);

      tracks.push({ number, artist, title, timestamp, raw: trackText });
    });

    return tracks;
  }

  function tryScrape(attempts) {
    const tracks = parseTracks();
    if (tracks.length > 0) {
      chrome.runtime.sendMessage({ type: 'TRACKLIST_SCRAPED', tracks });
      return;
    }
    if (attempts > 0) {
      setTimeout(() => tryScrape(attempts - 1), 1000);
    } else {
      chrome.runtime.sendMessage({ type: 'TRACKLIST_SCRAPED', tracks: [] });
    }
  }

  // Wait for dynamic content to load, retry up to 15 times (15 seconds)
  tryScrape(15);
})();
