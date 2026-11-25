import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlan } from "@/lib/plan";
import { analyse, completion } from "@/lib/plan-model";
import { site } from "@/lib/site";
import { getStudentById } from "@/lib/students";
import { input } from "@/lib/styles";
import { ActionForm, SubmitButton } from "@/components/app/ui";
import { PlanView } from "@/components/plan/PlanView";
import { Panel } from "@/components/admin/ui";
import { countersignPlan } from "../../../../actions";

export const metadata = { title: "Financial plan" };

export default async function AdminPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getStudentById((await params).id);
  if (!s) notFound();
  const record = await getPlan(s);
  const a = analyse(record.data);
  const c = completion(record.data);
  const coach = `${site.coachFirstName} (${site.coachName})`;
  const editedAfterSign = record.coach_signed_at && record.updated_at > record.coach_signed_at;

  return (
    <>
      <Link href={`/admin/students/${s.id}`} className="text-sm font-semibold text-muted hover:text-ink">← {s.full_name}</Link>
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="rounded-3xl bg-paper px-6 py-8 ring-1 ring-line sm:px-10">
          {record.status === "draft" && !record.submitted_at ? (
            <p className="mb-6 rounded-2xl bg-gold/20 px-4 py-3 text-sm"><strong>Draft:</strong> {s.full_name.split(" ")[0]} hasn’t submitted yet ({c.pct}% filled).</p>
          ) : null}
          <PlanView record={record} studentName={s.full_name} coachName={coach} />
        </div>
        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel title="Review">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Status</dt><dd className="font-semibold capitalize">{record.status}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Filled</dt><dd className="font-semibold">{c.pct}%</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Net worth</dt><dd className="font-semibold">₦{a.netWorth.toLocaleString("en-NG")}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Emergency cover</dt><dd className="font-semibold">{a.efMonths === null ? "—" : `${a.efMonths.toFixed(1)} mo`}</dd></div>
            </dl>
            {editedAfterSign && <p className="mt-3 rounded-xl bg-coral/10 px-3 py-2 text-xs font-semibold text-coral">Edited after you signed it. Have another look.</p>}
            {a.tips.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-xs">
                {a.tips.map((t) => <li key={t.text} className={`rounded-lg px-2.5 py-1.5 ${t.tone === "good" ? "bg-moss/10" : "bg-coral/10"}`}>{t.text}</li>)}
              </ul>
            )}
          </Panel>
          <Panel title={record.status === "signed" ? "Signed ✍️" : "Countersign"}>
            <ActionForm action={countersignPlan} resetOnSuccess={false}>
              <input type="hidden" name="studentId" value={s.id} />
              <label className="block text-sm font-semibold">
                Note to {s.full_name.split(" ")[0]} <span className="font-normal text-muted">(shown on their plan)</span>
                <textarea name="note" rows={4} defaultValue={record.coach_note ?? ""} placeholder="Great plan! Let’s push savings to 20% from January." className={`mt-1 ${input} text-sm`} />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                {record.status !== "draft" && (
                  <button name="sign" value="1" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-ink hover:bg-gold-soft">
                    {record.status === "signed" ? "Re-sign with note" : "Countersign plan"}
                  </button>
                )}
                <SubmitButton variant="ghost" className="ring-1 ring-line">Save note only</SubmitButton>
              </div>
            </ActionForm>
            {record.coach_signed_at && <p className="mt-3 text-xs text-muted">Signed {new Date(record.coach_signed_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>}
          </Panel>
        </div>
      </div>
    </>
  );
}
