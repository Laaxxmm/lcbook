import { SELLER } from "@/lib/invoice";
import { LEARNCREW } from "@/config/learncrew";

// Structured data (§15). Everything here is OUR OWN data — SELLER, the Sku row, the fixed
// catalogue — never anything a buyer typed.
// Deliberately NO aggregateRating and NO review: the store has none, and inventing them is
// both a Google manual-action risk and a lie.

/** Absolute site origin, no trailing slash. Mirrors sitemap.ts / robots.ts. */
export function siteUrl(): string {
  return (process.env.APP_URL ?? "https://publications.learncrew.org").replace(/\/$/, "");
}

/**
 * Renders a JSON-LD block from the server.
 *
 * `<` `>` `&` are re-encoded as \uXXXX escapes — still valid JSON, parsed to the identical
 * value, but it makes a `</script>` breakout impossible and leaves nothing for React's text
 * escaping to touch (a `&` escaped to `&amp;` would otherwise survive verbatim, because a
 * <script> body is a raw-text element and browsers never decode entities inside it).
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(
    /[<>&]/g,
    (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
  return <script type="application/ld+json">{json}</script>;
}

// SELLER.displayAddress is the one canonical NAP string; split into schema fields once, here,
// so the storefront, the footer and the structured data can never drift apart.
const POSTAL_ADDRESS = {
  "@type": "PostalAddress",
  streetAddress:
    "No. 57, Nandanam Layout, Nisarga Colony, 13th C Cross, 9th Cross, 10th Main Rd, Horamavu",
  addressLocality: "Bengaluru",
  addressRegion: "Karnataka",
  postalCode: "560043",
  addressCountry: "IN",
} as const;

/** Organization node — emitted on the homepage and /contact. */
export function organizationLd() {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SELLER.displayName,
    legalName: SELLER.name,
    url: base,
    logo: `${base}/logo.png`,
    address: POSTAL_ADDRESS,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SELLER.email,
      telephone: SELLER.phone,
      areaServed: "IN",
    },
    sameAs: [LEARNCREW],
  };
}
