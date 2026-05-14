"use client";
/**
 * PostHog client-side provider.
 * Wraps the app so posthog-js is initialized once and accessible via usePostHog().
 * Init is skipped when NEXT_PUBLIC_POSTHOG_KEY is not set (local dev without key, CI).
 */
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Respect do-not-track and cookie banners.
      respect_dnt: true,
      // Avoid capturing PII from URLs automatically.
      sanitize_properties: (props) => {
        // Strip query params that might contain tokens.
        if (typeof props.$current_url === "string") {
          try {
            const url = new URL(props.$current_url);
            ["token", "code", "session", "access_token"].forEach((p) => url.searchParams.delete(p));
            props.$current_url = url.toString();
          } catch {
            // ignore
          }
        }
        return props;
      },
      capture_pageview: false, // We capture manually for SPA accuracy.
      persistence: "localStorage",
    });
  }

  return POSTHOG_KEY ? <PHProvider client={posthog}>{children}</PHProvider> : <>{children}</>;
}

/** Inner component that tracks page views on route changes. */
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
