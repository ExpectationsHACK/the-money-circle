import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Chrome";
import { env } from "@/lib/env";
import { findOffer } from "@/lib/packages";
import { parseMetadata, verifyTransaction, type PaystackTransaction } from "@/lib/paystack";
import { enrollStudent } from "@/lib/onboarding";
import { whatsappLink } from "@/lib/site";
import { one } from "@/lib/db";
import { currentStudent } from "@/lib/auth";

export const metadata: Metadata = { title: "Welcome to the Circle", robots: { index: false } };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type State = { kind: "success"; name: string; pkgName: string; email: string } | { kind: "pending" } | { kind: "failed"; reason: string };

async function resolve(reference: string | undefined): Promise<State> {
  if (!reference) return { kind: "failed", reason: "No payment reference was provided." };

  if (reference.startsWith("DEMO-")) {
    const row = await one<{ email: string; offer_slug: string; full_name: string | null }>(
      `SELECT e.email, e.offer_slug, s.full_name FROM enrollments e LEFT JOIN students s ON s.id = e.student_id WHERE e.reference = ?`,
      [reference],
    );
    if (!row) return { kind: "failed", reason: "We couldn’t find that demo payment." };
    return {
      kind: "success",
      name: (row.full_name ?? "").split(" ")[0] || "friend",
      pkgName: findOffer(row.offer_slug)?.pkg.name ?? "The Money Circle",
      email: row.email,
    };
  }

  let tx: PaystackTransaction;
  try {
    tx = await verifyTransaction(reference);
  } catch {
    return { kind: "failed", reason: "We couldn’t verify this payment yet." };
  }
  if (tx.status === "ongoing" || tx.status === "pending") return { kind: "pending" };
  if (tx.status !== "success") return { kind: "failed", reason: `Payment status: ${tx.status}.` };

  const meta = parseMetadata(tx.metadata);
  const found = meta.offer ? findOffer(meta.offer) : null;
  const name = (meta.full_name ?? "").split(" ")[0] || "friend";

  // Webhooks can't reach localhost — in development, onboard from here instead.
  if (env.onboardOnCallback() && found && tx.amount >= found.offer.priceNaira * 100) {
    await enrollStudent({
      reference: tx.reference,
      fullName: meta.full_name || tx.customer.email,
      email: tx.customer.email,
      phone: meta.phone || "",
      offerSlug: found.offer.slug,
      amountNaira: tx.amount / 100,
      channel: `paystack:${tx.channel}`,
    }).catch((e) => console.error("[success] onboarding failed", e));
  }

  return { kind: "success", name, pkgName: found?.pkg.name ?? "The Money Circle", email: tx.customer.email };
}

export default async function SuccessPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const state = await resolve(sp.reference ?? sp.trxref);
  const signedIn = Boolean(await currentStudent());
  const wa = whatsappLink(`Hi Money Buddy! I need help with my payment. Reference: ${sp.reference ?? sp.trxref ?? "n/a"}`);

  return (
    <div className="grain flex min-h-screen flex-col bg-forest text-cream">
      <header className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
        <Logo light />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 pb-24 sm:px-6">
        {state.kind === "success" ? (
          <>
            <div className="grid size-16 place-items-center rounded-full bg-gold text-3xl text-ink">✓</div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-gold">Payment confirmed</p>
            <h1 className="mt-3 font-display text-5xl font-bold leading-[1.05] tracking-tight">
              Welcome to the Circle, {state.name}.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-cream/75">
              Your spot in <strong className="text-cream">{state.pkgName}</strong> is secured. Your official acceptance letter is
              on its way to <strong className="text-cream">{state.email}</strong> right now, with your private Vault link,
              community access and your booking link.
            </p>
            <Link
              href={signedIn ? "/app" : "/login"}
              className="mt-8 inline-block rounded-2xl bg-gold px-7 py-4 text-center font-bold text-ink transition hover:bg-gold-soft"
            >
              {signedIn ? "Enter your Money Circle →" : "Sign in to your Money Circle →"}
            </Link>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {["Read your acceptance letter", "Set up your budget in the app", "Book your first session"].map((s, i) => (
                <div key={s} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                  <p className="font-display text-sm font-bold text-gold">0{i + 1}</p>
                  <p className="mt-1 text-sm">{s}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-cream/55">
              Can’t find it in a few minutes? Check Promotions or Spam, or {wa ? <a href={wa} className="underline">message us on WhatsApp</a> : "reply to any of our emails"}.
            </p>
          </>
        ) : state.kind === "pending" ? (
          <>
            <h1 className="font-display text-4xl font-bold">Your payment is still processing…</h1>
            <p className="mt-4 text-cream/75">This can take a minute for transfers and USSD. Your acceptance letter will arrive automatically once it clears.</p>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl font-bold">Hmm, we couldn’t confirm that payment.</h1>
            <p className="mt-4 text-cream/75">{state.reason} If you were debited, don’t worry: your onboarding runs automatically once Paystack confirms it.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/#packages" className="rounded-2xl bg-gold px-6 py-3.5 text-center font-bold text-ink">Try again</Link>
              {wa && <a href={wa} className="rounded-2xl border border-cream/25 px-6 py-3.5 text-center font-semibold">Get help on WhatsApp</a>}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
