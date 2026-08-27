import type { Metadata } from "next";
import { SELLER } from "@/lib/invoice";
import { LegalPage, H2, P, UL } from "@/components/store/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Learn Crew Publications collects, uses and protects your personal data — what we store, who we share it with, and your rights under India's DPDP Act.",
  alternates: { canonical: "/privacy-policy" },
};

// Privacy policy (India DPDP Act 2023). Required before a payment gateway will approve the
// merchant account, and a legal obligation because checkout collects name, email, phone and
// a delivery address. Keep this in step with what the app ACTUALLY does — see §8 (consent),
// §9 (Razorpay), §10 (sheet mirror), §11 (Resend email).
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="27 August 2026">
      <P>
        This policy explains what personal data {SELLER.displayName} ({SELLER.name}) collects when you
        buy from this store, why we collect it, and what control you have over it. We only ask for
        what an order actually needs. Questions or requests? Write to{" "}
        <a href={`mailto:${SELLER.email}`} className="font-semibold text-lc-green-700 underline underline-offset-4">
          {SELLER.email}
        </a>
        .
      </P>

      <H2>What we collect</H2>
      <UL>
        <li>Your name, email address and phone number — to identify the order and contact you about it.</li>
        <li>Your delivery address — to ship the books and to print the courier label.</li>
        <li>Order details — the set you bought, quantity, amount, invoice number and order history.</li>
        <li>Payment status — we receive confirmation from Razorpay. We never see or store your card, UPI or bank details.</li>
        <li>Consent record — if you tick the marketing box, we store the time, the wording you agreed to, and the IP address, so we can prove the consent was freely given.</li>
      </UL>

      <H2>Why we collect it</H2>
      <UL>
        <li>To take payment, confirm your order and issue a Bill of Supply.</li>
        <li>To pack, dispatch and deliver your set, and to let you track it.</li>
        <li>To answer support questions and process cancellations or refunds.</li>
        <li>To meet tax and accounting obligations.</li>
        <li>To send occasional updates about books and courses — only if you explicitly opted in.</li>
      </UL>

      <H2>Who we share it with</H2>
      <P>
        We do not sell your data, and we never share it for someone else&apos;s advertising. We share
        the minimum needed with service providers who help fulfil your order:
      </P>
      <UL>
        <li>Razorpay — payment processing. They handle payment details directly; we only receive the result.</li>
        <li>Our courier partner — name, address and phone, printed on the shipping label so the parcel reaches you.</li>
        <li>Resend — sends your order emails (confirmation, dispatch, refund, sign-in links).</li>
        <li>Google (Sheets/Apps Script) — an internal, private mirror of order records used by our team for fulfilment.</li>
        <li>Google Analytics — anonymous usage measurement (pages viewed, device, approximate location). It never receives your name, address, phone or payment details.</li>
        <li>Our hosting and database provider — stores the order records that run this store.</li>
      </UL>
      <P>
        We may also disclose data where the law requires it, or to protect against fraud or abuse.
      </P>

      <H2>Marketing consent</H2>
      <P>
        The marketing checkbox at checkout is <strong>never pre-ticked</strong>. You can buy without
        agreeing to it, and you can withdraw at any time by emailing us or using the unsubscribe link
        in any marketing email. Withdrawing does not affect the transactional emails about an order
        you have already placed.
      </P>

      <H2>How long we keep it</H2>
      <P>
        Order records, invoices and the related personal data are retained for as long as tax and
        company-law rules require (currently eight years for financial records). Marketing consent is
        kept until you withdraw it. Sign-in links and one-time codes expire in 15 minutes and are
        stored only as a hash — never as readable text.
      </P>

      <H2>How we protect it</H2>
      <UL>
        <li>The whole store runs over HTTPS.</li>
        <li>There are no passwords to leak — sign-in uses a single-use, short-lived link or code.</li>
        <li>Payment credentials never touch our servers; Razorpay handles them.</li>
        <li>Access to order data is limited to the people who fulfil and support orders.</li>
      </UL>

      <H2>Your rights</H2>
      <P>
        Under India&apos;s Digital Personal Data Protection Act, 2023 you can ask us to: confirm what
        data we hold about you, correct anything inaccurate, erase data we no longer need to keep,
        or withdraw a consent you gave. Email{" "}
        <a href={`mailto:${SELLER.email}`} className="font-semibold text-lc-green-700 underline underline-offset-4">
          {SELLER.email}
        </a>{" "}
        from the address you ordered with, and we will respond within 30 days. If you are not
        satisfied with our response, you may raise the matter with the Data Protection Board of India.
      </P>

      <H2>Children</H2>
      <P>
        The store is intended for adults and for students preparing for postgraduate entrance exams.
        If you are under 18, please have a parent or guardian place the order.
      </P>

      <H2>Cookies and analytics</H2>
      <P>
        We use what the store needs to work — a session cookie once you sign in to track an order,
        and the checkout security cookies Razorpay sets. We also run Google Analytics, loaded through
        Google Tag Manager, to understand how the store is used. It sets its own cookies and records
        visit data such as the pages you view, an approximate location and your device type. The same
        measurement runs on learncrew.org, so a visit that starts there and ends here is counted once
        rather than twice.
      </P>
      <P>
        This is measurement only. We do not run advertising cookies, we do not build advertising
        profiles, and we never sell or share your data for someone else&apos;s advertising. You can
        block analytics cookies in your browser settings or with an ad-blocker — the store, checkout
        and order tracking all work normally without them.
      </P>

      <H2>Digital products</H2>
      <P>
        eBooks, mock tests and recorded courses are sold on our learning platform, not here. Clicking
        through takes you to that platform, which handles its own accounts and data. Its privacy
        terms apply there.
      </P>

      <H2>Changes and contact</H2>
      <P>
        If this policy changes we will update the date at the top of this page. For any privacy
        question or request, contact {SELLER.displayName}, {SELLER.displayAddress} —{" "}
        <a href={`mailto:${SELLER.email}`} className="font-semibold text-lc-green-700 underline underline-offset-4">
          {SELLER.email}
        </a>
        , {SELLER.phone}.
      </P>
    </LegalPage>
  );
}
