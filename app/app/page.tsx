import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { all, one } from "@/lib/db";
import { env } from "@/lib/env";
import { category, currentMonth, greeting, monthLabel, naira, pct } from "@/lib/money";
import { firstName, hasPillar, packageOf, programmeProgress } from "@/lib/students";
import { Bar } from "@/components/app/ui";
import { ExpenseForm } from "@/components/app/ExpenseForm";
import { loadSampleData } from "./actions";

export const dynamic = "force-dynamic";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6 ${className}`}>{children}</section>;
}

export default async function Dashboard() {
  const s = await requireStudent();
  const pkg = packageOf(s);
  const prog = programmeProgress(s);
  const month = currentMonth();
  const p2 = hasPillar(s, 2);
  const p3 = hasPillar(s, 3);
  const p4 = hasPillar(s, 4);

  const [spentRow, budgetRow, byCat, recent, goals, holdings, ms, expCount] = await Promise.all([
    one<{ v: number }>("SELECT COALESCE(SUM(amount),0) v FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ?", [s.id, month]),
    one<{ v: number }>("SELECT COALESCE(SUM(amount),0) v FROM budgets WHERE student_id = ? AND month = ?", [s.id, month]),
    all<{ category: string; v: number }>(
      "SELECT category, SUM(amount) v FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ? GROUP BY category ORDER BY v DESC LIMIT 5",
      [s.id, month],
    ),
    all<{ id: string; amount: number; category: string; note: string; spent_on: string }>(
      "SELECT id, amount, category, note, spent_on FROM expenses WHERE student_id = ? ORDER BY spent_on DESC, created_at DESC LIMIT 5",
      [s.id],
    ),
    one<{ saved: number; target: number; n: number }>("SELECT COALESCE(SUM(saved),0) saved, COALESCE(SUM(target),0) target, COUNT(*) n FROM goals WHERE student_id = ?", [s.id]),
    one<{ inv: number; cur: number; n: number }>("SELECT COALESCE(SUM(invested),0) inv, COALESCE(SUM(current_value),0) cur, COUNT(*) n FROM holdings WHERE student_id = ?", [s.id]),
    one<{ done: number; n: number }>("SELECT COALESCE(SUM(done),0) done, COUNT(*) n FROM milestones WHERE student_id = ?", [s.id]),
    one<{ n: number }>("SELECT COUNT(*) n FROM expenses WHERE student_id = ?", [s.id]),
  ]);

  const spent = Number(spentRow?.v ?? 0);
  const budget = Number(budgetRow?.v ?? 0);
  const maxCat = Math.max(1, ...byCat.map((c) => Number(c.v)));
  const gain = Number(holdings?.cur ?? 0) - Number(holdings?.inv ?? 0);

  const checklist = [
    p2 && { done: Boolean(s.monthly_income), label: "Set your monthly income", href: "/app/budget" },
    p2 && { done: budget > 0, label: `Plan your ${monthLabel(month).split(" ")[0]} budget`, href: "/app/budget" },
    p2 && { done: Number(expCount?.n ?? 0) > 0, label: "Log your first expense", href: "#log" },
    p3 && { done: Number(goals?.n ?? 0) > 0, label: "Create a savings goal", href: "/app/goals" },
    p3 && { done: Number(holdings?.n ?? 0) > 0, label: "Add your first investment", href: "/app/invest" },
    p4 && { done: Number(ms?.n ?? 0) > 0, label: "Start your LaunchPad roadmap", href: "/app/launchpad" },
  ].filter(Boolean) as { done: boolean; label: string; href: string }[];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-moss">{greeting()},</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{firstName(s)} 👋</h1>
          <p className="mt-1 text-muted">
            {pkg.name}
            {prog.total ? ` · Month ${prog.month} of ${prog.total}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.booking_url && (
            <a href={s.booking_url} target="_blank" className="rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-cream hover:bg-forest-2">
              📅 Book a Money Date
            </a>
          )}
          {s.vault_url && (
            <a href={s.vault_url} target="_blank" className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-cream">
              🗂 Open my Vault
            </a>
          )}
        </div>
      </div>

      {/* Setup checklist */}
      {checklist.length > 0 && doneCount < checklist.length && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold">Get set up</h2>
            <span className="text-sm font-semibold text-muted">{doneCount}/{checklist.length} done</span>
          </div>
          <div className="mt-3"><Bar value={pct(doneCount, checklist.length)} tone="gold" /></div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${c.done ? "text-muted line-through" : "bg-cream font-semibold hover:bg-gold/20"}`}>
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[11px] ${c.done ? "bg-moss text-cream" : "border-2 border-line"}`}>{c.done ? "✓" : ""}</span>
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
          {env.paymentMode() === "demo" && Number(expCount?.n ?? 0) === 0 && p2 && (
            <form action={loadSampleData} className="mt-4">
              <button className="text-sm font-semibold text-moss underline">Demo: fill my account with sample data</button>
            </form>
          )}
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {p2 && (
          <Card>
            <p className="text-sm font-semibold text-muted">Spent in {monthLabel(month).split(" ")[0]}</p>
            <p className="mt-1 font-display text-3xl font-bold">{naira(spent)}</p>
            {budget > 0 ? (
              <>
                <div className="mt-3"><Bar value={pct(spent, budget)} tone={spent > budget ? "coral" : "forest"} /></div>
                <p className={`mt-2 text-xs font-semibold ${spent > budget ? "text-coral" : "text-muted"}`}>
                  {spent > budget ? `${naira(spent - budget)} over budget` : `${naira(budget - spent)} left of ${naira(budget, { compact: true })}`}
                </p>
              </>
            ) : (
              <Link href="/app/budget" className="mt-3 inline-block text-xs font-semibold text-moss underline">Set a budget →</Link>
            )}
          </Card>
        )}
        {p3 && (
          <Card>
            <p className="text-sm font-semibold text-muted">Saved toward goals</p>
            <p className="mt-1 font-display text-3xl font-bold">{naira(Number(goals?.saved ?? 0))}</p>
            <div className="mt-3"><Bar value={pct(Number(goals?.saved ?? 0), Number(goals?.target ?? 0))} tone="gold" /></div>
            <p className="mt-2 text-xs font-semibold text-muted">
              {Number(goals?.n ?? 0) ? `${pct(Number(goals?.saved), Number(goals?.target))}% of ${naira(Number(goals?.target), { compact: true })}` : "No goals yet"}
            </p>
          </Card>
        )}
        {p3 && (
          <Card>
            <p className="text-sm font-semibold text-muted">Portfolio value</p>
            <p className="mt-1 font-display text-3xl font-bold">{naira(Number(holdings?.cur ?? 0))}</p>
            <p className={`mt-3 text-sm font-bold ${gain >= 0 ? "text-moss" : "text-coral"}`}>
              {Number(holdings?.n ?? 0)
                ? `${gain >= 0 ? "▲" : "▼"} ${naira(Math.abs(gain))} (${Number(holdings?.inv) ? ((gain / Number(holdings?.inv)) * 100).toFixed(1) : 0}%)`
                : "No investments yet"}
            </p>
          </Card>
        )}
        {p4 && (
          <Card>
            <p className="text-sm font-semibold text-muted">LaunchPad progress</p>
            <p className="mt-1 font-display text-3xl font-bold">
              {Number(ms?.done ?? 0)}<span className="text-lg text-muted">/{Number(ms?.n ?? 0) || 8}</span>
            </p>
            <div className="mt-3"><Bar value={pct(Number(ms?.done ?? 0), Number(ms?.n ?? 0))} /></div>
            <p className="mt-2 text-xs font-semibold text-muted">milestones to first sale</p>
          </Card>
        )}
        {!p2 && !p3 && (
          <Card className="sm:col-span-2 lg:col-span-4">
            <p className="font-display text-lg font-bold">Ready to put the lessons to work?</p>
            <p className="mt-1 text-sm text-muted">Upgrade to Foundation &amp; Wealth to unlock your budget, expense tracker, savings goals and portfolio, plus 1-on-1 Money Dates.</p>
            <Link href="/#packages" className="mt-3 inline-block rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-ink">See upgrade options</Link>
          </Card>
        )}
      </div>

      {p2 && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card>
            <h2 id="log" className="scroll-mt-6 font-display text-lg font-bold">Quick log</h2>
            <p className="mb-4 text-sm text-muted">Every naira you track is a naira you control.</p>
            <ExpenseForm compact />
            {recent.length > 0 && (
              <ul className="mt-6 divide-y divide-line border-t border-line">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3 text-sm">
                    <span className="text-lg" aria-hidden>{category(e.category).emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.note || category(e.category).label}</span>
                      <span className="text-xs text-muted">{new Date(e.spent_on).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                    </span>
                    <span className="font-semibold tabular-nums">-{naira(Number(e.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Where it went</h2>
              <Link href="/app/budget" className="text-sm font-semibold text-moss">Full tracker →</Link>
            </div>
            {byCat.length === 0 ? (
              <p className="mt-6 text-sm text-muted">Nothing logged this month yet. Your spending breakdown appears here.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {byCat.map((c) => (
                  <li key={c.category}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold">{category(c.category).emoji} {category(c.category).label}</span>
                      <span className="tabular-nums text-muted">{naira(Number(c.v))}</span>
                    </div>
                    <Bar value={(Number(c.v) / maxCat) * 100} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
