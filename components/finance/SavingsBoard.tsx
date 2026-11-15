"use client";

import Link from "next/link";
import { useState } from "react";
import type { Goal } from "@/lib/finance";
import { goalPlan } from "@/lib/goal-math";
import { addDeposit, createGoal } from "@/app/app/finance-actions";
import { fmt, fmtCompact, toast } from "./cells";

const PLATFORMS = ["PiggyVest", "Cowrywise", "Kuda", "Bank account", "Money market fund", "Ajo / Esusu", "Other"];
const PRESETS = [
  { emoji: "🛟", name: "Emergency fund" },
  { emoji: "🏠", name: "Next year’s rent" },
  { emoji: "✈️", name: "Travel" },
  { emoji: "💻", name: "New laptop" },
  { emoji: "💍", name: "Wedding" },
  { emoji: "🎄", name: "December" },
];

export const PACE: Record<string, { label: string; cls: string }> = {
  done: { label: "Reached 🎉", cls: "bg-moss text-cream" },
  ahead: { label: "Ahead", cls: "bg-moss/15 text-moss" },
  "on-track": { label: "On track", cls: "bg-moss/15 text-moss" },
  behind: { label: "Behind", cls: "bg-coral/15 text-coral" },
  "no-date": { label: "No deadline", cls: "bg-cream text-muted" },
};

export function Ring({ pct, size = 64, stroke = 7, label }: { pct: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(p)}%`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-cream)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={p >= 100 ? "var(--color-moss)" : "var(--color-gold)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .4s" }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-ink font-display font-bold" style={{ fontSize: size * 0.24 }}>
        {Math.round(p)}%
      </text>
    </svg>
  );
}

export function SavingsBoard(props: {
  goals: Goal[];
  trend: { month: string; label: string; total: number }[];
  monthIncome: number;
  streak: number;
}) {
  const [goals, setGoals] = useState(props.goals);
  const [trend, setTrend] = useState(props.trend);
  const [form, setForm] = useState({ name: "", emoji: "🎯", target: "", saved: "", due: "", platform: "PiggyVest" });
  const [showForm, setShowForm] = useState(props.goals.length === 0);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const active = goals.filter((g) => !g.achieved_at);
  const done = goals.filter((g) => g.achieved_at);
  const saved = goals.reduce((a, g) => a + Number(g.saved), 0);
  const target = active.reduce((a, g) => a + Number(g.target), 0) + done.reduce((a, g) => a + Number(g.target), 0);
  const thisMonth = trend[trend.length - 1]?.total ?? 0;
  const rate = props.monthIncome ? Math.round((thisMonth / props.monthIncome) * 100) : null;
  const maxT = Math.max(1, ...trend.map((t) => Math.abs(t.total)));
  const hasEmergency = goals.some((g) => /emergenc/i.test(g.name));

  async function move(g: Goal, withdraw: boolean) {
    const amount = amounts[g.id] ?? "";
    if (!amount.trim()) return toast("Enter an amount first", "error");
    setBusy(g.id);
    const r = await addDeposit(g.id, { amount, withdraw });
    setBusy(null);
    if (!r.ok) return toast(r.error, "error");
    setGoals((x) => x.map((y) => (y.id === g.id ? r.data.goal : y)));
    setTrend((t) => t.map((m, i) => (i === t.length - 1 ? { ...m, total: m.total + Number(r.data.deposit.amount) } : m)));
    setAmounts((x) => ({ ...x, [g.id]: "" }));
    const reached = !g.achieved_at && r.data.goal.achieved_at;
    toast(reached ? `🎉 You reached “${g.name}”!` : withdraw ? "Withdrawal recorded" : `+${fmt(Number(r.data.deposit.amount))} saved. Keep going!`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-moss">🌱 Savings</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Your savings goals</h1>
        </div>
        <button onClick={() => setShowForm((x) => !x)} className="rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-cream hover:bg-forest-2">
          {showForm ? "Close" : "+ New goal"}
        </button>
      </div>

      {/* Summary */}
      <section className="grid gap-px overflow-hidden rounded-3xl bg-line ring-1 ring-line sm:grid-cols-4" aria-label="Savings summary">
        <div className="bg-forest p-5 text-cream">
          <p className="text-sm text-cream/70">Total saved</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{fmt(saved)}</p>
          <p className="mt-1 text-xs text-cream/60">{target ? `${Math.round((saved / target) * 100)}% of ${fmtCompact(target)}` : "across all goals"}</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Saved this month</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{fmt(thisMonth)}</p>
          <p className="mt-1 text-xs text-muted">net of withdrawals</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Savings rate</p>
          <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${rate !== null && rate >= 20 ? "text-moss" : ""}`}>{rate === null ? "—" : `${rate}%`}</p>
          <p className="mt-1 text-xs text-muted">{rate === null ? "add income in Budget" : rate >= 20 ? "of income · great work 💪" : "of income · aim for 20%"}</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Saving streak</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{props.streak} {props.streak === 1 ? "month" : "months"}{props.streak >= 3 ? " 🔥" : ""}</p>
          <p className="mt-1 text-xs text-muted">in a row with money saved</p>
        </div>
      </section>

      {/* Monthly bars */}
      <section className="rounded-3xl bg-paper p-5 ring-1 ring-line" aria-label="Money saved per month">
        <h2 className="font-display text-base font-bold">Saved per month</h2>
        <div className="mt-4 flex h-32 items-end gap-3">
          {trend.map((t, i) => (
            <div key={t.month} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${t.label}: ${fmt(t.total)}`}>
              <span className="text-[11px] font-semibold tabular-nums text-muted">{t.total ? fmtCompact(t.total) : ""}</span>
              <span
                className={`block w-full max-w-12 rounded-t-[4px] ${t.total < 0 ? "bg-coral" : i === trend.length - 1 ? "bg-gold" : "bg-moss"}`}
                style={{ height: t.total ? `${Math.max(4, (Math.abs(t.total) / maxT) * 80)}%` : "2px", opacity: t.total ? 1 : 0.3 }}
              />
              <span className="text-xs font-semibold text-muted">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {!hasEmergency && (
        <p className="rounded-2xl bg-gold/20 p-4 text-sm">
          <strong>Coach tip:</strong> start with an emergency fund of 3 to 6 months of your needs. It stops one bad month from turning into debt.
        </p>
      )}

      {/* New goal */}
      {showForm && (
        <form
          className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await createGoal(form);
            if (!r.ok) return toast(r.error, "error");
            setGoals((x) => [...x, r.data]);
            setForm({ name: "", emoji: "🎯", target: "", saved: "", due: "", platform: "PiggyVest" });
            setShowForm(false);
            toast(`“${r.data.name}” created 🌱`);
          }}
        >
          <h2 className="font-display text-lg font-bold">New savings goal</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button type="button" key={p.name} onClick={() => setForm((f) => ({ ...f, name: p.name, emoji: p.emoji }))} className="rounded-full bg-cream px-3 py-1.5 text-sm font-semibold hover:bg-gold/25">
                {p.emoji} {p.name}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[4.5rem_1fr_10rem_10rem]">
            <label className="text-sm font-semibold">Icon<input value={form.emoji} maxLength={8} onChange={(e) => setForm((f) => ({ ...f, emoji: e.target.value }))} className="mt-1 block w-full rounded-xl border border-line bg-paper px-2 py-2.5 text-center text-lg outline-none focus:border-forest" /></label>
            <label className="text-sm font-semibold">Goal<input value={form.name} required maxLength={60} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Emergency fund" className="mt-1 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-forest" /></label>
            <label className="text-sm font-semibold">Target<input value={form.target} required inputMode="decimal" onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder="₦ 1.2m" className="mt-1 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-forest" /></label>
            <label className="text-sm font-semibold">Already saved<input value={form.saved} inputMode="decimal" onChange={(e) => setForm((f) => ({ ...f, saved: e.target.value }))} placeholder="₦ 0" className="mt-1 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-forest" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Target date<input type="date" value={form.due} onChange={(e) => setForm((f) => ({ ...f, due: e.target.value }))} className="mt-1 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-forest" /></label>
            <label className="text-sm font-semibold sm:col-span-2">Where you’re saving it
              <select value={form.platform} onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))} className="mt-1 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 outline-none focus:border-forest">
                {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <button className="mt-4 rounded-xl bg-gold px-5 py-2.5 font-bold text-ink hover:bg-gold-soft">Create goal</button>
        </form>
      )}

      {/* Goals */}
      {goals.length === 0 && !showForm && (
        <div className="rounded-3xl bg-paper px-6 py-12 text-center ring-1 ring-line">
          <p className="text-4xl" aria-hidden>🌱</p>
          <p className="mt-3 font-display text-lg font-bold">No goals yet</p>
          <p className="mt-1 text-sm text-muted">Every big thing starts as a small, named goal.</p>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {active.map((g) => {
          const plan = goalPlan(g);
          const p = Number(g.target) ? (Number(g.saved) / Number(g.target)) * 100 : 0;
          return (
            <article key={g.id} className="min-w-0 rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
              <div className="flex items-start gap-4">
                <Ring pct={p} label={`${g.name}: ${Math.round(p)}% saved`} />
                <div className="min-w-0 flex-1">
                  <Link href={`/app/savings/${g.id}`} className="group block">
                    <h2 className="truncate font-display text-lg font-bold group-hover:text-moss group-hover:underline">{g.emoji} {g.name}</h2>
                  </Link>
                  <p className="font-display text-xl font-bold tabular-nums">
                    {fmt(Number(g.saved))} <span className="text-sm font-semibold text-muted">of {fmt(Number(g.target))}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-bold ${PACE[plan.pace].cls}`}>{PACE[plan.pace].label}</span>
                    <span className="text-muted">{g.platform}{g.due_on ? ` · by ${new Date(g.due_on).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}` : ""}</span>
                  </div>
                </div>
              </div>
              {plan.perMonth ? (
                <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-sm">
                  Save <strong className="tabular-nums">{fmt(plan.perMonth)}</strong>/month for {plan.monthsLeft} month{plan.monthsLeft === 1 ? "" : "s"} to hit it on time.
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <input
                  value={amounts[g.id] ?? ""}
                  onChange={(e) => setAmounts((x) => ({ ...x, [g.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), move(g, false))}
                  inputMode="decimal"
                  placeholder="₦ amount"
                  aria-label={`Amount for ${g.name}`}
                  className="w-full min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm tabular-nums outline-none focus:border-forest"
                />
                <button disabled={busy === g.id} onClick={() => move(g, false)} className="rounded-xl bg-forest px-3 py-2 text-sm font-bold text-cream hover:bg-forest-2 disabled:opacity-60">+ Save</button>
                <button disabled={busy === g.id} onClick={() => move(g, true)} className="rounded-xl px-3 py-2 text-sm font-semibold text-muted ring-1 ring-line hover:text-coral disabled:opacity-60">Withdraw</button>
              </div>
            </article>
          );
        })}
      </div>

      {done.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold">Reached 🎉</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {done.map((g) => (
              <Link key={g.id} href={`/app/savings/${g.id}`} className="flex items-center gap-3 rounded-2xl bg-moss/10 p-4 ring-1 ring-moss/20 hover:bg-moss/15">
                <span className="text-2xl" aria-hidden>{g.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{g.name}</span>
                  <span className="text-xs text-muted">{fmt(Number(g.saved))} · reached {new Date(g.achieved_at!).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
