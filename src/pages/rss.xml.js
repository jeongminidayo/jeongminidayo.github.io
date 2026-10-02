import rss from '@astrojs/rss';
import { getAbout, getPosts, siteDescription } from '../lib/data';

export async function GET(context) {
  const about = getAbout();
  const posts = await getPosts();
  return rss({
    title: about.name,
    description: siteDescription(about),
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.summary,
      categories: post.data.kind ? [post.data.kind] : [],
      link: `/posts/${post.data.slug}/`,
    })),
    customData: '<language>ko-KR</language>',
  });
}
