import type { SkuCode } from "@/lib/catalogue";
import { EBOOK_URL, COURSE_URL, elearningUtm } from "@/config/elearning";
import { DIGITAL } from "@/app/_lib/digital";
import { formatRupees } from "@/lib/money";

// Ebook / recorded-course upsell (§3, §15 item 7) — sits BELOW the primary CTA. Display +
// redirect only; nothing is sold here. Row visibility is driven by URL presence:
//   - EBOOK_URL missing  → hide the ebook row (e.g. MAT)
//   - COURSE_URL missing → "recorded course coming soon", no price, no CTA (CAT, CLAT)
//   - both missing       → render nothing (whole panel hidden)
// Course includes the ebook + mocks; buying the printed set grants NO digital access; both
// digital products are non-refundable — all stated before the outbound click.

function OutboundRow({ title, note, href, cta }: { title: string; note: string; href: string; cta: string }) {
  return (
    <div className="border-t border-lc-border py-3 first:border-t-0">
      <div className="font-semibold text-lc-green-800">{title}</div>
      <div className="mt-0.5 text-[13px] text-lc-green-400">{note}</div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-lc-green-700 underline underline-offset-4"
      >
        {cta} &rarr;
      </a>
    </div>
  );
}

export function ProductUpsell({ skuCode }: { skuCode: SkuCode }) {
  const d = DIGITAL[skuCode];
  const ebookHref = EBOOK_URL[skuCode];
  const courseHref = COURSE_URL[skuCode];
  if (!d || (!ebookHref && !courseHref)) return null; // both missing → no panel

  const utm = elearningUtm();

  return (
    <section className="mt-8" aria-labelledby="prep-digitally">
      <h2 id="prep-digitally" className="text-[15px] font-bold text-lc-green-800">
        Prepare digitally too
      </h2>
      <p className="mt-1 text-[13px] text-lc-green-400">
        Sold separately on our learning platform. Buying the printed set doesn&apos;t include digital
        access, and eBooks &amp; recorded courses are <strong>non-refundable</strong>.
      </p>

      <div className="mt-3 rounded-[12px] border border-lc-border bg-white px-4 py-1">
        {ebookHref && (
          <OutboundRow
            title={`${d.ebookLabel} — ${formatRupees(d.ebookPaise)}`}
            note='1-year access. Opens as a "course" on WiseApp — this is the eBook, not a wrong link.'
            href={ebookHref + utm}
            cta="Get the eBook"
          />
        )}
        {courseHref ? (
          <OutboundRow
            title={`Recorded course — ${formatRupees(d.coursePaise)}`}
            note="Includes the eBook and mock tests. 1-year access."
            href={courseHref + utm}
            cta="View the course"
          />
        ) : (
          <div className="border-t border-lc-border py-3 first:border-t-0 text-[13px] text-lc-green-400">
            Recorded course coming soon.
          </div>
        )}
      </div>
    </section>
  );
}
