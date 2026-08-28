"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

// Google Ads account for the store. Hard-coded for the same reason the GTM container id is:
// Next inlines NEXT_PUBLIC_* at BUILD time while Railway injects service vars at deploy, so a
// dashboard variable would compile to `undefined` and the store would ship untagged. A
// conversion id is public regardless — it is in the page source of every site that runs it.
export const GOOGLE_ADS_ID = "AW-375362472";

/**
 * Loads gtag.js for the Ads account and configures it, after hydration so it never competes
 * with first paint. Skipped on /admin — staff traffic must not reach the ad account.
 *
 * This loads its own gtag.js rather than relying on the GTM container: nothing in the repo
 * configures Ads inside GTM, and learncrew.org currently serves no Google tag at all, so
 * depending on the container would mean recording zero conversions. Running gtag.js beside
 * GTM is supported — both share window.dataLayer.
 */
export function GoogleAds() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-config" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GOOGLE_ADS_ID}');`}
      </Script>
    </>
  );
}
