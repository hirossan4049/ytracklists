import './style.css';
import { defineContentScript } from 'wxt/sandbox';
import { handlePageChange } from '~/utils/panel';

export default defineContentScript({
  matches: ['https://www.youtube.com/*'],
  runAt: 'document_idle',

  main() {
    handlePageChange();
    document.addEventListener('yt-navigate-finish', handlePageChange);
  },
});
