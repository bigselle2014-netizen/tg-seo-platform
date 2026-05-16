const API_BASE = process.env.WORKER_API_URL || "http://localhost:8000";

export interface ChannelData {
  id: number;
  username: string;
  title: string;
  description: string;
  avatar_url: string | null;
  subscribers_count: number;
  posts_total: number;
  posts_indexed: number;
  last_synced_at: string | null;
}

export interface PostData {
  id: number;
  telegram_message_id: number;
  text: string;
  text_html: string;
  article_html: string | null;
  content_html: string | null;
  date: string;
  views: number;
  forwards: number;
  reactions_count: number;
  has_media: boolean;
  media_type: string | null;
  media_urls: string[];
  seo_title: string;
  seo_h1: string | null;
  seo_description: string;
  seo_slug: string;
  seo_keywords: string[];
  is_indexed: boolean;
  cluster_id: number | null;
  channel: {
    username: string;
    title: string;
    avatar_url: string | null;
    description?: string;
  };
  related_posts: {
    seo_title: string;
    seo_slug: string;
    seo_description: string;
    date: string;
  }[];
}

export interface PostListResponse {
  total: number;
  page: number;
  per_page: number;
  posts: Omit<PostData, "text_html" | "channel" | "related_posts" | "media_urls">[];
}

export async function fetchChannel(username: string): Promise<ChannelData> {
  const res = await fetch(`${API_BASE}/api/channels/${username}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Channel ${username} not found`);
  return res.json();
}

export async function fetchPosts(
  username: string,
  page = 1,
  perPage = 20,
): Promise<PostListResponse> {
  const res = await fetch(
    `${API_BASE}/api/channels/${username}/posts?page=${page}&per_page=${perPage}`,
    { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`Posts for ${username} not found`);
  return res.json();
}

export async function fetchPost(username: string, slug: string): Promise<PostData> {
  const res = await fetch(`${API_BASE}/api/channels/${username}/posts/${slug}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Post ${slug} not found`);
  return res.json();
}

export async function fetchSitemapData(username: string) {
  const res = await fetch(`${API_BASE}/api/sitemap/${username}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`Sitemap for ${username} not found`);
  return res.json();
}
