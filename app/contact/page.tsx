import type { Metadata } from "next";
import { SELLER } from "@/lib/invoice";
import { LegalPage, H2, P } from "@/components/store/legal";
import { JsonLd, organizationLd } from "@/app/_lib/seo";

// Its own description — this page used to reuse the homepage's verbatim (P1-8).
export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach Learn Crew Publications in Bengaluru — email, phone or WhatsApp for order status, delivery questions and book-set enquiries. We answer every message.",
  alternates: { canonical: "/contact" },
};

const WHATSAPP = "https://wa.me/919738255304";

export default function ContactPage() {
  return (
    <LegalPage title="Contact us" updated="24 July 2026">
      <JsonLd data={organizationLd()} />
      <P>We&apos;re a small team in Bengaluru and we answer every message.</P>

      <H2>{SELLER.displayName}</H2>
      <P>{SELLER.displayAddress}</P>

      <H2>Reach us</H2>
      <P>
        Email:{" "}
        <a href={`mailto:${SELLER.email}`} className="font-semibold text-lc-green-700 underline underline-offset-4">{SELLER.email}</a>
        <br />
        Phone / WhatsApp:{" "}
        <a href={`tel:${SELLER.phone.replace(/\s/g, "")}`} className="font-semibold text-lc-green-700 underline underline-offset-4">{SELLER.phone}</a>{" "}
        (<a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-semibold text-lc-green-700 underline underline-offset-4">chat on WhatsApp</a>)
      </P>

      <H2>Order questions</H2>
      <P>
        Include your order ID (like LC-2627-000431) and we&apos;ll get you sorted. You can also check
        status yourself on the Track order page.
      </P>
    </LegalPage>
  );
}
