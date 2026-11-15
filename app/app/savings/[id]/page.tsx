import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { one } from "@/lib/db";
import { ensureOpeningDeposits, getDeposits, type Goal } from "@/lib/finance";
import { today } from "@/lib/money";
import { PILLARS } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { Locked } from "@/components/app/ui";
import { GoalDetail } from "@/components/finance/GoalDetail";

export const dynamic = "force-dynamic";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStudent();
  if (!hasPillar(s, 3)) return <Locked title="Savings tracker" pillarName={PILLARS[3].name} body="Track every deposit toward your goals." />;
  await ensureOpeningDeposits(s.id);
  const goal = await one<Goal>(
    "SELECT id, name, emoji, target, saved, due_on, platform, created_at, achieved_at FROM goals WHERE id = ? AND student_id = ?",
    [(await params).id, s.id],
  );
  if (!goal) notFound();
  return <GoalDetail goal={goal} deposits={await getDeposits(goal.id)} today={today()} />;
}
