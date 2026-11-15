import { requireStudent } from "@/lib/auth";
import { getGoals, monthIncomeTotal, savingsStreak, savingsTrend } from "@/lib/finance";
import { currentMonth } from "@/lib/money";
import { PILLARS } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { Locked } from "@/components/app/ui";
import { SavingsBoard } from "@/components/finance/SavingsBoard";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const s = await requireStudent();
  if (!hasPillar(s, 3))
    return <Locked title="Savings tracker" pillarName={PILLARS[3].name} body="Set goals for your emergency fund, rent and big dreams, log every deposit, and watch your savings rate and streak grow." />;

  const month = currentMonth();
  const [goals, trend, income] = await Promise.all([
    getGoals(s.id),
    savingsTrend(s.id, month, 6),
    monthIncomeTotal(s.id, month, s.monthly_income ? Number(s.monthly_income) : null),
  ]);
  const labelled = trend.map((t) => ({
    ...t,
    label: new Date(Date.UTC(Number(t.month.slice(0, 4)), Number(t.month.slice(5, 7)) - 1, 1)).toLocaleDateString("en-NG", { month: "short", timeZone: "UTC" }),
  }));

  return <SavingsBoard goals={goals} trend={labelled} monthIncome={income} streak={savingsStreak(trend)} />;
}
