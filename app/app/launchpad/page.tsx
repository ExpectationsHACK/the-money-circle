import { requireStudent } from "@/lib/auth";
import { all } from "@/lib/db";
import { pct } from "@/lib/money";
import { PILLARS } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { ActionForm, ConfirmButton, Locked, SubmitButton } from "@/components/app/ui";
import { input } from "@/lib/styles";
import { addMilestone, deleteMilestone, startMilestones, toggleMilestone } from "../actions";

export const dynamic = "force-dynamic";

export default async function LaunchPadPage() {
  const s = await requireStudent();
  if (!hasPillar(s, 4))
    return <Locked title="LaunchPad" pillarName={PILLARS[4].name} body="Turn a skill into income with a step-by-step roadmap from idea to first paying client, and ruthless accountability along the way." />;

  const ms = await all<{ id: string; title: string; done: number; done_at: string | null }>(
    "SELECT id, title, done, done_at FROM milestones WHERE student_id = ? ORDER BY sort, rowid",
    [s.id],
  );
  const done = ms.filter((m) => Number(m.done)).length;
  const next = ms.find((m) => !Number(m.done));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-moss">LaunchPad</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Road to your first sale</h1>
      </div>

      {ms.length === 0 ? (
        <section className="grain rounded-3xl bg-forest p-8 text-cream">
          <h2 className="font-display text-2xl font-bold">Let’s build your roadmap 🚀</h2>
          <p className="mt-2 max-w-lg text-cream/75">We’ll start you with the 8 milestones every LaunchPad founder hits on the way to their first paying client. Edit them anytime.</p>
          <form action={startMilestones} className="mt-6">
            <SubmitButton pendingText="Building…">Start my roadmap</SubmitButton>
          </form>
        </section>
      ) : (
        <>
          <section className="rounded-3xl bg-forest p-6 text-cream">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-cream/70">Progress</p>
                <p className="font-display text-4xl font-bold">{done}<span className="text-xl text-cream/60">/{ms.length}</span></p>
              </div>
              {next ? (
                <p className="max-w-xs text-right text-sm text-cream/80">Next up: <strong className="text-gold">{next.title}</strong></p>
              ) : (
                <p className="text-right font-display text-lg font-bold text-gold">Roadmap complete. You did it! 🎉</p>
              )}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gold" style={{ width: `${pct(done, ms.length)}%` }} />
            </div>
          </section>

          <section className="rounded-3xl bg-paper p-2 ring-1 ring-line sm:p-3">
            <ol>
              {ms.map((m, i) => (
                <li key={m.id} className="group flex items-center gap-3 rounded-2xl p-3 hover:bg-cream">
                  <form action={toggleMilestone}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      aria-label={Number(m.done) ? `Mark “${m.title}” not done` : `Mark “${m.title}” done`}
                      className={`grid size-8 place-items-center rounded-full text-sm font-bold transition ${
                        Number(m.done) ? "bg-moss text-cream" : "border-2 border-line text-muted hover:border-forest"
                      }`}
                    >
                      {Number(m.done) ? "✓" : i + 1}
                    </button>
                  </form>
                  <span className={`flex-1 ${Number(m.done) ? "text-muted line-through" : "font-semibold"}`}>{m.title}</span>
                  {m.done_at && <span className="hidden text-xs text-muted sm:inline">{new Date(m.done_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>}
                  <form action={deleteMilestone} className="opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmButton message={`Remove “${m.title}”?`} className="rounded-lg px-2 py-1 text-muted hover:text-coral">
                      <span aria-label="Remove milestone">✕</span>
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ol>
            <ActionForm action={addMilestone} className="border-t border-line p-3">
              <div className="flex gap-2">
                <input name="title" required maxLength={100} placeholder="Add your own milestone…" aria-label="New milestone" className={`${input} py-2 text-sm`} />
                <SubmitButton variant="dark" pendingText="…">Add</SubmitButton>
              </div>
            </ActionForm>
          </section>
        </>
      )}
    </div>
  );
}
