import type { PostData, ChannelData } from "./api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://post-seo.seo-rezult.ru";
const LOGO_URL = `${SITE_URL}/logo.png`;

export function blogPostingSchema(post: PostData, wordCount?: number) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seo_title,
    description: post.seo_description,
    datePublished: post.date,
    dateModified: post.date,
    keywords: post.seo_keywords?.join(",") || "",
    inLanguage: "ru",
    ...(wordCount && wordCount > 0 && { wordCount }),
    author: {
      "@type": "Organization",
      name: post.channel.title,
      url: `${SITE_URL}/${post.channel.username}`,
      logo: {
        "@type": "ImageObject",
        url: post.channel.avatar_url ?? LOGO_URL,
      },
    },
    publisher: {
      "@type": "Organization",
      name: "Post SEO",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: LOGO_URL,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/${post.channel.username}/${post.seo_slug}`,
    },
    image: {
      "@type": "ImageObject",
      url: post.media_urls?.[0] ?? `${SITE_URL}/og-default.png`,
      width: 1200,
      height: 630,
      description: post.seo_title,
    },
  };
}

export function breadcrumbSchema(
  channel: { username: string; title: string },
  postTitle?: string,
  postSlug?: string,
) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Каналы",
      item: `${SITE_URL}/discover`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: channel.title,
      item: `${SITE_URL}/${channel.username}`,
    },
  ];

  if (postTitle && postSlug) {
    items.push({
      "@type": "ListItem",
      position: 3,
      name: postTitle,
      item: `${SITE_URL}/${channel.username}/${postSlug}`,
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

export function faqSchema(faqHtml: string) {
  const matches = [...faqHtml.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/g)];
  if (matches.length === 0) return null;

  const mainEntity = matches.map(([, q, a]) => ({
    "@type": "Question",
    name: q.replace(/<[^>]+>/g, "").trim(),
    acceptedAnswer: {
      "@type": "Answer",
      text: a.replace(/<[^>]+>/g, "").trim(),
    },
  }));

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}
