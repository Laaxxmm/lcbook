import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { LoginForm } from "@/components/store/login-form";

// Returning-customer sign-in (§8): magic link (primary) or 6-digit email OTP. No SMS, no
// passwords, no reset flow. Order-id + phone is the third route, on /track.
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : undefined;

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight text-lc-green-800">Sign in</h1>
        <p className="mt-2 text-[15px] text-lc-green-400">
          No passwords here. We&apos;ll email you a one-time sign-in link (or a 6-digit code) to see
          and track your orders.
        </p>
        <LoginForm next={next} />
        <p className="mt-6 text-[13px] text-lc-green-400">
          Just want to check one order?{" "}
          <Link href="/track" className="font-semibold text-lc-green-700 underline underline-offset-4">
            Use order ID + phone
          </Link>
          .
        </p>
      </div>
    </Container>
  );
}
