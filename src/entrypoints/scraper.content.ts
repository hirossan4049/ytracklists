import { defineContentScript } from 'wxt/sandbox';
import type { Track } from '~/utils/types';
import { sendScrapedMessage } from '~/utils/messages';

export default defineContentScript({
  matches: ['https://www.1001tracklists.com/tracklist/*'],
  runAt: 'document_idle',

  main() {
    function parseTracks(): Track[] {
      const tracks: Track[] = [];

      const selectors = [
        '.tlpItem',
        '.bItm',
        '[id^="tlp"]',
        'div[id^="tlp"]',
        'tr[id^="tlp"]',
      ];

      let rows: NodeListOf<Element> = document.querySelectorAll('.__none__');
      for (const sel of selectors) {
        rows = document.querySelectorAll(sel);
        if (rows.length > 0) break;
      }

      console.log('[YT-Tracklists] Found', rows.length, 'track rows');

      rows.forEach((row) => {
        const trackEl =
          row.querySelector('.trackValue') ||
          row.querySelector('.trackFormat') ||
          row.querySelector('[class*="track"]') ||
          row.querySelector('span > a');

        const trackText = trackEl ? trackEl.textContent!.trim() : '';
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
        const timestamp = cueEl ? cueEl.textContent!.trim() : '';

        const numberEl = row.querySelector('[id$="_tracknumber_value"]');
        const number = numberEl ? numberEl.textContent!.trim() : String(tracks.length + 1);

        tracks.push({ number, artist, title, timestamp, raw: trackText });
      });

      return tracks;
    }

    function tryScrape(attempts: number): void {
      const tracks = parseTracks();
      if (tracks.length > 0) {
        sendScrapedMessage(tracks);
        return;
      }
      if (attempts > 0) {
        setTimeout(() => tryScrape(attempts - 1), 1000);
      } else {
        sendScrapedMessage([]);
      }
    }

    tryScrape(15);
  },
});
