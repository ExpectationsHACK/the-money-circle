import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Chrome";
import { isAdminSession } from "@/lib/admin-auth";
import { env } from "@/lib/env";
import { adminLogin } from "../actions";

export const metadata: Metadata = { title: "Coach console", robots: { index: false, follow: false } };

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  if (await isAdminSession()) redirect("/admin");
  const sp = await searchParams;
  const configured = Boolean(env.adminSecret());

  return (
    <div className="grain flex min-h-screen flex-col items-center justify-center bg-ink px-4 text-cream">
      <div className="w-full max-w-sm">
        <Logo light />
        <h1 className="mt-8 font-display text-3xl font-bold">Coach console</h1>
        {configured ? (
          <form action={adminLogin} className="mt-6">
            <input type="hidden" name="next" value={sp.next ?? ""} />
            <label className="block text-sm font-semibold">
              Admin secret
              <input
                name="secret"
                type="password"
                required
                autoFocus
                autoComplete="current-password"
                className="mt-1.5 block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-cream outline-none focus:border-gold"
              />
            </label>
            {sp.error && <p className="mt-3 text-sm text-coral">That secret didn’t match.</p>}
            <button className="mt-4 w-full rounded-xl bg-gold px-4 py-3 font-bold text-ink hover:bg-gold-soft">Unlock</button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-cream/70">Set <code className="rounded bg-white/10 px-1">ADMIN_SECRET</code> in your environment to enable the console.</p>
        )}
      </div>
    </div>
  );
}
