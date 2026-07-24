import type { MetadataRoute } from "next";

// Robots (§1). Index the storefront; keep customer-only surfaces out of search.
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "https://publications.learncrew.org").replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/track", "/pay", "/login"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
