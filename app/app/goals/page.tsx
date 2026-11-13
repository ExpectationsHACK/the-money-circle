import { requireStudent } from "@/lib/auth";
import { all } from "@/lib/db";
import { SAVINGS_PLATFORMS, naira, pct } from "@/lib/money";
import { PILLARS } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { ActionForm, Bar, ConfirmButton, Locked, SubmitButton, input } from "@/components/app/ui";
import { addGoal, deleteGoal, topUpGoal } from "../actions";

export const dynamic = "force-dynamic";

interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  due_on: string | null;
  platform: string;
}

function monthsUntil(date: string): number {
  const d = new Date(date);
  const n = new Date();
  return Math.max(1, (d.getFullYear() - n.getFullYear()) * 12 + d.getMonth() - n.getMonth());
}

export default async function GoalsPage() {
  const s = await requireStudent();
  if (!hasPillar(s, 3))
    return <Locked title="Savings goals" pillarName={PILLARS[3].name} body="Set PiggyVest-style targets for your emergency fund, rent and big dreams, and see exactly how much to put away each month." />;

  const goals = await all<Goal>("SELECT id, name, target, saved, due_on, platform FROM goals WHERE student_id = ? ORDER BY created_at", [s.id]);
  const totalSaved = goals.reduce((a, g) => a + Number(g.saved), 0);
  const totalTarget = goals.reduce((a, g) => a + Number(g.target), 0);
  const hasEmergency = goals.some((g) => /emergenc/i.test(g.name));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-moss">Wealth Builder</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Savings goals</h1>
        {goals.length > 0 && (
          <p className="mt-1 text-muted">
            {naira(totalSaved)} saved of {naira(totalTarget)} · {pct(totalSaved, totalTarget)}% there
          </p>
        )}
      </div>

      {!hasEmergency && (
        <div className="rounded-2xl bg-gold/20 p-4 text-sm">
          <strong>Coach tip:</strong> start with an emergency fund worth 3 to 6 months of your needs
          {s.monthly_income ? ` (about ${naira(Number(s.monthly_income) * 0.5 * 3, { compact: true })} to ${naira(Number(s.monthly_income) * 0.5 * 6, { compact: true })} for you)` : ""}. It’s what stops one bad month from becoming debt.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const p = pct(Number(g.saved), Number(g.target));
          const left = Math.max(0, Number(g.target) - Number(g.saved));
          const perMonth = g.due_on && left > 0 ? Math.ceil(left / monthsUntil(g.due_on) / 100) * 100 : null;
          return (
            <article key={g.id} className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{g.name}</h2>
                  <p className="text-xs font-semibold text-muted">
                    {g.platform}
                    {g.due_on ? ` · by ${new Date(g.due_on).toLocaleDateString("en-NG", { month: "short", year: "numeric" })}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p >= 100 ? "bg-moss text-cream" : "bg-cream"}`}>{p >= 100 ? "Done 🎉" : `${p}%`}</span>
              </div>
              <p className="mt-4 font-display text-2xl font-bold">
                {naira(Number(g.saved))} <span className="text-base font-semibold text-muted">/ {naira(Number(g.target))}</span>
              </p>
              <div className="mt-2"><Bar value={p} tone="gold" /></div>
              {perMonth && <p className="mt-2 text-xs font-semibold text-moss">Save {naira(perMonth)}/month to hit it on time</p>}

              <ActionForm action={topUpGoal} className="mt-4">
                <input type="hidden" name="id" value={g.id} />
                <div className="flex gap-2">
                  <input name="amount" inputMode="decimal" required placeholder="Add ₦ (use -5k to withdraw)" aria-label={`Amount to add to ${g.name}`} className={`${input} py-2 text-sm`} />
                  <SubmitButton variant="dark" pendingText="…">Add</SubmitButton>
                </div>
              </ActionForm>
              <form action={deleteGoal} className="mt-2 text-right">
                <input type="hidden" name="id" value={g.id} />
                <ConfirmButton message={`Delete “${g.name}”?`} className="text-xs font-semibold text-muted hover:text-coral">Delete goal</ConfirmButton>
              </form>
            </article>
          );
        })}
      </div>

      <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
        <h2 className="font-display text-xl font-bold">New goal</h2>
        <ActionForm action={addGoal} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-sm font-semibold lg:col-span-2">
              Goal name
              <input name="name" required maxLength={60} placeholder={hasEmergency ? "New laptop" : "Emergency fund"} className={`mt-1 ${input}`} />
            </label>
            <label className="text-sm font-semibold">
              Target
              <input name="target" inputMode="decimal" required placeholder="₦ 500k" className={`mt-1 ${input}`} />
            </label>
            <label className="text-sm font-semibold">
              Already saved
              <input name="saved" inputMode="decimal" placeholder="₦ 0" className={`mt-1 ${input}`} />
            </label>
            <label className="text-sm font-semibold">
              Target date
              <input name="due" type="date" className={`mt-1 ${input}`} />
            </label>
            <label className="text-sm font-semibold sm:col-span-2 lg:col-span-2">
              Where you’re saving it
              <select name="platform" className={`mt-1 ${input}`} defaultValue="PiggyVest">
                {SAVINGS_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <SubmitButton className="mt-4">Create goal</SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
