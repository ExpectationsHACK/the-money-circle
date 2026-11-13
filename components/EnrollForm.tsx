"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DemoPaySheet } from "./DemoPaySheet";

export interface BankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

type Mode = "card" | "transfer";

const field =
  "mt-1.5 block w-full rounded-xl border border-line bg-paper px-4 py-3 text-base outline-none transition placeholder:text-muted/60 focus:border-forest focus:ring-2 focus:ring-forest/15";

export function EnrollForm({
  offer,
  priceLabel,
  bank,
  whatsappHref,
}: {
  offer: string;
  priceLabel: string;
  bank: BankDetails | null;
  whatsappHref: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("card");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [demo, setDemo] = useState<{ reference: string; body: Record<string, unknown>; email: string } | null>(null);

  async function completeDemo() {
    if (!demo) return;
    const res = await fetch("/api/demo/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...demo.body, reference: demo.reference }),
    });
    const json = await res.json();
    if (!res.ok) {
      setDemo(null);
      setBusy(false);
      setError(json.error ?? "Demo payment failed");
      return;
    }
    router.push(json.redirect);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = {
      fullName: String(fd.get("fullName") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      offer,
      note: String(fd.get("note") ?? "") || undefined,
    };
    setBusy(true);
    try {
      if (mode === "transfer") {
        const res = await fetch("/api/bank-transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Something went wrong");
        setTransferRef(json.reference);
        return;
      }

      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Something went wrong");

      if (json.demo) {
        setDemo({ reference: json.reference, body, email: body.email });
        return;
      }

      try {
        const { default: PaystackPop } = await import("@paystack/inline-js");
        const popup = new PaystackPop();
        popup.resumeTransaction(json.accessCode, {
          onSuccess: (tx) => router.push(`/enroll/success?reference=${encodeURIComponent(tx.reference ?? json.reference)}`),
          onCancel: () => {
            setBusy(false);
            setError("Payment window closed. Your spot isn’t secured yet. Try again whenever you’re ready.");
          },
          onError: (err) => {
            setBusy(false);
            setError(err?.message || "Payment could not load. Redirecting to secure checkout…");
            window.location.href = json.authorizationUrl;
          },
        });
      } catch {
        // Popup blocked or script failed: fall back to Paystack's hosted page.
        window.location.href = json.authorizationUrl;
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    } finally {
      if (mode === "transfer") setBusy(false);
    }
  }

  if (transferRef) {
    return (
      <div className="rounded-3xl bg-paper p-7 ring-1 ring-line">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Transfer received for review</p>
        <h2 className="mt-2 font-display text-2xl font-bold">Thank you! We’re confirming your payment.</h2>
        <p className="mt-3 leading-relaxed text-muted">
          As soon as we see your transfer, your Money Vault is built and your acceptance letter lands in your inbox automatically.
          This usually takes less than a few hours during business hours.
        </p>
        <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm">
          Your reference: <strong className="font-mono">{transferRef}</strong>
        </p>
        {whatsappHref && (
          <a
            href={`${whatsappHref}${encodeURIComponent(` My transfer reference is ${transferRef}.`)}`}
            className="mt-5 block rounded-2xl bg-forest px-5 py-3.5 text-center font-bold text-cream hover:bg-forest-2"
          >
            Send proof of payment on WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <>
    {demo && (
      <DemoPaySheet
        email={demo.email}
        amountLabel={priceLabel}
        onSuccess={completeDemo}
        onClose={() => {
          setDemo(null);
          setBusy(false);
        }}
      />
    )}
    <form onSubmit={onSubmit} className="rounded-3xl bg-paper p-6 ring-1 ring-line sm:p-8">
      <h2 className="font-display text-2xl font-bold">Your details</h2>
      <p className="mt-1 text-sm text-muted">Your acceptance letter and Money Vault will be sent to this email.</p>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">
          Full name
          <input name="fullName" required minLength={3} autoComplete="name" placeholder="Adaeze Okafor" className={field} />
        </label>
        <label className="block text-sm font-semibold">
          Email address
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={field} />
          <span className="mt-1 block text-xs font-normal text-muted">Use a Gmail address if you can. It makes opening your Vault seamless.</span>
        </label>
        <label className="block text-sm font-semibold">
          Phone number (WhatsApp)
          <input name="phone" type="tel" required autoComplete="tel" placeholder="0803 123 4567" className={field} />
        </label>
      </div>

      {bank && (
        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">How would you like to pay?</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(
              [
                ["card", "Card / USSD / Transfer", "Instant via Paystack"],
                ["transfer", "Direct bank transfer", "Confirmed manually"],
              ] as const
            ).map(([m, title, sub]) => (
              <label
                key={m}
                className={`cursor-pointer rounded-xl border p-3 text-sm transition ${mode === m ? "border-forest bg-forest/5 ring-1 ring-forest" : "border-line"}`}
              >
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                <span className="block font-semibold">{title}</span>
                <span className="block text-xs text-muted">{sub}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {mode === "transfer" && bank && (
        <div className="mt-4 rounded-2xl bg-cream p-4 text-sm">
          <p className="font-semibold">Transfer exactly {priceLabel} to:</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-muted">Bank</dt>
            <dd className="font-semibold">{bank.bankName}</dd>
            <dt className="text-muted">Account name</dt>
            <dd className="font-semibold">{bank.accountName}</dd>
            <dt className="text-muted">Account no.</dt>
            <dd className="font-mono text-base font-bold tracking-wider">{bank.accountNumber}</dd>
          </dl>
          <label className="mt-4 block text-sm font-semibold">
            Sender name or bank (helps us match it)
            <input name="note" maxLength={300} placeholder="e.g. Sent from GTBank, Adaeze Okafor" className={field} />
          </label>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-5 rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-2xl bg-gold px-5 py-4 font-display text-lg font-bold text-ink transition hover:bg-gold-soft disabled:cursor-wait disabled:opacity-60"
      >
        {busy ? "One moment…" : mode === "transfer" ? "I’ve made the transfer" : `Pay ${priceLabel} securely`}
      </button>
      <p className="mt-3 text-center text-xs text-muted">
        {mode === "transfer" ? "Your onboarding starts as soon as we confirm the transfer." : "Secured by Paystack. We never see or store your card details."}
      </p>
    </form>
    </>
  );
}
