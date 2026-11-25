import { requireStudent } from "@/lib/auth";
import { getPlan } from "@/lib/plan";
import { PILLARS } from "@/lib/packages";
import { site } from "@/lib/site";
import { hasPillar } from "@/lib/students";
import { Locked } from "@/components/app/ui";
import { PlanEditor } from "@/components/plan/PlanEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financial Plan" };

export default async function PlanPage() {
  const s = await requireStudent();
  if (!hasPillar(s, 2))
    return <Locked title="Your 6-month Financial Plan" pillarName={PILLARS[2].name} body="Map where you are, where you want to be in 6 months, and the exact plan to get there, reviewed and signed with your coach." />;
  const record = await getPlan(s);
  return (
    <PlanEditor
      record={record}
      studentName={s.full_name}
      coachName={`${site.coachFirstName} (${site.coachName})`}
      canApplyGoals={hasPillar(s, 3)}
      bookingUnlockedHref="/app/welcome#book"
    />
  );
}
