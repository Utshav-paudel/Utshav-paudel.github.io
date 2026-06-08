import { defineCollection, z } from "astro:content";

// Local MDX blog. Each post is a `.mdx` (or `.md`) file under src/content/blog/,
// where the filename becomes the URL slug (/blog/<filename>/). Replaces the old
// build-time Hashnode GraphQL fetch (its free API was retired 2026-05-13).
const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    /** One-line summary shown in listings, meta description, and RSS. */
    brief: z.string().default(""),
    /** Publish date — accepts YYYY-MM-DD or any Date-parseable string. */
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** Optional cover image URL (absolute, or a path under /public). */
    coverImage: z.string().optional(),
    /** Set true to keep a post out of the build. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
