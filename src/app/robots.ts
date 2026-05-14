import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "Twitterbot",
        allow: "/",
      },
      {
        userAgent: "LinkedInBot",
        allow: "/",
      },
      {
        userAgent: "WhatsApp",
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/dashboard",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: "https://www.pipely.it/sitemap.xml",
    host: "https://www.pipely.it",
  };
}
