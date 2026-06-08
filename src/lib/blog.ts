/**
 * Local blog backed by Astro content collections (src/content/blog/*.mdx).
 * Mirrors the small surface the pages used from the old Hashnode client so the
 * templates stay simple: a normalized `PostMeta` for listings, plus raw entries
 * for rendering a post body.
 */
import { getCollection, type CollectionEntry } from "astro:content";

export type BlogEntry = CollectionEntry<"blog">;

export type PostMeta = {
  slug: string;
  title: string;
  brief: string;
  /** YYYY-MM-DD, for display. */
  date: string;
  /** Full ISO timestamp, for <time datetime> and RSS. */
  isoDate: string;
  publishedAt: Date;
  tags: string[];
  coverImage?: string;
  readTimeInMinutes: number;
};

/** Estimate reading time from raw markdown at ~200 words/min. */
function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function toMeta(entry: BlogEntry): PostMeta {
  const d = entry.data.publishedAt;
  return {
    slug: entry.slug,
    title: entry.data.title,
    brief: entry.data.brief ?? "",
    date: d.toISOString().slice(0, 10),
    isoDate: d.toISOString(),
    publishedAt: d,
    tags: entry.data.tags ?? [],
    coverImage: entry.data.coverImage,
    readTimeInMinutes: readingTime(entry.body),
  };
}

/** Published entries, newest first. */
export async function listEntries(): Promise<BlogEntry[]> {
  const entries = await getCollection("blog", ({ data }) => !data.draft);
  return entries.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );
}

/** Normalized post metadata, newest first. */
export async function listPosts(limit?: number): Promise<PostMeta[]> {
  const metas = (await listEntries()).map(toMeta);
  return typeof limit === "number" ? metas.slice(0, limit) : metas;
}
