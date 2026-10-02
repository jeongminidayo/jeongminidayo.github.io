// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://minglemin01.com',
  trailingSlash: 'always',
  // 관리자 화면은 검색엔진에 알리지 않는다
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
});
