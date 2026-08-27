import type { MetadataRoute } from "next";

// Robots (§1). Index the storefront; keep customer-only surfaces out of search.
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.APP_URL ?? "https://publications.learncrew.org").replace(/\/$/, "");
  const disallow = ["/api/", "/track", "/pay", "/login", "/admin"];
  // Mirror learncrew.org: AI crawlers are explicitly welcome on the public catalogue, so the
  // two properties behave the same way and the sets can be cited/answered.
  const aiAgents = [
    "GPTBot",
    "ChatGPT-User",
    "ClaudeBot",
    "Claude-Web",
    "PerplexityBot",
    "Google-Extended",
  ];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...aiAgents.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
