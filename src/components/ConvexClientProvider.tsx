"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";

let cached: ConvexReactClient | null = null;
function getClient(): ConvexReactClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  cached = new ConvexReactClient(url);
  return cached;
}

/**
 * Convex is client-only. During SSR/prerender (no window, possibly no URL) we
 * render nothing so the reactive pages aren't statically generated against a
 * missing backend; the real UI mounts on the client under a live provider.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const client = getClient();
  if (!client) {
    return (
      <div style={{ padding: 24, fontFamily: "monospace", color: "#e8463a" }}>
        Convex is not configured. Set NEXT_PUBLIC_CONVEX_URL (run `npx convex dev`).
      </div>
    );
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
