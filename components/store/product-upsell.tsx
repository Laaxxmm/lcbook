import type { Sku } from "@prisma/client";
import { ArrowRight, BookText, ClipboardCheck, Play, type LucideIcon } from "lucide-react";
import type { SkuCode } from "@/lib/catalogue";
import { elearningUtm } from "@/config/elearning";
import {
  DIGITAL,
  effectiveEbookPaise,
  effectiveCoursePaise,
  effectiveMockPaise,
  effectiveEbookUrl,
  effectiveCourseUrl,
  effectiveMockUrl,
} from "@/app/_lib/digital";
import { formatRupees } from "@/lib/money";

// Ebook / recorded-course upsell (§3, §15 item 7) — sits BELOW the primary CTA. Display +
// redirect only; nothing is sold here. Row visibility is driven by URL presence:
//   - EBOOK_URL missing  → hide the ebook row (e.g. MAT)
//   - COURSE_URL missing → "recorded course coming soon", no price, no CTA (CAT, CLAT)
//   - both missing       → render nothing (whole panel hidden)
// Course includes the ebook + mocks; buying the printed set grants NO digital access; both
// digital products are non-refundable — all stated before the outbound click.

function OutboundRow({
  title,
  note,
  href,
  cta,
  Icon,
}: {
  title: string;
  note: string;
  href: string;
  cta: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex gap-3 border-t border-lc-border py-3 first:border-t-0">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(14,59,46,0.06)] text-lc-green-700">
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-lc-green-800">{title}</div>
        <div className="mt-0.5 text-[13px] text-lc-green-400">{note}</div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-2 inline-flex items-center gap-1 text-sm font-bold text-lc-green-700 underline underline-offset-4"
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}

export function ProductUpsell({ sku }: { sku: Sku }) {
  const d = DIGITAL[sku.code as SkuCode];
  const ebookHref = effectiveEbookUrl(sku);
  const courseHref = effectiveCourseUrl(sku);
  const mockHref = effectiveMockUrl(sku);
  if (!d || (!ebookHref && !courseHref)) return null; // no ebook/course → no panel (mocks alone show on the storefront Mocks tab)

  const utm = elearningUtm();

  return (
    <section className="mt-8" aria-labelledby="ebook">
      <h2 id="ebook" className="flex items-center gap-2 text-[15px] font-bold text-lc-green-800">
        <BookText className="h-4 w-4 text-lc-green-700" aria-hidden />
        {ebookHref && courseHref ? "eBook & recorded course" : ebookHref ? "eBook" : "Recorded course"}
      </h2>
      <p className="mt-1 text-[13px] text-lc-green-400">
        The digital version, sold separately on our learning platform. Buying the <strong>Hardcopy</strong> set
        doesn&apos;t include digital access, and eBooks &amp; recorded courses are <strong>non-refundable</strong>.
      </p>

      <div className="mt-3 rounded-[12px] border border-lc-border bg-white px-4 py-1">
        {ebookHref && (
          <OutboundRow
            Icon={BookText}
            title={`${d.ebookLabel} — ${formatRupees(effectiveEbookPaise(sku))}`}
            note="1-year access. Opens on our learning platform."
            href={ebookHref + utm}
            cta="Get the eBook"
          />
        )}
        {mockHref && (
          <OutboundRow
            Icon={ClipboardCheck}
            title={`${d.mockLabel} — ${formatRupees(effectiveMockPaise(sku))}`}
            note="1-year access. Opens on our learning platform."
            href={mockHref + utm}
            cta="Get the mocks"
          />
        )}
        {courseHref ? (
          <OutboundRow
            Icon={Play}
            title={`Recorded course — ${formatRupees(effectiveCoursePaise(sku))}`}
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
