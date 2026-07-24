import type { Metadata } from "next";
import { SELLER } from "@/lib/invoice";
import { LegalPage, H2, P, UL } from "@/components/store/legal";

export const metadata: Metadata = { title: "Shipping Policy" };

export default function ShippingPolicyPage() {
  return (
    <LegalPage title="Shipping Policy" updated="24 July 2026">
      <H2>Where we ship & what it costs</H2>
      <P>
        We ship across India. Shipping is already included in every price shown — there is no separate
        delivery charge at checkout.
      </P>

      <H2>Dispatch timelines</H2>
      <UL>
        <li>
          <strong>In stock:</strong> dispatched within 1–2 working days of a confirmed order.
        </li>
        <li>
          <strong>Printed to order:</strong> when a set is out of stock we print it for you — printed
          and dispatched within 7–10 working days. This is shown before you pay.
        </li>
      </UL>

      <H2>Tracking</H2>
      <P>
        Once your order ships we email the courier name and tracking number (AWB). You can also track
        an order any time using your order ID and phone number, or the link in your order emails.
      </P>

      <H2>Damaged in transit</H2>
      <P>
        If a set arrives damaged, reply to your order email within 48 hours of delivery with photos and
        we&apos;ll arrange a replacement.
      </P>

      <P>
        Dispatched from: {SELLER.address.join(" ")}. Questions?{" "}
        <a href={`mailto:${SELLER.email}`} className="font-semibold text-lc-green-700 underline underline-offset-4">{SELLER.email}</a>{" "}
        · {SELLER.phone}.
      </P>
    </LegalPage>
  );
}
