// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://minglemin01.com',
  trailingSlash: 'always',
  // 관리자 화면, 블로그에서 가져온 사본 글(/posts/blog-…)은 검색엔진에 알리지 않는다
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') && !page.includes('/posts/blog-') })],
});
