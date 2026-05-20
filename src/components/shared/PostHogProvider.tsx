"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

  useEffect(() => {
    if (!key) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: false, // manual tracking below
      capture_pageleave: true,
      persistence: "localStorage",
      autocapture: false, // opt-in only to reduce noise
    });
  }, [key, host]);

  if (!key) return <>{children}</>;

  return <PHProvider client={posthog}>{children}<PageViewTracker /></PHProvider>;
}

/** Tracks page views on route change (App Router compatible). */
function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
