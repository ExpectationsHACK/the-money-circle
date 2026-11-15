"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Category } from "@/lib/finance";
import { createExpense } from "@/app/app/finance-actions";
import { fmt, toast } from "./cells";

/** Compact "log an expense" form for the Home dashboard. */
export function QuickExpense({ categories, today }: { categories: Category[]; today: string }) {
  const router = useRouter();
  const [f, setF] = useState({ amount: "", category: "", note: "", date: today, method: "transfer" });
  const [busy, setBusy] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const field = "mt-1 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-base outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await createExpense(f);
        setBusy(false);
        if (!r.ok) return toast(r.error, "error");
        toast(`Logged ${fmt(Number(r.data.amount))}`);
        setF((x) => ({ ...x, amount: "", note: "" }));
        amountRef.current?.focus();
        router.refresh();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr]">
        <label className="text-sm font-semibold">
          Amount
          <input ref={amountRef} value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} inputMode="decimal" required placeholder="₦ 4,500 or 4.5k" className={field} />
        </label>
        <label className="text-sm font-semibold">
          Category
          <select value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))} required className={field}>
            <option value="" disabled>Choose…</option>
            {categories.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">
          What for? <span className="font-normal text-muted">(optional)</span>
          <input value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} maxLength={120} placeholder="Bolt to work" className={field} />
        </label>
        <label className="text-sm font-semibold">
          Date
          <input type="date" value={f.date} max={today} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} className={field} />
        </label>
      </div>
      <button disabled={busy} className="mt-4 w-full rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-ink hover:bg-gold-soft disabled:opacity-60 sm:w-auto">
        {busy ? "Logging…" : "Log expense"}
      </button>
    </form>
  );
}
