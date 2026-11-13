import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { all } from "@/lib/db";
import { CATEGORIES, category, currentMonth, isMonth, monthLabel, naira, pct, shiftMonth, type Bucket } from "@/lib/money";
import { hasPillar } from "@/lib/students";
import { PILLARS } from "@/lib/packages";
import { ActionForm, Bar, ConfirmButton, Locked, SubmitButton, input } from "@/components/app/ui";
import { ExpenseForm } from "@/components/app/ExpenseForm";
import { applyFiftyThirtyTwenty, copyLastMonthBudget, deleteExpense, saveBudget, saveIncome } from "../actions";

export const dynamic = "force-dynamic";

const BUCKETS: { id: Bucket; label: string; target: number }[] = [
  { id: "needs", label: "Needs", target: 50 },
  { id: "wants", label: "Wants", target: 30 },
  { id: "savings", label: "Savings & debt", target: 20 },
];

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const s = await requireStudent();
  if (!hasPillar(s, 2))
    return <Locked title="Your Money Tracker" pillarName={PILLARS[2].name} body="Plan every naira before the month starts, then track where it really goes, with live budget-vs-actual for each category." />;

  const sp = await searchParams;
  const month = isMonth(sp.m) ? sp.m : currentMonth();
  const prev = shiftMonth(month, -1);
  const isCurrent = month === currentMonth();

  const [budgets, spentRows, expenses, prevBudget] = await Promise.all([
    all<{ category: string; amount: number }>("SELECT category, amount FROM budgets WHERE student_id = ? AND month = ?", [s.id, month]),
    all<{ category: string; v: number }>("SELECT category, SUM(amount) v FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ? GROUP BY category", [s.id, month]),
    all<{ id: string; amount: number; category: string; note: string; spent_on: string }>(
      "SELECT id, amount, category, note, spent_on FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ? ORDER BY spent_on DESC, created_at DESC",
      [s.id, month],
    ),
    all<{ n: number }>("SELECT COUNT(*) n FROM budgets WHERE student_id = ? AND month = ?", [s.id, prev]),
  ]);

  const budgetOf = Object.fromEntries(budgets.map((b) => [b.category, Number(b.amount)]));
  const spentOf = Object.fromEntries(spentRows.map((r) => [r.category, Number(r.v)]));
  const totalBudget = budgets.reduce((a, b) => a + Number(b.amount), 0);
  const totalSpent = spentRows.reduce((a, b) => a + Number(b.v), 0);
  const income = Number(s.monthly_income ?? 0);
  const unallocated = income - totalBudget;
  const canCopy = budgets.length === 0 && Number(prevBudget[0]?.n ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-moss">Money Tracker</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{monthLabel(month)}</h1>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-paper p-1 ring-1 ring-line">
          <Link href={`/app/budget?m=${prev}`} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream" aria-label="Previous month">←</Link>
          {!isCurrent && <Link href="/app/budget" className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream">This month</Link>}
          <Link href={`/app/budget?m=${shiftMonth(month, 1)}`} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream" aria-label="Next month">→</Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-3xl bg-forest p-5 text-cream">
          <p className="text-sm text-cream/70">Monthly take-home</p>
          <ActionForm action={saveIncome} resetOnSuccess={false} className="mt-2">
            <div className="flex gap-2">
              <input
                name="income"
                inputMode="decimal"
                defaultValue={income ? income.toLocaleString("en-NG") : ""}
                placeholder="e.g. 450,000"
                aria-label="Monthly take-home pay"
                className="w-full min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-2 font-display text-xl font-bold text-cream outline-none placeholder:text-cream/40 focus:border-gold"
              />
              <SubmitButton pendingText="…">Save</SubmitButton>
            </div>
          </ActionForm>
        </section>
        <section className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Budgeted</p>
          <p className="mt-1 font-display text-3xl font-bold">{naira(totalBudget)}</p>
          {income > 0 && (
            <p className={`mt-1 text-xs font-semibold ${unallocated < 0 ? "text-coral" : "text-muted"}`}>
              {unallocated === 0 ? "Every naira has a job ✨" : unallocated > 0 ? `${naira(unallocated)} still unassigned` : `${naira(-unallocated)} more than you earn`}
            </p>
          )}
        </section>
        <section className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Spent so far</p>
          <p className="mt-1 font-display text-3xl font-bold">{naira(totalSpent)}</p>
          {totalBudget > 0 && <div className="mt-3"><Bar value={pct(totalSpent, totalBudget)} tone={totalSpent > totalBudget ? "coral" : "forest"} /></div>}
        </section>
      </div>

      {/* Budget planner */}
      <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Plan &amp; track</h2>
            <p className="text-sm text-muted">Give every naira a job, then watch each category in real time.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCopy && (
              <form action={copyLastMonthBudget}>
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="from" value={prev} />
                <SubmitButton variant="dark" pendingText="Copying…">Copy last month</SubmitButton>
              </form>
            )}
            {income > 0 && (
              <form action={applyFiftyThirtyTwenty}>
                <input type="hidden" name="month" value={month} />
                <ConfirmButton
                  message="Fill this month's budget using the 50/30/20 rule? This replaces the amounts below."
                  className="rounded-xl bg-cream px-4 py-2.5 text-sm font-bold hover:bg-gold/30"
                >
                  ✨ Suggest 50/30/20
                </ConfirmButton>
              </form>
            )}
          </div>
        </div>

        {income > 0 && totalBudget > 0 && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {BUCKETS.map((b) => {
              const amt = CATEGORIES.filter((c) => c.bucket === b.id).reduce((a, c) => a + (budgetOf[c.id] ?? 0), 0);
              const share = Math.round((amt / income) * 100);
              return (
                <div key={b.id} className="rounded-2xl bg-cream p-3">
                  <p className="text-xs font-semibold text-muted">{b.label}</p>
                  <p className="font-display text-xl font-bold">{share}%</p>
                  <p className="text-[11px] text-muted">guide: {b.target}%</p>
                </div>
              );
            })}
          </div>
        )}

        <ActionForm action={saveBudget} resetOnSuccess={false} className="mt-5">
          <input type="hidden" name="month" value={month} />
          <div className="divide-y divide-line">
            {CATEGORIES.map((c) => {
              const b = budgetOf[c.id];
              const sp = spentOf[c.id] ?? 0;
              const over = b !== undefined && sp > b;
              return (
                <div key={c.id} className="grid grid-cols-[1fr_7.5rem] items-center gap-x-4 gap-y-1.5 py-3 sm:grid-cols-[14rem_1fr_8rem]">
                  <label htmlFor={`b_${c.id}`} className="text-sm font-semibold">
                    <span aria-hidden>{c.emoji}</span> {c.label}
                  </label>
                  <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>{naira(sp)} spent</span>
                      {b !== undefined && <span className={over ? "font-bold text-coral" : ""}>{over ? `${naira(sp - b)} over` : `${naira(b - sp)} left`}</span>}
                    </div>
                    <Bar value={b ? pct(sp, b) : sp ? 100 : 0} tone={over ? "coral" : "forest"} />
                  </div>
                  <input
                    id={`b_${c.id}`}
                    name={`b_${c.id}`}
                    inputMode="decimal"
                    defaultValue={b !== undefined ? b.toLocaleString("en-NG") : ""}
                    placeholder="₦0"
                    className={`${input} col-start-2 row-start-1 py-2 text-right tabular-nums sm:col-start-3`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-end">
            <SubmitButton variant="dark">Save budget</SubmitButton>
          </div>
        </ActionForm>
      </section>

      {/* Expenses */}
      <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
        <h2 className="font-display text-xl font-bold">Log an expense</h2>
        <div className="mt-4"><ExpenseForm /></div>

        <h3 className="mt-8 font-display text-lg font-bold">
          {expenses.length} expense{expenses.length === 1 ? "" : "s"} in {monthLabel(month).split(" ")[0]}
        </h3>
        {expenses.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing logged for this month.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="text-lg" aria-hidden>{category(e.category).emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{e.note || category(e.category).label}</span>
                  <span className="text-xs text-muted">
                    {category(e.category).label} · {new Date(e.spent_on).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">-{naira(Number(e.amount))}</span>
                <form action={deleteExpense}>
                  <input type="hidden" name="id" value={e.id} />
                  <ConfirmButton message="Delete this expense?" className="rounded-lg px-2 py-1 text-muted hover:bg-coral/10 hover:text-coral">
                    <span aria-label="Delete expense">✕</span>
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
