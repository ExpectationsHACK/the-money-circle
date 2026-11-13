import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Chrome";
import { currentStudent } from "@/lib/auth";
import { env } from "@/lib/env";
import { requestLoginLink, tryDemoAccount } from "./actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (await currentStudent()) redirect("/app");
  const sp = await searchParams;
  const demo = env.paymentMode() === "demo";

  return (
    <div className="grain flex min-h-screen flex-col bg-forest text-cream">
      <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <Logo light />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-24">
        <h1 className="font-display text-4xl font-bold tracking-tight">Welcome back to the Circle.</h1>
        <p className="mt-3 text-cream/70">Enter the email you enrolled with. We’ll send you a one-tap sign-in link. No password to forget.</p>

        {sp.sent ? (
          <div className="mt-8 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <p className="font-semibold text-gold">Check your inbox ✉️</p>
            <p className="mt-1 text-sm text-cream/75">If that email belongs to a student, a sign-in link is on its way. It expires in 30 minutes.</p>
            {sp.link && (
              <a href={sp.link} className="mt-4 block rounded-xl bg-gold px-4 py-3 text-center font-bold text-ink">
                Demo mode: open the sign-in link
              </a>
            )}
          </div>
        ) : (
          <form action={requestLoginLink} className="mt-8">
            <label className="block text-sm font-semibold">
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-1.5 block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-base text-cream outline-none placeholder:text-cream/35 focus:border-gold"
              />
            </label>
            {sp.error && <p className="mt-3 text-sm text-coral">{sp.error}</p>}
            <button className="mt-4 w-full rounded-xl bg-gold px-4 py-3.5 font-bold text-ink transition hover:bg-gold-soft">
              Email me a sign-in link
            </button>
          </form>
        )}

        {demo && (
          <form action={tryDemoAccount} className="mt-8 border-t border-white/10 pt-6">
            <p className="text-sm text-cream/60">Just looking around?</p>
            <button className="mt-2 w-full rounded-xl border border-cream/25 px-4 py-3 font-semibold transition hover:bg-white/5">
              Explore a demo account with sample data
            </button>
          </form>
        )}

        <p className="mt-10 text-sm text-cream/55">
          Not a student yet? <Link href="/#packages" className="font-semibold text-gold underline">Find your package</Link>
        </p>
      </main>
    </div>
  );
}
