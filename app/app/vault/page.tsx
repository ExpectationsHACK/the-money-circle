import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { one } from "@/lib/db";
import { markStudent } from "@/lib/onboarding-kit";
import { currentMonth, naira } from "@/lib/money";
import { hasPillar } from "@/lib/students";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your vault" };

interface Tool {
  icon: string;
  title: string;
  body: string;
  href: string;
  meta: string;
  accent?: boolean;
}

export default async function VaultPage() {
  const s = await requireStudent();
  await markStudent(s.id, "vault_opened_at");
  const month = currentMonth();
  const [plan, spent, goals, holdings, projects] = await Promise.all([
    one<{ status: string }>("SELECT status FROM financial_plans WHERE student_id = ?", [s.id]),
    one<{ v: number }>("SELECT COALESCE(SUM(amount),0) v FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ?", [s.id, month]),
    one<{ v: number; n: number }>("SELECT COALESCE(SUM(saved),0) v, COUNT(*) n FROM goals WHERE student_id = ?", [s.id]),
    one<{ v: number; n: number }>("SELECT COALESCE(SUM(current_value),0) v, COUNT(*) n FROM holdings WHERE student_id = ?", [s.id]),
    one<{ n: number }>("SELECT COUNT(*) n FROM lp_projects WHERE student_id = ?", [s.id]),
  ]);

  const planMeta = !plan ? "Not started" : plan.status === "signed" ? "✓ Signed by your coach" : plan.status === "submitted" ? "Submitted for review" : "Draft in progress";
  const tools: Tool[] = [];
  if (hasPillar(s, 2)) {
    tools.push({ icon: "📋", title: "Financial Plan", body: "Your 6-month plan: where you are, where you’re going, and how.", href: "/app/plan", meta: planMeta, accent: !plan || plan.status === "draft" });
    tools.push({ icon: "📒", title: "Money Tracker: Budget", body: "Plan every naira: income, categories, start and end balance.", href: "/app/budget", meta: "Monthly budget" });
    tools.push({ icon: "🧾", title: "Money Tracker: Expenses", body: "Log spending in seconds. Table, board and calendar views.", href: "/app/expenses", meta: `${naira(Number(spent?.v ?? 0))} spent this month` });
  }
  if (hasPillar(s, 3)) {
    tools.push({ icon: "🌱", title: "Savings goals", body: "Emergency fund, rent, big dreams, with every deposit tracked.", href: "/app/savings", meta: `${naira(Number(goals?.v ?? 0))} saved across ${goals?.n ?? 0} goal${Number(goals?.n) === 1 ? "" : "s"}` });
    tools.push({ icon: "📈", title: "Investment portfolio", body: "Money market, T-bills, mutual funds and stocks.", href: "/app/invest", meta: Number(holdings?.n) ? `${naira(Number(holdings?.v ?? 0))} invested` : "No holdings yet" });
  }
  if (hasPillar(s, 4)) {
    tools.push({ icon: "🚀", title: "LaunchPad Project Tracker", body: "Break your sales project into tasks, and log every sale.", href: "/app/launchpad", meta: Number(projects?.n) ? `${projects?.n} project${Number(projects?.n) === 1 ? "" : "s"}` : "Start your sales project" });
  }
  tools.push({ icon: "🎓", title: "Masterclasses", body: "Budgeting, mindset, debt, investing and more.", href: "/app/learn", meta: "Learn at your pace" });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-moss">🗂 Personal vault</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">{s.full_name.split(" ")[0]}’s Money Vault</h1>
        <p className="mt-1 text-muted">All your financial tools, personalised and private to you.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`group flex flex-col rounded-3xl p-5 ring-1 transition hover:-translate-y-0.5 ${t.accent ? "bg-gold/15 ring-gold/50" : "bg-paper ring-line hover:ring-forest/40"}`}
          >
            <span className="grid size-12 place-items-center rounded-2xl bg-cream text-2xl" aria-hidden>
              {t.icon}
            </span>
            <h2 className="mt-4 font-display text-lg font-bold group-hover:text-moss">{t.title}</h2>
            <p className="mt-1 flex-1 text-sm text-muted">{t.body}</p>
            <p className="mt-3 text-xs font-semibold text-ink/70">{t.meta}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {hasPillar(s, 2) && (
          <Link href="/app/plan/print" target="_blank" className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-cream">
            🖨 Download my plan (PDF)
          </Link>
        )}
        {hasPillar(s, 2) && (
          <a href="/app/expenses/export" className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-cream">
            ⤓ Export this month’s expenses (CSV)
          </a>
        )}
        {s.vault_url && (
          <a href={s.vault_url} target="_blank" rel="noreferrer" className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-cream">
            📁 My Google Drive vault ↗
          </a>
        )}
      </div>
    </div>
  );
}
