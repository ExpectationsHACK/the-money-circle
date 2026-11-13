import type { Metadata } from "next";
import { Logo } from "@/components/Chrome";
import { AdminPanel } from "@/components/AdminPanel";
import { PACKAGES, formatNaira } from "@/lib/packages";

export const metadata: Metadata = { title: "Coach console", robots: { index: false, follow: false } };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const offers = PACKAGES.flatMap((p) => p.offers.map((o) => ({ slug: o.slug, label: `${p.name} · ${o.label} (${formatNaira(o.priceNaira)})` })));
  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6">
        <AdminPanel offers={offers} prefill={{ ref: sp.ref, name: sp.name, email: sp.email, phone: sp.phone, offer: sp.offer }} />
      </main>
    </div>
  );
}
