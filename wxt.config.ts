import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'YouTube Tracklists',
    description: 'Find and display 1001tracklists data on YouTube DJ set videos',
    permissions: ['tabs'],
    host_permissions: ['https://www.1001tracklists.com/*', 'https://1001.tl/*'],
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
  },
});
