import Link from "next/link";
import { notFound } from "next/navigation";
import { all, one } from "@/lib/db";
import { listCourses, progressByCourse } from "@/lib/learning";
import { currentMonth, naira, pct } from "@/lib/money";
import { categoryLookup, getCategories, monthIncomeTotal } from "@/lib/finance";
import { PACKAGES, findOffer, type Pillar } from "@/lib/packages";
import { getStudentById, hasPillar, packageOf, programmeProgress } from "@/lib/students";
import { ActionForm, Bar, ConfirmButton, SubmitButton } from "@/components/app/ui";
import { input } from "@/lib/styles";
import { Empty, Panel, StatusPill, shortDate, timeAgo, waLink } from "@/components/admin/ui";
import { addCoachNote, changeStudentPackage, deleteCoachNote, sendStudentLoginLink } from "../../../actions";

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const s = await getStudentById((await params).id);
  if (!s) notFound();
  const pkg = packageOf(s);
  const prog = programmeProgress(s);
  const month = currentMonth();

  const [notes, enrollments, spent, budget, goals, holdings, ms, recent, courses, progress] = await Promise.all([
    all<{ id: string; body: string; created_at: string }>("SELECT * FROM coach_notes WHERE student_id = ? ORDER BY created_at DESC", [s.id]),
    all<{ reference: string; offer_slug: string; amount_naira: number; status: string; channel: string; created_at: string; notes: string | null }>(
      "SELECT * FROM enrollments WHERE student_id = ? OR email = ? ORDER BY created_at DESC",
      [s.id, s.email],
    ),
    one<{ v: number }>("SELECT COALESCE(SUM(amount),0) v FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ?", [s.id, month]),
    one<{ v: number }>("SELECT COALESCE(SUM(amount),0) v FROM budgets WHERE student_id = ? AND month = ?", [s.id, month]),
    all<{ name: string; saved: number; target: number }>("SELECT name, saved, target FROM goals WHERE student_id = ? ORDER BY created_at", [s.id]),
    one<{ inv: number; cur: number; n: number }>("SELECT COALESCE(SUM(invested),0) inv, COALESCE(SUM(current_value),0) cur, COUNT(*) n FROM holdings WHERE student_id = ?", [s.id]),
    one<{ done: number; n: number }>("SELECT COALESCE(SUM(done),0) done, COUNT(*) n FROM milestones WHERE student_id = ?", [s.id]),
    all<{ id: string; amount: number; category: string; note: string; spent_on: string }>(
      "SELECT id, amount, category, note, spent_on FROM expenses WHERE student_id = ? ORDER BY spent_on DESC, created_at DESC LIMIT 8",
      [s.id],
    ),
    listCourses({ publishedOnly: true }),
    progressByCourse(s.id),
  ]);

  const category = categoryLookup(await getCategories(s.id, { includeArchived: true }));
  const income = await monthIncomeTotal(s.id, month, s.monthly_income ? Number(s.monthly_income) : null);
  const wa = waLink(s.phone, `Hi ${s.full_name.split(" ")[0]}! It’s your Money Buddy 👋`);
  const spentV = Number(spent?.v ?? 0);
  const budgetV = Number(budget?.v ?? 0);
  const myCourses = courses.filter((c) => hasPillar(s, c.pillar as Pillar));

  return (
    <>
      <Link href="/admin/students" className="text-sm font-semibold text-muted hover:text-ink">← Students</Link>

      <header className="flex flex-col gap-5 rounded-3xl bg-forest p-6 text-cream sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gold font-display text-xl font-bold text-ink" aria-hidden>
            {s.full_name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight">{s.full_name}</h1>
            <p className="truncate text-sm text-cream/70">{s.email} · {s.phone || "no phone"}</p>
            <p className="mt-1 text-xs font-semibold text-gold">
              {pkg.name}{prog.total ? ` · Month ${prog.month} of ${prog.total}` : ""} · joined {shortDate(s.created_at)} · active {timeAgo(s.last_seen_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {wa && <a href={wa} target="_blank" className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15">WhatsApp</a>}
          <a href={`mailto:${s.email}`} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15">Email</a>
          {s.vault_url && <a href={s.vault_url} target="_blank" className="rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-ink">Open Vault</a>}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Income this month</p>
          <p className="mt-1 font-display text-2xl font-bold">{income ? naira(income) : "—"}</p>
        </div>
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Spent this month</p>
          <p className="mt-1 font-display text-2xl font-bold">{naira(spentV)}</p>
          {budgetV > 0 && (
            <>
              <div className="mt-2"><Bar value={pct(spentV, budgetV)} tone={spentV > budgetV ? "coral" : "forest"} /></div>
              <p className={`mt-1 text-xs font-semibold ${spentV > budgetV ? "text-coral" : "text-muted"}`}>of {naira(budgetV, { compact: true })} budget</p>
            </>
          )}
        </div>
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Saved toward goals</p>
          <p className="mt-1 font-display text-2xl font-bold">{naira(goals.reduce((a, g) => a + Number(g.saved), 0))}</p>
          <p className="mt-1 text-xs text-muted">{goals.length} goal{goals.length === 1 ? "" : "s"}</p>
        </div>
        <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">{hasPillar(s, 4) ? "LaunchPad" : "Portfolio"}</p>
          {hasPillar(s, 4) ? (
            <p className="mt-1 font-display text-2xl font-bold">{ms?.done ?? 0}/{ms?.n || 8} <span className="text-sm text-muted">milestones</span></p>
          ) : (
            <p className="mt-1 font-display text-2xl font-bold">{naira(Number(holdings?.cur ?? 0))}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="Coach notes">
            <ActionForm action={addCoachNote}>
              <input type="hidden" name="studentId" value={s.id} />
              <textarea name="body" rows={3} required placeholder="After today’s Money Date… wins, struggles, homework" aria-label="New coach note" className={input} />
              <SubmitButton variant="dark" className="mt-2">Save note</SubmitButton>
            </ActionForm>
            {notes.length > 0 && (
              <ul className="mt-5 space-y-3">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-2xl bg-cream p-4 text-sm">
                    <p className="whitespace-pre-wrap">{n.body}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted">
                      <span>{new Date(n.created_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <form action={deleteCoachNote}>
                        <input type="hidden" name="id" value={n.id} />
                        <input type="hidden" name="studentId" value={s.id} />
                        <ConfirmButton message="Delete this note?" className="font-semibold hover:text-coral">Delete</ConfirmButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Learning progress">
            {myCourses.length === 0 ? (
              <Empty>No courses for this package yet.</Empty>
            ) : (
              <ul className="space-y-4">
                {myCourses.map((c) => {
                  const p = progress[c.id] ?? { done: 0, total: 0 };
                  return (
                    <li key={c.id}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-semibold">{c.emoji} {c.title}</span>
                        <span className="tabular-nums text-muted">{p.done}/{p.total}</span>
                      </div>
                      <Bar value={p.total ? (p.done / p.total) * 100 : 0} tone="gold" />
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Recent spending">
            {recent.length === 0 ? (
              <Empty>No expenses logged yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span aria-hidden>{category(e.category).emoji}</span>
                    <span className="min-w-0 flex-1 truncate">{e.note || category(e.category).name}</span>
                    <span className="text-xs text-muted">{new Date(e.spent_on).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                    <span className="w-24 text-right font-semibold tabular-nums">{naira(Number(e.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Access">
            <ActionForm action={sendStudentLoginLink} resetOnSuccess={false}>
              <input type="hidden" name="studentId" value={s.id} />
              <SubmitButton variant="dark" className="w-full" pendingText="Sending…">Email a sign-in link</SubmitButton>
            </ActionForm>
            <ActionForm action={changeStudentPackage} resetOnSuccess={false} className="mt-5">
              <input type="hidden" name="studentId" value={s.id} />
              <label className="text-sm font-semibold">
                Package access
                <select name="packageId" defaultValue={s.package_id} className={`mt-1 ${input}`}>
                  {PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <p className="mt-1 text-xs text-muted">Changes which tools and courses they can open. It doesn’t charge them.</p>
              <SubmitButton variant="ghost" className="mt-2 ring-1 ring-line">Update access</SubmitButton>
            </ActionForm>
          </Panel>

          <Panel title="Goals">
            {goals.length === 0 ? (
              <Empty>No goals yet.</Empty>
            ) : (
              <ul className="space-y-3">
                {goals.map((g) => (
                  <li key={g.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold">{g.name}</span>
                      <span className="text-muted">{pct(Number(g.saved), Number(g.target))}%</span>
                    </div>
                    <Bar value={pct(Number(g.saved), Number(g.target))} tone="gold" />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Payments">
            {enrollments.length === 0 ? (
              <Empty>No payments on record.</Empty>
            ) : (
              <ul className="space-y-3 text-sm">
                {enrollments.map((e) => (
                  <li key={e.reference} className="rounded-2xl bg-cream p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{findOffer(e.offer_slug)?.pkg.name ?? e.offer_slug}</span>
                      <StatusPill status={e.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {naira(Number(e.amount_naira))} · {e.channel} · {shortDate(e.created_at)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted">{e.reference}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
