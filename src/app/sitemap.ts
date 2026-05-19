import type { MetadataRoute } from "next";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/blog-data";
import { SETTORI } from "@/lib/settori-data";

const BASE = "https://www.pipely.it";

// Data dell'ultimo aggiornamento significativo dei contenuti statici.
// Aggiornare manualmente quando si modifica contenuto rilevante per SEO.
const LAST_UPDATED = new Date("2026-05-13");

export default function sitemap(): MetadataRoute.Sitemap {
  const blogPosts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const settori: MetadataRoute.Sitemap = SETTORI.map((s) => ({
    url: `${BASE}/${s.slug}`,
    lastModified: LAST_UPDATED,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const blogCategories: MetadataRoute.Sitemap = BLOG_CATEGORIES.map((cat) => ({
    url: `${BASE}/blog/categoria/${cat.toLowerCase().replace(/\s+/g, "-")}`,
    lastModified: LAST_UPDATED,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    // Core pages
    {
      url: BASE,
      lastModified: LAST_UPDATED,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    // NOTA: /login e /register esclusi dalla sitemap — pagine auth senza valore SEO
    {
      url: `${BASE}/chi-siamo`,
      lastModified: LAST_UPDATED,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE}/contatti`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    // Legal
    {
      url: `${BASE}/privacy`,
      lastModified: LAST_UPDATED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/termini`,
      lastModified: LAST_UPDATED,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE}/cookie`,
      lastModified: LAST_UPDATED,
      changeFrequency: "yearly",
      priority: 0.2,
    },
    // Blog
    {
      url: `${BASE}/blog`,
      lastModified: LAST_UPDATED,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...blogPosts,
    // Vertical landing pages (explicit)
    {
      url: `${BASE}/crm-per-pmi`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-per-agenzie`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-commerciale`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-per-consulenti`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-email-marketing`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-per-agenzie-immobiliari`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-per-assicuratori`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-per-freelance`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-per-startup`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/crm-per-ecommerce`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Comparison pages
    {
      url: `${BASE}/alternativa-hubspot`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/alternativa-pipedrive`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/migliori-crm-italiani`,
      lastModified: LAST_UPDATED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Programmatic SEO — settori (15 pages)
    ...settori,
    // Blog category pages
    ...blogCategories,
  ];
}
