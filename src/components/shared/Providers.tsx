"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { useState, Suspense } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "./ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PostHogProvider } from "./PostHogProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 1000 } },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Suspense>
              <PostHogProvider>
                {children}
                <Toaster position="bottom-right" richColors />
              </PostHogProvider>
            </Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
