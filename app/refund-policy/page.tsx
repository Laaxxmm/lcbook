import type { Metadata } from "next";
import { SELLER } from "@/lib/invoice";
import { LegalPage, H2, P, UL } from "@/components/store/legal";

export const metadata: Metadata = { title: "Refund & Cancellation Policy" };

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="24 July 2026">
      <P>
        We keep this plain. One price, stated once, and clear terms before you pay.
      </P>

      <H2>Cancellations</H2>
      <UL>
        <li>
          <strong>In-stock sets</strong> can be cancelled any time before dispatch — that is, until a
          courier tracking number (AWB) is entered for your order.
        </li>
        <li>
          <strong>Print-to-order sets</strong> can be cancelled until printing starts. Once printing
          begins the order can no longer be cancelled — we email you the moment that window closes.
        </li>
        <li>
          A cancellation is a request that our team reviews; it is not an automatic refund. Once
          approved, the refund is initiated.
        </li>
      </UL>

      <H2>Refunds</H2>
      <UL>
        <li>
          Approved cancellations are refunded to your original payment method, <strong>minus payment
          gateway charges</strong> (the fee the gateway retains and does not return to us).
        </li>
        <li>Refunds are initiated after approval and typically reach your account in 5–7 working days.</li>
        <li>Refunds are made only to the original payment method.</li>
      </UL>

      <H2>Returns</H2>
      <P>
        We do not accept returns except for damage in transit. If your set arrives damaged, reply to
        your order email within 48 hours of delivery with photos and we&apos;ll arrange a replacement.
      </P>

      <H2>Digital products</H2>
      <P>
        eBooks and recorded courses (sold on our learning platform) are <strong>non-refundable</strong>.
      </P>

      <P>
        Need help? Write to{" "}
        <a href={`mailto:${SELLER.email}`} className="font-semibold text-lc-green-700 underline underline-offset-4">{SELLER.email}</a>{" "}
        or call {SELLER.phone}.
      </P>
    </LegalPage>
  );
}
