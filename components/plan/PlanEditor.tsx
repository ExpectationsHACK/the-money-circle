"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ALLOCATION_GUIDE,
  ASSET_CLASSES,
  PROFILES,
  analyse,
  completion,

  profileFromScore,
  rid,
  type DebtRow,
  type Freq,
  type MoneyRow,
  type PlanData,
  type PlanRecord,
} from "@/lib/plan-model";
import { parseNaira } from "@/lib/money";
import { applyPlanToGoals, importFromApp, savePlan, submitPlan } from "@/app/app/plan-actions";
import { toast } from "@/components/finance/cells";

const fmt = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const box = "rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/15";

// ---------------------------------------------------------------------------
// Small inputs
// ---------------------------------------------------------------------------

function Money({ value, onChange, label, placeholder = "₦0", className = "" }: { value: number | null; onChange: (v: number | null) => void; label: string; placeholder?: string; className?: string }) {
  const [text, setText] = useState(value === null ? "" : value.toLocaleString("en-NG"));
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setText(value === null ? "" : value.toLocaleString("en-NG"));
  }, [value, focus]);
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onFocus={() => setFocus(true)}
      onChange={(e) => {
        setText(e.target.value);
        const v = e.target.value.trim() === "" ? null : parseNaira(e.target.value);
        if (v === null || !Number.isNaN(v)) onChange(v);
      }}
      onBlur={() => {
        setFocus(false);
        setText(value === null ? "" : value.toLocaleString("en-NG"));
      }}
      className={`${box} w-full text-right tabular-nums ${className}`}
    />
  );
}

function Pct({ value, onChange, label }: { value: number | null; onChange: (v: number | null) => void; label: string }) {
  return (
    <div className="relative">
      <input
        aria-label={label}
        type="number"
        min={0}
        max={100}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Math.min(100, Math.round(Number(e.target.value)))))}
        className={`${box} w-full pr-7 text-right tabular-nums`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
    </div>
  );
}

function Text({ value, onChange, label, placeholder, className = "" }: { value: string; onChange: (v: string) => void; label: string; placeholder?: string; className?: string }) {
  return <input aria-label={label} value={value} placeholder={placeholder} maxLength={200} onChange={(e) => onChange(e.target.value)} className={`${box} w-full ${className}`} />;
}

function DateIn({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return <input aria-label={label} type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${box} w-full`} />;
}

function FreqPick({ value, onChange, label }: { value: Freq; onChange: (v: Freq) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1.5">
      {(["daily", "weekly", "monthly"] as Freq[]).map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={value === f}
          onClick={() => onChange(value === f ? "" : f)}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold capitalize ring-1 transition ${value === f ? "bg-forest text-cream ring-forest" : "bg-paper ring-line hover:bg-cream"}`}
        >
          {value === f ? "☑ " : "☐ "}{f}
        </button>
      ))}
    </div>
  );
}

function Section({ n, title, sub, children }: { n: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">{n}</p>
      <h2 className="mt-1 font-display text-2xl font-bold">{title}</h2>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="text-sm">
      <p className="mb-1 font-semibold">{label}</p>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Money tables (income / savings / debts)
// ---------------------------------------------------------------------------

function MoneyTable({ title, rows, onChange, totalLabel, labelHint, noteHint }: { title: string; rows: MoneyRow[]; onChange: (r: MoneyRow[]) => void; totalLabel: string; labelHint: string; noteHint: string }) {
  const total = rows.reduce((a, r) => a + (r.amount ?? 0), 0);
  const set = (i: number, patch: Partial<MoneyRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="pb-2 font-semibold">{labelHint}</th>
              <th className="w-40 pb-2 text-right font-semibold">Monthly / amount (₦)</th>
              <th className="pb-2 pl-2 font-semibold">{noteHint}</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="py-1 pr-2"><Text value={r.label} onChange={(v) => set(i, { label: v })} label={`${title} row ${i + 1} name`} /></td>
                <td className="py-1"><Money value={r.amount} onChange={(v) => set(i, { amount: v })} label={`${r.label || "Row"} amount`} /></td>
                <td className="py-1 pl-2"><Text value={r.note} onChange={(v) => set(i, { note: v })} label={`${r.label || "Row"} note`} placeholder="Optional" /></td>
                <td className="py-1 pl-1">
                  {rows.length > 1 && (
                    <button type="button" aria-label={`Remove ${r.label || "row"}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-muted hover:text-coral">✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-2">
                <button type="button" onClick={() => onChange([...rows, { id: rid(), label: "", amount: null, note: "" }])} className="text-sm font-semibold text-moss hover:underline">+ Add row</button>
              </td>
              <td className="pt-2 text-right font-display text-lg font-bold tabular-nums">{fmt(total)}</td>
              <td className="pl-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{totalLabel}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function DebtTable({ rows, onChange }: { rows: DebtRow[]; onChange: (r: DebtRow[]) => void }) {
  const set = (i: number, patch: Partial<DebtRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const total = rows.reduce((a, r) => a + (r.owed ?? 0), 0);
  const monthly = rows.reduce((a, r) => a + (r.monthly ?? 0), 0);
  return (
    <div>
      <h3 className="font-display text-lg font-bold">C. Liabilities (debts)</h3>
      <p className="text-xs text-muted">Loan apps, cooperative loans, credit cards, money owed to family. Leave empty if you’re debt-free 🎉</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="pb-2 font-semibold">Debt type</th>
              <th className="w-36 pb-2 text-right font-semibold">Amount owed</th>
              <th className="w-36 pb-2 text-right font-semibold">Monthly payment</th>
              <th className="w-28 pb-2 text-right font-semibold">Interest %</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="py-1 pr-2"><Text value={r.label} onChange={(v) => set(i, { label: v })} label={`Debt ${i + 1} type`} placeholder="e.g. Loan app" /></td>
                <td className="py-1"><Money value={r.owed} onChange={(v) => set(i, { owed: v })} label="Amount owed" /></td>
                <td className="py-1 pl-2"><Money value={r.monthly} onChange={(v) => set(i, { monthly: v })} label="Monthly payment" /></td>
                <td className="py-1 pl-2">
                  <input aria-label="Interest rate" type="number" min={0} max={1000} step="0.1" value={r.rate ?? ""} onChange={(e) => set(i, { rate: e.target.value === "" ? null : Number(e.target.value) })} className={`${box} w-full text-right`} />
                </td>
                <td className="py-1 pl-1">
                  {rows.length > 1 && <button type="button" aria-label="Remove debt" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="rounded-lg px-2 py-1 text-muted hover:text-coral">✕</button>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-2"><button type="button" onClick={() => onChange([...rows, { id: rid(), label: "", owed: null, monthly: null, rate: null }])} className="text-sm font-semibold text-moss hover:underline">+ Add debt</button></td>
              <td className="pt-2 text-right font-display text-lg font-bold tabular-nums">{fmt(total)}</td>
              <td className="pl-2 pt-2 text-right font-semibold tabular-nums text-muted">{fmt(monthly)}/mo</td>
              <td colSpan={2} className="pl-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">Total debt</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The editor
// ---------------------------------------------------------------------------

export function PlanEditor({ record, studentName, coachName, canApplyGoals, bookingUnlockedHref }: { record: PlanRecord; studentName: string; coachName: string; canApplyGoals: boolean; bookingUnlockedHref: string }) {
  const [plan, setPlan] = useState<PlanData>(record.data);
  const [status, setStatus] = useState(record.status);
  const [signature, setSignature] = useState(record.client_signature ?? "");
  const [agree, setAgree] = useState(Boolean(record.client_signature));
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [submittedAt, setSubmittedAt] = useState(record.submitted_at);
  const [busy, setBusy] = useState(false);
  // Last content known to be on the server: only real changes trigger a save.
  const lastSaved = useRef(JSON.stringify(record.data));

  const a = useMemo(() => analyse(plan), [plan]);
  const c = useMemo(() => completion(plan), [plan]);
  const set = <K extends keyof PlanData>(k: K, v: PlanData[K]) => setPlan((p) => ({ ...p, [k]: v }));

  // Debounced autosave.
  useEffect(() => {
    const json = JSON.stringify(plan);
    if (json === lastSaved.current) return;
    setSaveState("dirty");
    const t = setTimeout(async () => {
      setSaveState("saving");
      const r = await savePlan(plan).catch(() => ({ ok: false as const, error: "Network error" }));
      if (r.ok) lastSaved.current = json;
      setSaveState(r.ok ? (JSON.stringify(plan) === lastSaved.current ? "saved" : "dirty") : "error");
      if (!r.ok) toast(r.error, "error");
    }, 900);
    return () => clearTimeout(t);
  }, [plan]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [saveState]);

  const inv = plan.investPlan;
  const setInv = (patch: Partial<PlanData["investPlan"]>) => set("investPlan", { ...inv, ...patch });
  const profile = inv.profile;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_19rem]">
      <div className="min-w-0 space-y-6">
        {/* Header */}
        <header className="grain rounded-3xl bg-forest p-6 text-cream sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">The Money Circle</p>
              <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">Your 6-Month Financial Plan</h1>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "signed" ? "bg-gold text-ink" : status === "submitted" ? "bg-white/15" : "bg-white/10 text-cream/70"}`}>
              {status === "signed" ? "✓ Signed by coach" : status === "submitted" ? "Submitted for review" : "Draft"}
            </span>
          </div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
            <div><dt className="text-cream/60">Client</dt><dd className="font-semibold">{studentName}</dd></div>
            <div><dt className="text-cream/60">Coach</dt><dd className="font-semibold">{coachName}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-cream/60">Duration: 6 months</dt>
              <dd className="mt-1 flex items-center gap-2">
                <input type="date" aria-label="Plan start" value={plan.period.start} onChange={(e) => set("period", { ...plan.period, start: e.target.value })} className="rounded-lg bg-white/10 px-2 py-1 text-cream outline-none [color-scheme:dark]" />
                <span>to</span>
                <input type="date" aria-label="Plan end" value={plan.period.end} onChange={(e) => set("period", { ...plan.period, end: e.target.value })} className="rounded-lg bg-white/10 px-2 py-1 text-cream outline-none [color-scheme:dark]" />
              </dd>
            </div>
          </dl>
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-cream/70">
              <span>{c.pct}% complete</span>
              <span aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes" : saveState === "error" ? "⚠ Not saved" : "✓ Saved"}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${c.pct}%` }} /></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Fill Part 1 with the income, savings and investments already in your app? This replaces those two tables.")) return;
                setBusy(true);
                const r = await importFromApp();
                setBusy(false);
                if (!r.ok) return toast(r.error, "error");
                setPlan((p) => ({ ...p, income: r.data.income.length ? r.data.income : p.income, savings: r.data.savings }));
                toast("Imported from your tracker ✨");
              }}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15"
            >
              ⤓ Import from my tracker
            </button>
            <Link href="/app/plan/print" target="_blank" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/15">🖨 Print / save PDF</Link>
          </div>
        </header>

        {/* PART 1 */}
        <Section n="Part 1" title="Where you are now" sub="Be honest. This is a judgement-free zone, and the clearer the picture, the better the plan.">
          <MoneyTable title="A. Income" rows={plan.income} onChange={(v) => set("income", v)} totalLabel="Total monthly income" labelHint="Source" noteHint="Notes" />
          <MoneyTable title="B. Current savings & investments" rows={plan.savings} onChange={(v) => set("savings", v)} totalLabel="Total saved / invested" labelHint="Account / type" noteHint="Purpose / notes" />
          <DebtTable rows={plan.debts} onChange={(v) => set("debts", v)} />
        </Section>

        {/* PART 2 */}
        <Section n="Part 2" title="Where you want to be" sub="Your 6-month goals.">
          <div className="rounded-2xl bg-gold/15 p-4 sm:p-5">
            <h3 className="font-display text-lg font-bold">A. Primary goal (the big one) ⭐</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem]">
              <Field label="Goal"><Text value={plan.primaryGoal.goal} onChange={(v) => set("primaryGoal", { ...plan.primaryGoal, goal: v })} label="Primary goal" placeholder="e.g. Save for my shop’s first stock" /></Field>
              <Field label="Target amount"><Money value={plan.primaryGoal.target} onChange={(v) => set("primaryGoal", { ...plan.primaryGoal, target: v })} label="Primary goal target" /></Field>
            </div>
            <div className="mt-3">
              <Field label="Why this matters">
                <textarea aria-label="Why this goal matters" rows={2} maxLength={600} value={plan.primaryGoal.why} onChange={(e) => set("primaryGoal", { ...plan.primaryGoal, why: e.target.value })} placeholder="Your real reason. Read it when it gets hard." className={`${box} w-full`} />
              </Field>
            </div>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">B. Supporting goals</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Build an emergency fund of"><Money value={plan.supporting.emergencyFund} onChange={(v) => set("supporting", { ...plan.supporting, emergencyFund: v })} label="Emergency fund goal" /></Field>
              <Field label="Pay off this much debt"><Money value={plan.supporting.debtPayoff} onChange={(v) => set("supporting", { ...plan.supporting, debtPayoff: v })} label="Debt payoff goal" /></Field>
              <Field label="Build an investment portfolio of"><Money value={plan.supporting.portfolio} onChange={(v) => set("supporting", { ...plan.supporting, portfolio: v })} label="Portfolio goal" /></Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Launch / scale income project"><Text value={plan.supporting.incomeProject} onChange={(v) => set("supporting", { ...plan.supporting, incomeProject: v })} label="Income project" placeholder="e.g. Social media management for 3 small businesses" /></Field>
              <label className="flex items-center gap-2 rounded-xl bg-cream px-4 py-2.5 text-sm font-semibold">
                <input type="checkbox" checked={plan.supporting.literacy} onChange={(e) => set("supporting", { ...plan.supporting, literacy: e.target.checked })} className="size-4 accent-[#0f3d2e]" />
                Improve credit score / financial literacy
              </label>
            </div>
            {a.efMonths !== null && plan.supporting.emergencyFund === null && a.income > 0 && (
              <button type="button" onClick={() => set("supporting", { ...plan.supporting, emergencyFund: Math.round((a.income * ((plan.allocation.needs ?? 50) / 100) * 3) / 1000) * 1000 })} className="mt-2 text-xs font-semibold text-moss underline">
                Suggest: 3 months of needs ≈ {fmt(a.income * ((plan.allocation.needs ?? 50) / 100) * 3)}
              </button>
            )}
          </div>
        </Section>

        {/* PART 3 */}
        <Section n="Part 3" title="Your action plan">
          <div>
            <h3 className="font-display text-lg font-bold">A. Monthly budget allocation</h3>
            <p className="text-xs text-muted">Based on your income of {fmt(a.income)}/month.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {(Object.keys(ALLOCATION_GUIDE) as (keyof typeof ALLOCATION_GUIDE)[]).map((k) => {
                const g = ALLOCATION_GUIDE[k];
                const v = plan.allocation[k];
                const off = v !== null && (v < g.min || v > g.max);
                return (
                  <div key={k} className={`rounded-2xl p-3 ring-1 ${off ? "bg-coral/5 ring-coral/30" : "bg-cream/60 ring-line"}`}>
                    <p className="text-sm font-semibold">{g.label} <span className="text-xs font-normal text-muted">({g.min}–{g.max}%)</span></p>
                    <div className="mt-2"><Pct value={v} onChange={(x) => set("allocation", { ...plan.allocation, [k]: x })} label={`${g.label} percent`} /></div>
                    <p className="mt-1.5 text-xs tabular-nums text-muted">≈ {fmt(a.income * ((v ?? 0) / 100))}/month</p>
                  </div>
                );
              })}
            </div>
            <p className={`mt-2 text-sm font-semibold ${a.allocTotal === 100 ? "text-moss" : "text-coral"}`}>Total: {a.allocTotal}% {a.allocTotal === 100 ? "✓" : "(must be 100%)"}</p>
          </div>

          <div>
            <h3 className="font-display text-lg font-bold">B. Savings plan</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Emergency fund target"><Money value={plan.savingsPlan.efTarget} onChange={(v) => set("savingsPlan", { ...plan.savingsPlan, efTarget: v })} label="Emergency fund target" placeholder={plan.supporting.emergencyFund ? plan.supporting.emergencyFund.toLocaleString("en-NG") : "₦0"} /></Field>
              <Field label="by"><DateIn value={plan.savingsPlan.efBy} onChange={(v) => set("savingsPlan", { ...plan.savingsPlan, efBy: v })} label="Emergency fund date" /></Field>
              <Field label="Goal savings"><Money value={plan.savingsPlan.goalAmount} onChange={(v) => set("savingsPlan", { ...plan.savingsPlan, goalAmount: v })} label="Goal savings amount" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="for"><Text value={plan.savingsPlan.goalFor} onChange={(v) => set("savingsPlan", { ...plan.savingsPlan, goalFor: v })} label="Goal savings purpose" placeholder="Rent" /></Field>
                <Field label="by"><DateIn value={plan.savingsPlan.goalBy} onChange={(v) => set("savingsPlan", { ...plan.savingsPlan, goalBy: v })} label="Goal savings date" /></Field>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-cream/60 p-4 ring-1 ring-line">
              <p className="text-sm font-semibold">PiggyVest plan</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_12rem]">
                <FreqPick value={plan.savingsPlan.freq} onChange={(v) => set("savingsPlan", { ...plan.savingsPlan, freq: v })} label="Savings frequency" />
                <Money value={plan.savingsPlan.perDeposit} onChange={(v) => set("savingsPlan", { ...plan.savingsPlan, perDeposit: v })} label="Amount per deposit" placeholder="Per deposit" />
              </div>
              {a.piggyMonthly > 0 && (
                <p className="mt-2 text-xs text-muted">
                  ≈ <strong className="text-ink">{fmt(a.piggyMonthly)}/month</strong>
                  {a.monthsToEf !== null && a.efTarget ? `, so your emergency fund target is ${a.monthsToEf <= 0 ? "already reached 🎉" : `about ${a.monthsToEf} month${a.monthsToEf === 1 ? "" : "s"} away`}` : ""}.
                </p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-bold">C. Debt payoff plan <span className="text-sm font-normal text-muted">(if applicable)</span></h3>
            <div role="radiogroup" aria-label="Debt payoff method" className="mt-3 grid gap-2 sm:grid-cols-3">
              {([
                ["avalanche", "Avalanche", "Highest interest first. Saves the most money."],
                ["snowball", "Snowball", "Smallest balance first. Quick wins."],
                ["other", "Other", "Your own approach"],
              ] as const).map(([id, label, blurb]) => (
                <button
                  type="button"
                  key={id}
                  role="radio"
                  aria-checked={plan.debtPlan.method === id}
                  onClick={() => set("debtPlan", { ...plan.debtPlan, method: plan.debtPlan.method === id ? "" : id })}
                  className={`rounded-2xl p-3 text-left text-sm ring-1 transition ${plan.debtPlan.method === id ? "bg-forest text-cream ring-forest" : "bg-paper ring-line hover:bg-cream"}`}
                >
                  <span className="font-bold">{label}</span>
                  <span className={`block text-xs ${plan.debtPlan.method === id ? "text-cream/70" : "text-muted"}`}>{blurb}</span>
                </button>
              ))}
            </div>
            {plan.debtPlan.method === "other" && <div className="mt-2"><Text value={plan.debtPlan.other} onChange={(v) => set("debtPlan", { ...plan.debtPlan, other: v })} label="Other debt method" placeholder="Describe your method" /></div>}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Monthly extra payment"><Money value={plan.debtPlan.extra} onChange={(v) => set("debtPlan", { ...plan.debtPlan, extra: v })} label="Monthly extra debt payment" /></Field>
              <Field label="Target payoff date"><DateIn value={plan.debtPlan.payoffBy} onChange={(v) => set("debtPlan", { ...plan.debtPlan, payoffBy: v })} label="Debt payoff date" /></Field>
            </div>
          </div>

          <div>
            <h3 className="font-display text-lg font-bold">D. Investment plan</h3>
            <div className="mt-3">
              <Field label={`Risk tolerance: ${inv.riskScore ?? "–"} / 10`} hint="1 = no risk at all, 10 = very comfortable with ups and downs">
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={inv.riskScore ?? 5}
                  aria-label="Risk tolerance score"
                  onChange={(e) => {
                    const score = Number(e.target.value);
                    setInv({ riskScore: score, profile: inv.profile || profileFromScore(score) });
                  }}
                  className="w-full accent-[#0f3d2e]"
                />
              </Field>
            </div>
            <div role="radiogroup" aria-label="Investor profile" className="mt-3 grid gap-2 sm:grid-cols-3">
              {PROFILES.map((pf) => (
                <button
                  type="button"
                  key={pf.id}
                  role="radio"
                  aria-checked={profile === pf.id}
                  onClick={() => setInv({ profile: pf.id })}
                  className={`rounded-2xl p-3 text-left text-sm ring-1 transition ${profile === pf.id ? "bg-forest text-cream ring-forest" : "bg-paper ring-line hover:bg-cream"}`}
                >
                  <span className="font-bold">{pf.label}</span>
                  <span className={`block text-xs ${profile === pf.id ? "text-cream/70" : "text-muted"}`}>{pf.blurb}</span>
                </button>
              ))}
            </div>
            {inv.riskScore && profileFromScore(inv.riskScore) !== profile && profile && (
              <p className="mt-2 text-xs text-muted">Your risk score suggests <strong>{profileFromScore(inv.riskScore)}</strong>. That’s okay; just discuss it with {coachName.split(" ")[0]}.</p>
            )}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="pb-2 font-semibold">Asset class</th>
                    {PROFILES.map((pf) => <th key={pf.id} className={`pb-2 text-center font-semibold ${profile === pf.id ? "text-forest" : ""}`}>{pf.label}</th>)}
                    <th className="w-28 pb-2 text-right font-semibold">Your mix</th>
                    <th className="w-32 pb-2 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ASSET_CLASSES.map((ac) => {
                    const mine = inv.mix[ac.key];
                    return (
                      <tr key={ac.key}>
                        <td className="py-2 pr-2"><span className="font-semibold">{ac.label}</span><span className="block text-xs text-muted">{ac.hint}</span></td>
                        {PROFILES.map((pf) => <td key={pf.id} className={`py-2 text-center tabular-nums ${profile === pf.id ? "font-bold text-forest" : "text-muted"}`}>{ac.mix[pf.id]}%</td>)}
                        <td className="py-2"><Pct value={mine} onChange={(v) => setInv({ mix: { ...inv.mix, [ac.key]: v } })} label={`Your ${ac.label} percent`} /></td>
                        <td className="py-2 text-right tabular-nums">{inv.target && mine ? fmt((inv.target * mine) / 100) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-2 font-semibold">Total</td>
                    <td className="pt-2 text-center text-muted" colSpan={3}>100% each</td>
                    <td className={`pt-2 text-right font-bold ${a.mixTotal === 100 ? "text-moss" : a.mixTotal ? "text-coral" : "text-muted"}`}>{a.mixTotal}%</td>
                    <td className="pt-2 text-right font-bold tabular-nums">{inv.target ? fmt(inv.target) : ""}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {profile && (
              <button
                type="button"
                onClick={() => setInv({ mix: Object.fromEntries(ASSET_CLASSES.map((ac) => [ac.key, ac.mix[profile]])) as PlanData["investPlan"]["mix"] })}
                className="mt-2 text-sm font-semibold text-moss underline"
              >
                Use the suggested {profile} mix
              </button>
            )}

            <div className="mt-5 rounded-2xl bg-cream/60 p-4 ring-1 ring-line">
              <p className="text-sm font-semibold">Funding & contribution plan</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Field label="Investment target"><Money value={inv.target} onChange={(v) => setInv({ target: v })} label="Investment target" /></Field>
                <Field label="Target date"><DateIn value={inv.targetBy} onChange={(v) => setInv({ targetBy: v })} label="Investment target date" /></Field>
                <Field label="Lump sum startup capital"><Money value={inv.lumpSum} onChange={(v) => setInv({ lumpSum: v })} label="Lump sum" /></Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem]">
                <FreqPick value={inv.freq} onChange={(v) => setInv({ freq: v })} label="Investment frequency" />
                <Money value={inv.perContribution} onChange={(v) => setInv({ perContribution: v })} label="Amount per contribution" placeholder="Per contribution" />
              </div>
              {a.investMonthly > 0 && <p className="mt-2 text-xs text-muted">≈ <strong className="text-ink">{fmt(a.investMonthly)}/month</strong> invested{a.plannedInvestMonthly ? ` (your ${plan.allocation.investments}% allocation is ≈ ${fmt(a.plannedInvestMonthly)})` : ""}.</p>}
            </div>
          </div>
        </Section>

        {/* Sign */}
        <section className="rounded-3xl bg-ink p-6 text-cream sm:p-8">
          <p className="font-display text-xl italic text-gold">“A goal without a plan is just a wish.”</p>
          <p className="text-sm text-cream/60">Antoine de Saint-Exupéry</p>
          {c.missing.length > 0 && (
            <div className="mt-5 rounded-2xl bg-white/5 p-4 text-sm ring-1 ring-white/10">
              <p className="font-semibold">Before your session, finish:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-cream/75">{c.missing.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block text-sm font-semibold">
              Signed (client): type your full name
              <input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={studentName} maxLength={80} className="mt-1.5 block w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-display text-xl italic text-cream outline-none placeholder:text-cream/25 focus:border-gold" />
            </label>
            <button
              type="button"
              disabled={busy || !agree || signature.trim().length < 3}
              onClick={async () => {
                setBusy(true);
                const r = await submitPlan(plan, signature);
                setBusy(false);
                if (!r.ok) return toast(r.error, "error");
                setStatus((s) => (s === "signed" ? "signed" : "submitted"));
                setSubmittedAt(r.data.submittedAt);
                setSaveState("saved");
                toast(`Plan submitted. ${coachName.split(" ")[0]} has been notified 🎉`);
              }}
              className="rounded-xl bg-gold px-6 py-3 font-bold text-ink hover:bg-gold-soft disabled:opacity-50"
            >
              {submittedAt ? "Update & resubmit" : "Sign & submit plan"}
            </button>
          </div>
          <label className="mt-3 flex items-start gap-2 text-sm text-cream/80">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 size-4 accent-[#e8b547]" />
            I commit to this plan for the next 6 months, and I’ll review it with my coach.
          </label>
          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm sm:grid-cols-2">
            <p>
              <span className="text-cream/60">Client: </span>
              {submittedAt ? <span className="font-display italic">{record.client_signature || signature} · {new Date(submittedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span> : "not signed yet"}
            </p>
            <p>
              <span className="text-cream/60">{coachName}: </span>
              {record.coach_signed_at ? <span className="font-display italic">signed {new Date(record.coach_signed_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span> : "countersigns after your review session"}
            </p>
          </div>
          {record.coach_note && <p className="mt-4 rounded-2xl bg-white/5 p-4 text-sm"><strong className="text-gold">Note from {coachName.split(" ")[0]}:</strong> {record.coach_note}</p>}
          {submittedAt && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={bookingUnlockedHref} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15">📅 Book your review session →</Link>
              {canApplyGoals && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    const r = await applyPlanToGoals();
                    setBusy(false);
                    if (!r.ok) return toast(r.error, "error");
                    toast(r.data.created.length ? `Created: ${r.data.created.join(", ")} 🌱` : "Your goals already exist in Savings");
                  }}
                  className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15"
                >
                  🌱 Turn my targets into savings goals
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Live summary */}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Your snapshot</p>
          <dl className="mt-3 space-y-2.5 text-sm">
            {[
              ["Monthly income", fmt(a.income)],
              ["Saved & invested", fmt(a.saved)],
              ["Total debt", fmt(a.debt)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2"><dt className="text-muted">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
            ))}
            <div className="flex justify-between gap-2 border-t border-line pt-2.5">
              <dt className="font-semibold">Net worth</dt>
              <dd className={`font-display text-lg font-bold tabular-nums ${a.netWorth < 0 ? "text-coral" : "text-moss"}`}>{fmt(a.netWorth)}</dd>
            </div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Emergency cover</dt><dd className="font-semibold">{a.efMonths === null ? "—" : `${a.efMonths.toFixed(1)} months`}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Debt-to-income</dt><dd className="font-semibold">{a.dti === null || !a.debtMonthly ? "—" : `${Math.round(a.dti * 100)}%`}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted">Saving per month</dt><dd className="font-semibold tabular-nums">{a.piggyMonthly ? fmt(a.piggyMonthly) : "—"}</dd></div>
          </dl>
        </div>
        {a.tips.length > 0 && (
          <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Coach’s checks</p>
            <ul className="mt-3 space-y-2 text-sm">
              {a.tips.map((t) => (
                <li key={t.text} className={`rounded-xl px-3 py-2 ${t.tone === "good" ? "bg-moss/10" : "bg-coral/10"}`}>
                  <span aria-hidden>{t.tone === "good" ? "✓ " : "⚠ "}</span>{t.text}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="px-2 text-xs text-muted">Coaching and education, not regulated investment advice. Your plan saves automatically as you type.</p>
      </aside>
    </div>
  );
}

