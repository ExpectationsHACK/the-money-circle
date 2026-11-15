"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Deposit, Goal } from "@/lib/finance";
import { goalPlan } from "@/lib/goal-math";
import { addDeposit, deleteDeposit, deleteGoal, updateGoal } from "@/app/app/finance-actions";
import { TextCell, fmt, fmtCompact, toast } from "./cells";
import { PACE, Ring } from "./SavingsBoard";

export function GoalDetail({ goal: initialGoal, deposits: initialDeposits, today }: { goal: Goal; deposits: Deposit[]; today: string }) {
  const router = useRouter();
  const [goal, setGoal] = useState(initialGoal);
  const [deposits, setDeposits] = useState(initialDeposits);
  const [f, setF] = useState({ amount: "", date: today, note: "", withdraw: false });
  const [busy, setBusy] = useState(false);

  const target = Number(goal.target);
  const saved = Number(goal.saved);
  const p = target ? (saved / target) * 100 : 0;
  const plan = goalPlan(goal);

  // Running balance (oldest → newest) for the chart and milestone dates.
  const series = useMemo(() => {
    let bal = 0;
    return [...deposits]
      .sort((a, b) => a.deposited_on.localeCompare(b.deposited_on) || a.id.localeCompare(b.id))
      .map((d) => ({ date: d.deposited_on, balance: (bal += Number(d.amount)) }));
  }, [deposits]);

  const milestones = [25, 50, 75, 100].map((m) => ({ m, at: series.find((s) => s.balance >= (target * m) / 100)?.date ?? null }));

  const save = (field: "name" | "emoji" | "target" | "due" | "platform") => async (v: string) => {
    const r = await updateGoal(goal.id, { [field]: v });
    if (r.ok) setGoal(r.data);
    return r;
  };

  return (
    <div className="space-y-6">
      <Link href="/app/savings" className="text-sm font-semibold text-muted hover:text-ink">← All goals</Link>

      <header className="flex flex-col gap-6 rounded-3xl bg-paper p-6 ring-1 ring-line sm:flex-row sm:items-center sm:p-8">
        <Ring pct={p} size={112} stroke={10} label={`${Math.round(p)}% saved`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="w-12 shrink-0">
              <TextCell value={goal.emoji} ariaLabel="Goal icon" className="text-center text-2xl" onSave={save("emoji")} />
            </div>
            <div className="min-w-0 flex-1">
              <TextCell value={goal.name} ariaLabel="Goal name" className="font-display text-2xl font-bold sm:text-3xl" onSave={save("name")} />
            </div>
          </div>
          <p className="mt-1 px-2 font-display text-3xl font-bold tabular-nums">
            {fmt(saved)} <span className="text-base font-semibold text-muted">saved</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <p className="px-2 text-xs font-semibold text-muted">Target</p>
              <TextCell value={target.toLocaleString("en-NG")} display={fmt(target)} inputMode="decimal" ariaLabel="Target amount" className="font-semibold" onSave={save("target")} />
            </div>
            <div>
              <p className="px-2 text-xs font-semibold text-muted">Deadline</p>
              <label className="relative block">
                <span className="block rounded-lg px-2 py-1.5 font-semibold hover:bg-cream">{goal.due_on ? new Date(goal.due_on).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-muted/60">Set a date</span>}</span>
                <input
                  type="date"
                  value={goal.due_on ?? ""}
                  aria-label="Deadline"
                  onChange={async (e) => {
                    const r = await updateGoal(goal.id, { due: e.target.value });
                    if (r.ok) setGoal(r.data);
                    else toast(r.error, "error");
                  }}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
            <div>
              <p className="px-2 text-xs font-semibold text-muted">Saved with</p>
              <TextCell value={goal.platform} ariaLabel="Platform" className="font-semibold" onSave={save("platform")} />
            </div>
            <div>
              <p className="px-2 text-xs font-semibold text-muted">Status</p>
              <span className={`ml-2 mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${PACE[plan.pace].cls}`}>{PACE[plan.pace].label}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Still to go</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{fmt(plan.remaining)}</p>
        </div>
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Needed per month</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{plan.perMonth ? fmt(plan.perMonth) : "—"}</p>
          <p className="mt-1 text-xs text-muted">{plan.monthsLeft ? `${plan.monthsLeft} month${plan.monthsLeft === 1 ? "" : "s"} left` : plan.pace === "done" ? "Goal reached" : "Set a deadline to see this"}</p>
        </div>
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Milestones</p>
          <div className="mt-2 flex gap-2">
            {milestones.map((m) => (
              <span key={m.m} title={m.at ? `Reached ${new Date(m.at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}` : "Not yet"} className={`grid size-10 place-items-center rounded-full text-xs font-bold ${m.at ? "bg-gold text-ink" : "bg-cream text-muted"}`}>
                {m.m === 100 ? "🏁" : `${m.m}%`}
              </span>
            ))}
          </div>
        </div>
      </div>

      {series.length > 1 && <GrowthChart series={series} target={target} />}

      <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
        <h2 className="font-display text-lg font-bold">Add to this goal</h2>
        <form
          className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[8rem_9rem_1fr_auto_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await addDeposit(goal.id, f);
            setBusy(false);
            if (!r.ok) return toast(r.error, "error");
            const reached = !goal.achieved_at && r.data.goal.achieved_at;
            setGoal(r.data.goal);
            setDeposits((x) => [r.data.deposit, ...x]);
            setF({ amount: "", date: today, note: "", withdraw: false });
            toast(reached ? `🎉 You reached “${goal.name}”!` : f.withdraw ? "Withdrawal recorded" : "Saved 🌱");
          }}
        >
          <input value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} placeholder="₦ 25k" inputMode="decimal" required aria-label="Amount" className="rounded-xl border border-line bg-paper px-3 py-2 text-sm tabular-nums outline-none focus:border-forest" />
          <input type="date" value={f.date} max={today} onChange={(e) => setF((x) => ({ ...x, date: e.target.value }))} aria-label="Date" className="rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest" />
          <input value={f.note} onChange={(e) => setF((x) => ({ ...x, note: e.target.value }))} placeholder="Note (optional), e.g. Salary day" maxLength={80} aria-label="Note" className="col-span-2 rounded-xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-forest sm:col-span-1" />
          <label className="flex items-center gap-2 rounded-xl px-2 text-sm font-semibold">
            <input type="checkbox" checked={f.withdraw} onChange={(e) => setF((x) => ({ ...x, withdraw: e.target.checked }))} className="size-4 accent-[#e46f4f]" />
            Withdrawal
          </label>
          <button disabled={busy} className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60 ${f.withdraw ? "bg-coral text-white" : "bg-gold text-ink hover:bg-gold-soft"}`}>
            {f.withdraw ? "Withdraw" : "+ Save"}
          </button>
        </form>
      </section>

      <section className="rounded-3xl bg-paper ring-1 ring-line">
        <h2 className="px-5 pt-5 font-display text-lg font-bold sm:px-6">History</h2>
        {deposits.length === 0 ? (
          <p className="p-6 text-sm text-muted">No deposits yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {deposits.map((d) => (
              <li key={d.id} className="group flex items-center gap-3 px-5 py-3 text-sm sm:px-6">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${Number(d.amount) < 0 ? "bg-coral/15 text-coral" : "bg-moss/15 text-moss"}`} aria-hidden>
                  {Number(d.amount) < 0 ? "−" : "+"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{d.note || (Number(d.amount) < 0 ? "Withdrawal" : "Deposit")}</span>
                  <span className="text-xs text-muted">{new Date(d.deposited_on + "T00:00:00").toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
                <span className={`font-semibold tabular-nums ${Number(d.amount) < 0 ? "text-coral" : ""}`}>{Number(d.amount) < 0 ? "−" : "+"}{fmt(Math.abs(Number(d.amount)))}</span>
                <button
                  aria-label="Delete entry"
                  onClick={async () => {
                    if (!confirm("Delete this entry? Your balance will be recalculated.")) return;
                    const r = await deleteDeposit(d.id);
                    if (!r.ok) return toast(r.error, "error");
                    setGoal(r.data);
                    setDeposits((x) => x.filter((y) => y.id !== d.id));
                  }}
                  className="rounded-lg px-1.5 text-muted opacity-0 transition hover:text-coral focus:opacity-100 group-hover:opacity-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="text-right">
        <button
          onClick={async () => {
            if (!confirm(`Delete “${goal.name}” and its full history? This can’t be undone.`)) return;
            const r = await deleteGoal(goal.id);
            if (!r.ok) return toast(r.error, "error");
            toast("Goal deleted");
            router.push("/app/savings");
          }}
          className="text-sm font-semibold text-muted hover:text-coral"
        >
          Delete goal
        </button>
      </div>
    </div>
  );
}

/** Running balance over time as a single line, with a dashed target line. */
function GrowthChart({ series, target }: { series: { date: string; balance: number }[]; target: number }) {
  const W = 640;
  const H = 180;
  const pad = { l: 8, r: 8, t: 16, b: 22 };
  const t0 = new Date(series[0].date).getTime();
  const t1 = Math.max(t0 + 86400_000, new Date(series[series.length - 1].date).getTime());
  const maxY = Math.max(target, ...series.map((s) => s.balance)) * 1.05;
  const x = (d: string) => pad.l + ((new Date(d).getTime() - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - Math.max(0, v) / maxY) * (H - pad.t - pad.b);
  // Step line: balance holds until the next deposit.
  const d = series.reduce((acc, s, i) => acc + (i === 0 ? `M${x(s.date)},${y(s.balance)}` : `H${x(s.date)}V${y(s.balance)}`), "");
  const last = series[series.length - 1];

  return (
    <section className="rounded-3xl bg-paper p-5 ring-1 ring-line" aria-label="Savings growth chart">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-base font-bold">Growth</h2>
        <p className="text-xs text-muted">target {fmtCompact(target)}</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label={`Balance grew to ${fmt(last.balance)} over ${series.length} entries`}>
        <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} stroke="var(--color-gold)" strokeWidth={1.5} strokeDasharray="5 5" />
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--color-line)" strokeWidth={1} />
        <path d={`${d}H${x(last.date)}V${H - pad.b}H${pad.l}Z`} fill="var(--color-moss)" opacity={0.1} />
        <path d={d} fill="none" stroke="var(--color-moss)" strokeWidth={2} strokeLinejoin="round" />
        {series.map((s, i) => (
          <circle key={i} cx={x(s.date)} cy={y(s.balance)} r={4} fill="var(--color-moss)" stroke="var(--color-paper)" strokeWidth={2}>
            <title>{`${new Date(s.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}: ${fmt(s.balance)}`}</title>
          </circle>
        ))}
        <text x={pad.l} y={H - 6} className="fill-muted" style={{ fontSize: 11 }}>{new Date(series[0].date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" className="fill-muted" style={{ fontSize: 11 }}>{new Date(last.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</text>
      </svg>
    </section>
  );
}
