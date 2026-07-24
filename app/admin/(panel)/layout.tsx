import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/container";
import { AdminNav } from "@/components/admin/nav";
import { getAdminUser } from "@/app/admin/_lib/session";

// Guards EVERY page in the panel (§14): only ADMIN_EMAIL, via the signed lc_admin cookie.
// force-dynamic so admin views always reflect live DB state (orders, stock, sync jobs).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect("/admin/login");

  return (
    <Container className="py-8">
      <AdminNav adminEmail={admin.email} />
      {children}
    </Container>
  );
}
