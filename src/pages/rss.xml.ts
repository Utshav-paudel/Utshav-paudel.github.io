import rss from "@astrojs/rss";
import { listPosts } from "../lib/hashnode.ts";
import { site } from "../data/site.ts";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await listPosts();
  return rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    items: posts.map((post) => ({
      title: post.title,
      description: post.brief,
      pubDate: new Date(post.publishedAt),
      link: `/blog/${post.slug}/`,
      categories: post.tags.map((t) => t.slug),
    })),
  });
}
