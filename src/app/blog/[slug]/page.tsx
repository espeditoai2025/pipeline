import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-data";
import { BlogArticle } from "@/components/marketing/BlogArticle";

export const dynamicParams = false;

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};
  return {
    title: `${post.title} | Pipely`,
    description: post.description,
    alternates: { canonical: `https://www.pipely.it/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.pipely.it/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      images: [{ url: "https://www.pipely.it/og-image.png", width: 1200, height: 630 }],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description: post.description,
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        author: {
          "@type": "Organization",
          name: "Pipely",
          url: "https://www.pipely.it",
        },
        publisher: {
          "@type": "Organization",
          name: "Pipely",
          url: "https://www.pipely.it",
          logo: { "@type": "ImageObject", url: "https://www.pipely.it/pipely-logo.svg" },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://www.pipely.it/blog/${post.slug}`,
        },
      },
      ...(post.faqs && post.faqs.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: post.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.q,
                acceptedAnswer: { "@type": "Answer", text: faq.a },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogArticle post={post} />
    </>
  );
}
