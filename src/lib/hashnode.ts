/**
 * Hashnode GraphQL client. Fetches posts from a publication at build time so
 * Astro can render them as static pages. The site's blog is sourced entirely
 * from Hashnode — write a post in their editor, click publish, run a rebuild,
 * and it appears at /blog/<slug>.
 */

const HOST = "utshavpaudel.hashnode.dev";
const ENDPOINT = "https://gql.hashnode.com";

export type HashnodeTag = { name: string; slug: string };
export type HashnodeImage = { url: string };

export type HashnodePost = {
  id: string;
  slug: string;
  title: string;
  brief: string;
  publishedAt: string;
  updatedAt: string;
  readTimeInMinutes: number;
  tags: HashnodeTag[];
  coverImage: HashnodeImage | null;
  content: { html: string; markdown: string };
};

const POST_FIELDS = `
  id
  slug
  title
  brief
  publishedAt
  updatedAt
  readTimeInMinutes
  tags { name slug }
  coverImage { url }
  content { html markdown }
`;

async function query<T>(q: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (!res.ok || json.errors || !json.data) {
    throw new Error(
      `Hashnode query failed: ${JSON.stringify(json.errors ?? `HTTP ${res.status}`)}`,
    );
  }
  return json.data;
}

const cleanTitle = (t: string) => t.replace(/\s+/g, " ").trim();

export async function listPosts(limit = 50): Promise<HashnodePost[]> {
  try {
    const data = await query<{
      publication: { posts: { edges: { node: HashnodePost }[] } } | null;
    }>(
      `query Posts($host: String!, $first: Int!) {
        publication(host: $host) {
          posts(first: $first) { edges { node { ${POST_FIELDS} } } }
        }
      }`,
      { host: HOST, first: limit },
    );
    if (!data.publication) return [];
    return data.publication.posts.edges
      .map((e) => e.node)
      .map((p) => ({ ...p, title: cleanTitle(p.title) }))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  } catch (err) {
    // Degrade gracefully instead of failing the whole `astro build`. Hashnode
    // retired free GraphQL API access on 2026-05-13, so unauthenticated builds
    // get an HTML error page; the blog simply renders with no posts until the
    // API is restored (Pro token) or the data source is migrated.
    console.warn(
      `[hashnode] listPosts failed; rendering blog with no posts: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return [];
  }
}

export async function getPost(slug: string): Promise<HashnodePost | null> {
  try {
    const data = await query<{
      publication: { post: HashnodePost | null } | null;
    }>(
      `query Post($host: String!, $slug: String!) {
        publication(host: $host) {
          post(slug: $slug) { ${POST_FIELDS} }
        }
      }`,
      { host: HOST, slug },
    );
    const p = data.publication?.post ?? null;
    if (!p) return null;
    return { ...p, title: cleanTitle(p.title) };
  } catch (err) {
    console.warn(
      `[hashnode] getPost(${slug}) failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}
