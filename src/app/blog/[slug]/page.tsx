import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BLOG_POSTS, getBlogPost } from "@/lib/blog-data";
import { BlogArticle } from "@/components/marketing/BlogArticle";

function getRelatedPosts(currentSlug: string, category: string, limit = 3) {
  return BLOG_POSTS.filter((p) => p.slug !== currentSlug && p.category === category).slice(0, limit);
}

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

  const relatedPosts = getRelatedPosts(slug, post.category);

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
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pipely.it" },
          { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.pipely.it/blog" },
          { "@type": "ListItem", position: 3, name: post.title, item: `https://www.pipely.it/blog/${post.slug}` },
        ],
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
      <BlogArticle post={post} relatedPosts={relatedPosts} />
    </>
  );
}
