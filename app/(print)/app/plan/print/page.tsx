import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getPlan } from "@/lib/plan";
import { site } from "@/lib/site";
import { hasPillar } from "@/lib/students";
import { PlanView } from "@/components/plan/PlanView";
import { PrintButton } from "@/components/plan/PrintButton";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Financial Plan (print)", robots: { index: false } };

export default async function PrintPlan() {
  const s = await requireStudent();
  if (!hasPillar(s, 2)) redirect("/app");
  const record = await getPlan(s);
  return (
    <div className="min-h-screen bg-cream print:bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 print:hidden">
        <Link href="/app/plan" className="text-sm font-semibold text-muted hover:text-ink">← Back to editing</Link>
        <PrintButton />
      </div>
      <main className="mx-auto max-w-3xl rounded-3xl bg-paper px-6 py-8 ring-1 ring-line sm:px-10 print:max-w-none print:rounded-none print:p-0 print:ring-0">
        <PlanView record={record} studentName={s.full_name} coachName={`${site.coachFirstName} (${site.coachName})`} />
      </main>
    </div>
  );
}
