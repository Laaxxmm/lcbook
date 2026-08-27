import type { MetadataRoute } from "next";
import { SKU_CODES } from "@/lib/catalogue";

// Static sitemap (§1, §15) — this store replaces an indexed WordPress URL, so search engines
// need a clean map. Product URLs come from the fixed SKU list; no DB, so it builds anywhere.
// Trailing slash: the homepage is listed as "<base>/" so it matches how the site links to itself.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? "https://publications.learncrew.org").replace(/\/$/, "");
  // Build-time stamp: gives every entry a lastmod without pretending to know per-page edit dates.
  const lastModified = new Date();
  const staticPaths = [
    "/",
    "/?tab=ebook",
    "/?tab=mocks",
    "/terms",
    "/refund-policy",
    "/shipping-policy",
    "/privacy-policy",
    "/contact",
  ];
  return [
    ...staticPaths.map((p) => ({
      url: `${base}${p}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: p === "/" ? 1 : p.startsWith("/?tab=") ? 0.7 : 0.5,
    })),
    ...SKU_CODES.map((code) => ({
      url: `${base}/${code}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
