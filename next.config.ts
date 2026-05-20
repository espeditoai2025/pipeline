import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Content-Security-Policy — aggiornare se si aggiungono nuovi domini esterni
const csp = [
  "default-src 'self'",
  // Script: Next.js inline scripts (nonce non disponibile in config statica), Stripe, PostHog
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://app.posthog.com https://eu.posthog.com",
  // Style: self + inline (Tailwind genera stili inline)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Font
  "font-src 'self' https://fonts.gstatic.com",
  // Img: self + data URIs + Stripe + Uploadthing + opengraph
  "img-src 'self' data: blob: https://*.stripe.com https://uploadthing.com https://*.uploadthing.com https://www.pipely.it",
  // Connessioni API/fetch
  "connect-src 'self' https://api.stripe.com https://app.posthog.com https://eu.posthog.com https://*.sentry.io https://o*.ingest.sentry.io wss://*.inngest.com",
  // Frame: Stripe Checkout iframe
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  // Worker per Sentry
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "X-Frame-Options",           value: "SAMEORIGIN" },
  { key: "X-XSS-Protection",         value: "1; mode=block" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy",   value: csp },
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

const withIntl = withNextIntl(nextConfig);

export default withSentryConfig(withIntl, {
  // Sentry organization and project (set via SENTRY_ORG and SENTRY_PROJECT env vars in CI)
  silent: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
