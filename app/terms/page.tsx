import type { Metadata } from "next";
import Link from "next/link";
import { SELLER } from "@/lib/invoice";
import { LegalPage, H2, P, UL } from "@/components/store/legal";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="24 July 2026">
      <P>
        This store is operated by {SELLER.displayName}, {SELLER.address.join(" ")}. By placing an order you
        agree to these terms. Questions? Write to{" "}
        <a href={`mailto:${SELLER.email}`} className="font-semibold text-lc-green-700 underline underline-offset-4">{SELLER.email}</a>{" "}
        or call {SELLER.phone}.
      </P>

      <H2>What we sell</H2>
      <P>
        We sell printed entrance-exam book <em>sets</em> only — individual books are not sold
        separately. Every price shown includes shipping within India; there are no hidden charges.
      </P>

      <H2>Orders & pricing</H2>
      <UL>
        <li>Prices are shown in Indian rupees and include shipping.</li>
        <li>An order is confirmed once payment is received and verified.</li>
        <li>
          Sets are dispatched from stock (1–2 working days) or, when out of stock, printed to order
          (7–10 working days). The fulfilment type is shown before you pay.
        </li>
        <li>We may decline or cancel an order and refund it in full if we cannot fulfil it.</li>
      </UL>

      <H2>Digital products</H2>
      <P>
        eBooks and recorded courses are sold separately on our learning platform, not through this
        store. Buying a printed set does not include any digital access. eBooks and recorded courses
        are non-refundable.
      </P>

      <H2>Cancellations, refunds & shipping</H2>
      <P>
        See our{" "}
        <Link href="/refund-policy" className="font-semibold text-lc-green-700 underline underline-offset-4">Refund &amp; Cancellation Policy</Link>{" "}
        and{" "}
        <Link href="/shipping-policy" className="font-semibold text-lc-green-700 underline underline-offset-4">Shipping Policy</Link>.
      </P>

      <H2>Governing law</H2>
      <P>These terms are governed by the laws of India, subject to the courts of Bengaluru, Karnataka.</P>
    </LegalPage>
  );
}
