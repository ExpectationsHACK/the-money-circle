import { requireStudent } from "@/lib/auth";
import { ensureMonth, getCategories, getIncomes, getMonthNotes, getPlanned, spentByCategory } from "@/lib/finance";
import { currentMonth, isMonth, monthLabel, shiftMonth } from "@/lib/money";
import { PILLARS } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { Locked } from "@/components/app/ui";
import { BudgetSheet } from "@/components/finance/BudgetSheet";

export const dynamic = "force-dynamic";

export default async function BudgetPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const s = await requireStudent();
  if (!hasPillar(s, 2))
    return <Locked title="Your budget" pillarName={PILLARS[2].name} body="Plan every naira before the month starts, then track where it really goes, with live budget-vs-actual for each category." />;

  const sp = await searchParams;
  const month = isMonth(sp.m) ? sp.m : currentMonth();
  await ensureMonth(s.id, month, s.monthly_income ? Number(s.monthly_income) : null);

  const [categories, planned, spent, incomes, notes, prevPlanned] = await Promise.all([
    getCategories(s.id),
    getPlanned(s.id, month),
    spentByCategory(s.id, month),
    getIncomes(s.id, month),
    getMonthNotes(s.id, month),
    getPlanned(s.id, shiftMonth(month, -1)),
  ]);

  return (
    <BudgetSheet
      key={month}
      month={month}
      monthLabel={monthLabel(month)}
      prevHref={`/app/budget?m=${shiftMonth(month, -1)}`}
      nextHref={`/app/budget?m=${shiftMonth(month, 1)}`}
      thisMonthHref={month === currentMonth() ? null : "/app/budget"}
      categories={categories}
      planned={planned}
      spent={spent}
      incomes={incomes}
      notes={notes}
      canCopyLast={Object.keys(prevPlanned).length > 0}
    />
  );
}
