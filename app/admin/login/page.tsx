import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdminUser } from "@/app/admin/_lib/session";

// Admin sign-in (§14). Unguarded (it IS the gate). Already signed in → straight to the panel.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin sign-in", robots: { index: false } };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getAdminUser()) redirect("/admin");
  const sp = await searchParams;

  return (
    <Container className="py-14">
      <div className="mx-auto max-w-md">
        <div className="text-[13px] font-semibold uppercase tracking-wide text-lc-gold">Learn Crew · Admin</div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-lc-green-800">Sign in</h1>
        <p className="mt-2 text-[15px] text-lc-green-400">
          Single admin, no passwords. We&apos;ll email a one-time sign-in link to the configured admin address.
        </p>
        {sp.error && (
          <p role="alert" className="mt-4 rounded-[10px] bg-red-50 px-3 py-2 text-sm text-red-700">
            That sign-in link was invalid or expired. Request a fresh one.
          </p>
        )}
        <AdminLoginForm />
      </div>
    </Container>
  );
}
