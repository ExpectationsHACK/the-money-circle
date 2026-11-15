import { requireStudent } from "@/lib/auth";
import { getCategories, getExpenses, getPlanned, getRecurring, postDueRecurring, spendingTrend } from "@/lib/finance";
import { currentMonth, isMonth, monthLabel, shiftMonth, today } from "@/lib/money";
import { PILLARS } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { Locked } from "@/components/app/ui";
import { ExpenseDatabase } from "@/components/finance/ExpenseDatabase";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ m?: string; cat?: string }> }) {
  const s = await requireStudent();
  if (!hasPillar(s, 2))
    return <Locked title="Expense tracker" pillarName={PILLARS[2].name} body="Log every naira in seconds, see daily spending, and let recurring bills track themselves." />;

  const sp = await searchParams;
  const month = isMonth(sp.m) ? sp.m : currentMonth();
  // Recurring bills post themselves the first time the student opens their tracker on/after the bill day.
  const posted = await postDueRecurring(s.id);

  const [categories, expenses, planned, recurring, trend] = await Promise.all([
    getCategories(s.id),
    getExpenses(s.id, month),
    getPlanned(s.id, month),
    getRecurring(s.id),
    spendingTrend(s.id, month, 2),
  ]);

  return (
    <ExpenseDatabase
      key={month}
      month={month}
      monthLabel={monthLabel(month)}
      prevHref={`/app/expenses?m=${shiftMonth(month, -1)}`}
      nextHref={`/app/expenses?m=${shiftMonth(month, 1)}`}
      thisMonthHref={month === currentMonth() ? null : "/app/expenses"}
      today={today()}
      categories={categories}
      expenses={expenses}
      planned={planned}
      recurring={recurring}
      lastMonthTotal={trend[0]?.total ?? 0}
      initialCategory={sp.cat && categories.some((c) => c.key === sp.cat) ? sp.cat : ""}
      postedRecurring={month === currentMonth() ? posted : 0}
    />
  );
}
