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
