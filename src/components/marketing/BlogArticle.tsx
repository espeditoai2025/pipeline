import Link from "next/link";
import { ChevronDown, ArrowRight, Clock, Calendar, Tag } from "lucide-react";
import { MarketingShell } from "./MarketingShell";
import type { BlogPost } from "@/lib/blog-data";

type Props = {
  post: BlogPost;
};

export function BlogArticle({ post }: Props) {
  const publishDate = new Date(post.publishedAt).toLocaleDateString("it-IT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <MarketingShell>
      {/* Breadcrumb */}
      <nav className="border-b border-slate-100 bg-slate-50 px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-slate-800 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-slate-700 truncate max-w-xs">{post.title}</span>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-12">
          {/* Main content */}
          <article>
            {/* Header */}
            <header className="mb-10">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  <Tag className="h-3 w-3" />
                  {post.category}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  {publishDate}
                </span>
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {post.readingMinutes} min di lettura
                </span>
              </div>
              <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 md:text-4xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-slate-500">{post.excerpt}</p>
            </header>

            {/* Article body */}
            <div
              className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-800 prose-a:text-blue-600"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* FAQ section */}
            {post.faqs && post.faqs.length > 0 && (
              <section className="mt-14 rounded-2xl bg-slate-50 p-8">
                <h2 className="mb-6 text-xl font-semibold text-slate-900">Domande frequenti</h2>
                <div className="space-y-3">
                  {post.faqs.map((faq) => (
                    <details
                      key={faq.q}
                      className="group rounded-xl border border-slate-200 bg-white px-6 py-4 cursor-pointer"
                    >
                      <summary className="flex items-center justify-between font-medium text-slate-900 list-none">
                        {faq.q}
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180 ml-4" />
                      </summary>
                      <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* CTA */}
            <div className="mt-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-center">
              <h2 className="mb-2 text-xl font-semibold text-white">Prova Pipely gratis</h2>
              <p className="mb-6 text-blue-100">Il CRM italiano con AI per PMI. Piano Starter gratuito, nessuna carta di credito.</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all"
              >
                Crea il tuo account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">In questo articolo</h3>
                <TocExtracted content={post.content} />
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
                <p className="mb-1 text-sm font-semibold text-blue-900">Pipely CRM</p>
                <p className="mb-4 text-sm text-blue-700">Il CRM italiano per PMI. Gratis per sempre nel piano Starter.</p>
                <Link
                  href="/register"
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Inizia gratis <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </MarketingShell>
  );
}

function TocExtracted({ content }: { content: string }) {
  const h2matches = [...content.matchAll(/<h2>([^<]+)<\/h2>/g)];
  if (h2matches.length === 0) return <p className="text-sm text-slate-400">Nessuna sezione trovata.</p>;

  return (
    <ul className="space-y-2">
      {h2matches.map(([, text]) => (
        <li key={text}>
          <span className="block text-sm text-slate-600 leading-relaxed hover:text-blue-600 cursor-pointer transition-colors">
            {text}
          </span>
        </li>
      ))}
    </ul>
  );
}
