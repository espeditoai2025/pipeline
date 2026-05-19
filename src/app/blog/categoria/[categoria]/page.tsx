import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { BLOG_CATEGORIES, getBlogPostsByCategory } from "@/lib/blog-data";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_CATEGORIES.map((cat) => ({
    categoria: cat.toLowerCase().replace(/\s+/g, "-"),
  }));
}

function findCategory(slug: string): string | undefined {
  return BLOG_CATEGORIES.find(
    (cat) => cat.toLowerCase().replace(/\s+/g, "-") === slug
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categoria: string }>;
}): Promise<Metadata> {
  const { categoria } = await params;
  const cat = findCategory(categoria);
  if (!cat) return {};
  return {
    title: `${cat} — Articoli e Guide | Blog Pipely`,
    description: `Articoli pratici sulla categoria ${cat}: guide, consigli e strategie per team di vendita italiani.`,
    alternates: { canonical: `https://www.pipely.it/blog/categoria/${categoria}` },
    openGraph: {
      title: `${cat} — Blog Pipely`,
      description: `Articoli sulla categoria ${cat} per team commerciali italiani.`,
      url: `https://www.pipely.it/blog/categoria/${categoria}`,
    },
  };
}

export default async function BlogCategoryPage({
  params,
}: {
  params: Promise<{ categoria: string }>;
}) {
  const { categoria } = await params;
  const cat = findCategory(categoria);
  if (!cat) notFound();

  const posts = getBlogPostsByCategory(cat).sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${cat} — Blog Pipely`,
        description: `Articoli pratici sulla categoria ${cat} per team di vendita italiani.`,
        url: `https://www.pipely.it/blog/categoria/${categoria}`,
        isPartOf: { "@id": "https://www.pipely.it/#website" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
          { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.pipely.it/blog" },
          { "@type": "ListItem", position: 3, name: cat, item: `https://www.pipely.it/blog/categoria/${categoria}` },
        ],
      },
    ],
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="border-b border-slate-100 bg-slate-50 px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-slate-800 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-slate-700">{cat}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-slate-100 bg-slate-50 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700">
            {cat}
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Articoli su {cat}
          </h1>
          <p className="text-lg text-slate-500">
            {posts.length} {posts.length === 1 ? "articolo" : "articoli"} — guide pratiche per team commerciali italiani.
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const date = new Date(post.publishedAt).toLocaleDateString("it-IT", {
                year: "numeric", month: "short", day: "numeric",
              });
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
                >
                  <div className="mb-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="mb-3 text-base font-semibold leading-snug text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-3">
                    {post.title}
                  </h2>
                  <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{post.readingMinutes} min
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Back to blog */}
      <div className="border-t border-slate-100 px-6 py-8 text-center">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Tutti gli articoli del blog
        </Link>
      </div>
    </MarketingShell>
  );
}
