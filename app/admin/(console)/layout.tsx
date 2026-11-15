import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Chrome";
import { AdminSideNav, AdminTopNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin-auth";
import { one } from "@/lib/db";
import { env } from "@/lib/env";
import { adminLogout } from "../actions";

export const metadata: Metadata = { title: { default: "Coach console", template: "%s · Coach console" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const pending = await one<{ n: number }>("SELECT COUNT(*) n FROM enrollments WHERE status IN ('awaiting-transfer', 'failed')");
  const badges = { "/admin/enrollments": Number(pending?.n ?? 0) };

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="grain sticky top-0 hidden h-screen flex-col bg-ink p-5 lg:flex">
        <Logo light />
        <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">Coach console</p>
        <AdminSideNav badges={badges} />
        <div className="mt-auto space-y-1 text-sm">
          <Link href="/" className="block rounded-xl px-3 py-2 font-semibold text-cream/60 hover:bg-white/5 hover:text-cream">View website ↗</Link>
          <form action={adminLogout}>
            <button className="w-full rounded-xl px-3 py-2 text-left font-semibold text-cream/60 hover:bg-white/5 hover:text-cream">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="bg-ink pt-3 lg:hidden">
          <div className="flex items-center justify-between px-4 pb-3">
            <Logo light />
            <form action={adminLogout}>
              <button className="text-xs font-semibold text-cream/60">Sign out</button>
            </form>
          </div>
          <AdminTopNav badges={badges} />
        </header>
        {env.paymentMode() === "demo" && (
          <div className="bg-gold/25 px-4 py-1.5 text-center text-xs font-semibold text-ink">Demo mode: payments are simulated, so revenue includes demo enrollments</div>
        )}
        <main className="mx-auto max-w-6xl space-y-6 px-4 pb-20 pt-6 sm:px-6 lg:pt-10">{children}</main>
      </div>
    </div>
  );
}
