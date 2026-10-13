import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// content/ 안의 파일은 scripts/export.mjs가 세컨브레인 6_발행에서 옮겨 온 것이다. 직접 고치지 않는다.
const byFileName = ({ entry }: { entry: string }) => entry.replace(/\.md$/, '');

const posts = defineCollection({
  loader: glob({ base: './content/posts', pattern: '*.md', generateId: byFileName }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    kind: z.string().optional().default(''),
    summary: z.string().optional().default(''),
    slug: z.string(),
    // 네이버 블로그에서 가져온 글이면 원문 주소. 있으면 글 아래 원문 링크가 붙고 검색엔진에 사본을 알리지 않는다.
    source: z.string().optional().default(''),
  }),
});

const listed = z.object({
  title: z.string(),
  date: z.coerce.date(),
  desc: z.string().optional().default(''),
  link: z.string().optional().default(''),
  slug: z.string(),
});

const files = defineCollection({
  loader: glob({ base: './content/files', pattern: '*.md', generateId: byFileName }),
  schema: listed,
});

const works = defineCollection({
  loader: glob({ base: './content/works', pattern: '*.md', generateId: byFileName }),
  schema: listed,
});

export const collections = { posts, files, works };
