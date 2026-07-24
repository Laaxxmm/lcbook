import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { OtpForm } from "@/components/store/otp-form";

// OTP code entry (§8). Reached after requesting a 6-digit code on /login.
export const metadata: Metadata = { title: "Enter your code", robots: { index: false } };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const email = typeof sp.email === "string" ? sp.email : "";
  if (!email) redirect("/login");
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : undefined;

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-extrabold tracking-tight text-lc-green-800">Enter your code</h1>
        <OtpForm email={email} next={next} />
      </div>
    </Container>
  );
}
