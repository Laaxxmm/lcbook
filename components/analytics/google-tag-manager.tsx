"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// Google Tag Manager container GTM-NWH7PFJ8 — the same container learncrew.org and
// learncrew.org/tools/ run, so the store reports into the same GA4 property
// (G-S9TPBWTJRS). One property is the only way the path that matters is visible:
// someone reads a blog post, opens a free tool, then buys a book set. Split
// properties turn that into three unrelated sessions.
//
// The ID is hard-coded rather than read from a NEXT_PUBLIC_* variable on purpose.
// Next inlines NEXT_PUBLIC_* at BUILD time, and lib/env.ts already documents that
// Railway injects service vars at deploy/run — not necessarily at build. A variable
// set in the Railway dashboard would therefore inline as undefined and the store
// would ship untagged with nothing to show for it. A container ID is public anyway:
// it appears in the page source of every site that runs it.
const GTM_ID = "GTM-NWH7PFJ8";

/**
 * Loads the container after hydration so it never competes with first paint.
 *
 * Skipped on /admin: that is staff-only traffic, and letting it into GA4 inflates
 * sessions and corrupts every conversion rate on a catalogue this small.
 */
export function GoogleTagManager() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <Script id="gtm-container" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
