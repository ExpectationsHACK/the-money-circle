"use client";

import { useEffect, useState } from "react";

type Phase = "choose" | "processing" | "done" | "failed";

/** A Paystack-style payment sheet that moves no money. Used when PAYMENT_MODE=demo. */
export function DemoPaySheet({
  email,
  amountLabel,
  onSuccess,
  onClose,
}: {
  email: string;
  amountLabel: string;
  onSuccess: () => Promise<void>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [method, setMethod] = useState<"card" | "transfer" | "ussd">("card");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && phase === "choose" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  async function pay(succeed: boolean) {
    setPhase("processing");
    await new Promise((r) => setTimeout(r, 1400));
    if (!succeed) return setPhase("failed");
    setPhase("done");
    await onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/60 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true" aria-label="Demo payment">
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-paper shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between bg-forest px-6 py-4 text-cream">
          <div>
            <p className="text-xs text-cream/60">{email}</p>
            <p className="font-display text-xl font-bold">Pay {amountLabel}</p>
          </div>
          {phase === "choose" && (
            <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/10 text-lg" aria-label="Close">×</button>
          )}
        </div>
        <div className="bg-gold/20 px-6 py-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-ink">
          Demo checkout · no money will move
        </div>

        <div className="p-6">
          {phase === "choose" && (
            <>
              <div className="grid grid-cols-3 gap-2 text-sm font-semibold">
                {(["card", "transfer", "ussd"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`rounded-xl border px-2 py-2.5 capitalize transition ${method === m ? "border-forest bg-forest/5 ring-1 ring-forest" : "border-line"}`}
                  >
                    {m === "ussd" ? "USSD" : m}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-cream p-4 text-sm">
                {method === "card" && <p>Demo card <span className="font-mono font-bold">•••• •••• •••• 4081</span>, exp 12/30</p>}
                {method === "transfer" && <p>Transfer to <span className="font-mono font-bold">Demo Bank 9900112233</span></p>}
                {method === "ussd" && <p>Dial <span className="font-mono font-bold">*737*000*1234#</span></p>}
                <p className="mt-1 text-xs text-muted">Simulated payment method for previewing the flow.</p>
              </div>
              <button onClick={() => pay(true)} className="mt-5 w-full rounded-2xl bg-gold py-4 font-display text-lg font-bold text-ink hover:bg-gold-soft">
                Simulate successful payment
              </button>
              <button onClick={() => pay(false)} className="mt-2 w-full rounded-2xl py-2.5 text-sm font-semibold text-muted hover:text-ink">
                Simulate a declined payment
              </button>
            </>
          )}

          {phase === "processing" && (
            <div className="py-10 text-center" aria-live="polite">
              <div className="mx-auto size-12 animate-spin rounded-full border-4 border-line border-t-forest" />
              <p className="mt-4 font-semibold">Processing payment…</p>
            </div>
          )}

          {phase === "done" && (
            <div className="py-8 text-center" aria-live="polite">
              <div className="mx-auto grid size-14 place-items-center rounded-full bg-forest text-2xl text-gold">✓</div>
              <p className="mt-4 font-display text-xl font-bold">Payment successful</p>
              <p className="mt-1 text-sm text-muted">Building your Money Circle…</p>
            </div>
          )}

          {phase === "failed" && (
            <div className="py-6 text-center" aria-live="polite">
              <p className="font-display text-xl font-bold text-coral">Payment declined</p>
              <p className="mt-1 text-sm text-muted">This is what a failed card looks like. Nothing was charged.</p>
              <button onClick={() => setPhase("choose")} className="mt-5 w-full rounded-2xl bg-forest py-3.5 font-bold text-cream">Try again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
