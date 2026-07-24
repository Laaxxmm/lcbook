import type { MetadataRoute } from "next";
import { SKU_CODES } from "@/lib/catalogue";

// Static sitemap (§1, §15) — this store replaces an indexed WordPress URL, so search engines
// need a clean map. Product URLs come from the fixed SKU list; no DB, so it builds anywhere.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.APP_URL ?? "https://publications.learncrew.org").replace(/\/$/, "");
  const staticPaths = ["", "/terms", "/refund-policy", "/shipping-policy", "/contact"];
  return [
    ...staticPaths.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.5 })),
    ...SKU_CODES.map((code) => ({
      url: `${base}/${code}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
