import type { MetadataRoute } from "next";
import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import { desc } from "drizzle-orm";

const API_BASE = process.env.WORKER_API_URL || "http://localhost:8000";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog/author/vagiz-hasanov`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt)).limit(200);
    for (const p of posts) {
      entries.push({
        url: `${SITE_URL}/blog/${p.slug}`,
        lastModified: new Date(p.updatedAt),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  } catch {}

  try {
    const channelsRes = await fetch(`${API_BASE}/api/channels`);
    if (channelsRes.ok) {
      const channels = await channelsRes.json();

      for (const ch of channels) {
        entries.push({
          url: `${SITE_URL}/${ch.username}`,
          lastModified: ch.last_synced_at ? new Date(ch.last_synced_at) : new Date(),
          changeFrequency: "daily",
          priority: 0.8,
        });

        try {
          const sitemapRes = await fetch(`${API_BASE}/api/sitemap/${ch.username}`);
          if (sitemapRes.ok) {
            const data = await sitemapRes.json();
            for (const post of data.posts) {
              entries.push({
                url: `${SITE_URL}/${ch.username}/${post.slug}`,
                lastModified: new Date(post.date),
                changeFrequency: "monthly",
                priority: 0.6,
              });
            }
          }
        } catch {}
      }
    }
  } catch {}

  return entries;
}
