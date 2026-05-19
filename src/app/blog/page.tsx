import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Calendar } from "lucide-react";
import { BLOG_POSTS, BLOG_CATEGORIES } from "@/lib/blog-data";
import { MarketingShell } from "@/components/marketing/MarketingShell";

export const metadata: Metadata = {
  title: "Blog CRM — Guide Pratiche per Team di Vendita | Pipely",
  description: "Guide pratiche su CRM, pipeline vendite, follow-up automatici e gestione clienti. Articoli scritti per team commerciali italiani.",
  alternates: { canonical: "https://www.pipely.it/blog" },
  openGraph: {
    title: "Blog Pipely — Guide CRM per Team di Vendita",
    description: "Guide pratiche su CRM, pipeline vendite, follow-up automatici e gestione clienti per PMI italiane.",
    url: "https://www.pipely.it/blog",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Il CRM italiano con AI e automazioni" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Blog Pipely — Guide CRM",
  description: "Guide pratiche su CRM, vendite e gestione clienti per PMI italiane.",
  url: "https://www.pipely.it/blog",
  isPartOf: { "@id": "https://www.pipely.it/#website" },
};

export default function BlogPage() {
  const sorted = [...BLOG_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="border-b border-slate-100 bg-slate-50 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-medium text-blue-700">
            Blog & Guide
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Guide pratiche per vendere di più
          </h1>
          <p className="text-lg text-slate-500">
            Articoli su CRM, pipeline vendite, automazioni e gestione clienti — scritti per team commerciali italiani.
          </p>
        </div>
      </section>

      {/* Category filter */}
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Categorie:</span>
          {BLOG_CATEGORIES.map((cat) => (
            <span
              key={cat}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Articles grid */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((post) => {
              const date = new Date(post.publishedAt).toLocaleDateString("it-IT", {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-100 transition-all"
                >
                  <div className="mb-3 flex items-center gap-2">
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
                      <Calendar className="h-3 w-3" />
                      {date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readingMinutes} min
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-50 px-6 py-16 text-center">
        <div className="mx-auto max-w-lg">
          <h2 className="mb-3 text-2xl font-semibold text-slate-900">Prova Pipely gratis</h2>
          <p className="mb-6 text-slate-500">Il CRM italiano per PMI. Piano Starter gratuito per sempre.</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Crea il tuo account <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
