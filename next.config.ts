import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-XSS-Protection",         value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@browserbasehq/sdk"],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async headers() {
    return [
      // Security headers on all routes
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Long-term cache for immutable Next.js static chunks
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Cache public static assets (fonts, icons, images) for 30 days
      {
        source: "/(.*)\\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      // Cache sitemap and robots for 1 day
      {
        source: "/(sitemap.xml|robots.txt)",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" }],
      },
    ];
  },
  async redirects() {
    return [
      // Normalize www vs non-www is handled at DNS/Vercel level
      // Add legacy URL redirects here if needed in the future
    ];
  },
};

export default withNextIntl(nextConfig);
