import Link from "next/link";
import { all, one } from "@/lib/db";
import { currentMonth, naira } from "@/lib/money";
import { PACKAGES, findOffer } from "@/lib/packages";
import { Empty, PageHeader, Panel, Stat, StatusPill, StudentLink, timeAgo, waLink } from "@/components/admin/ui";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const month = currentMonth();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [students, newThisMonth, active7, revMonth, revAll, pending, mix, recent, inactive, lessons7, topCourses] = await Promise.all([
    one<{ n: number }>("SELECT COUNT(*) n FROM students"),
    one<{ n: number }>("SELECT COUNT(*) n FROM students WHERE substr(created_at,1,7) = ?", [month]),
    one<{ n: number }>("SELECT COUNT(*) n FROM students WHERE last_seen_at >= ?", [weekAgo]),
    one<{ v: number; n: number }>("SELECT COALESCE(SUM(amount_naira),0) v, COUNT(*) n FROM enrollments WHERE status = 'complete' AND substr(created_at,1,7) = ?", [month]),
    one<{ v: number; demo: number }>("SELECT COALESCE(SUM(amount_naira),0) v, COALESCE(SUM(CASE WHEN channel = 'demo' THEN amount_naira END),0) demo FROM enrollments WHERE status = 'complete'"),
    one<{ n: number }>("SELECT COUNT(*) n FROM enrollments WHERE status IN ('awaiting-transfer','failed')"),
    all<{ package_id: string; n: number }>("SELECT package_id, COUNT(*) n FROM students GROUP BY package_id"),
    all<{ reference: string; email: string; full_name: string | null; offer_slug: string; amount_naira: number; status: string; channel: string; created_at: string; student_id: string | null }>(
      "SELECT reference, email, full_name, offer_slug, amount_naira, status, channel, created_at, student_id FROM enrollments ORDER BY created_at DESC LIMIT 8",
    ),
    all<{ id: string; full_name: string; email: string; phone: string; last_seen_at: string | null; package_id: string }>(
      "SELECT id, full_name, email, phone, last_seen_at, package_id FROM students WHERE last_seen_at IS NULL OR last_seen_at < ? ORDER BY last_seen_at LIMIT 6",
      [weekAgo],
    ),
    one<{ n: number }>("SELECT COUNT(*) n FROM lesson_progress WHERE completed_at >= ?", [weekAgo]),
    all<{ title: string; emoji: string; n: number }>(
      `SELECT c.title, c.emoji, COUNT(DISTINCT p.student_id) n FROM courses c
       JOIN lessons l ON l.course_id = c.id JOIN lesson_progress p ON p.lesson_id = l.id
       GROUP BY c.id ORDER BY n DESC LIMIT 5`,
    ),
  ]);

  const total = Number(students?.n ?? 0);
  const plansToReview = await all<{ student_id: string; full_name: string }>(
    "SELECT f.student_id, s.full_name FROM financial_plans f JOIN students s ON s.id = f.student_id WHERE f.status = 'submitted' ORDER BY f.submitted_at LIMIT 5",
  );
  const maxMix = Math.max(1, ...mix.map((m) => Number(m.n)));

  return (
    <>
      <PageHeader eyebrow="Coach console" title="Overview">
        <Link href="/admin/enrollments#approve" className="rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-cream hover:bg-forest-2">+ Approve a transfer</Link>
      </PageHeader>

      {Number(pending?.n ?? 0) > 0 && (
        <Link href="/admin/enrollments?status=attention" className="flex items-center justify-between rounded-2xl bg-coral/10 px-5 py-4 text-sm font-semibold text-coral ring-1 ring-coral/30">
          {pending?.n} enrollment{Number(pending?.n) > 1 ? "s" : ""} need{Number(pending?.n) === 1 ? "s" : ""} your attention (pending transfers or failed onboarding)
          <span>Review →</span>
        </Link>
      )}

      {plansToReview.length > 0 && (
        <div className="rounded-2xl bg-gold/20 px-5 py-4 text-sm ring-1 ring-gold/40">
          <p className="font-semibold">📋 {plansToReview.length} financial plan{plansToReview.length > 1 ? "s" : ""} waiting for your review</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plansToReview.map((p) => (
              <Link key={p.student_id} href={`/admin/students/${p.student_id}/plan`} className="rounded-full bg-paper px-3 py-1 font-semibold ring-1 ring-line hover:bg-cream">{p.full_name} →</Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Students" value={String(total)} sub={`+${newThisMonth?.n ?? 0} this month`} tone="good" />
        <Stat label="Active this week" value={String(active7?.n ?? 0)} sub={total ? `${Math.round((Number(active7?.n ?? 0) / total) * 100)}% of students` : undefined} />
        <Stat label="Revenue this month" value={naira(Number(revMonth?.v ?? 0), { compact: true })} sub={`${revMonth?.n ?? 0} enrollments`} />
        <Stat
          label="All-time revenue"
          value={naira(Number(revAll?.v ?? 0), { compact: true })}
          sub={Number(revAll?.demo ?? 0) ? `incl. ${naira(Number(revAll?.demo), { compact: true })} demo` : "confirmed payments"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Recent enrollments" action={<Link href="/admin/enrollments" className="text-sm font-semibold text-moss">All →</Link>}>
          {recent.length === 0 ? (
            <Empty>No enrollments yet. They’ll appear here the moment someone pays.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((e) => (
                <li key={e.reference} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    {e.student_id ? (
                      <StudentLink id={e.student_id} name={e.full_name ?? e.email} email={findOffer(e.offer_slug)?.pkg.name} />
                    ) : (
                      <>
                        <span className="block truncate font-semibold">{e.full_name ?? e.email}</span>
                        <span className="block text-xs text-muted">{findOffer(e.offer_slug)?.pkg.name}</span>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="block font-semibold tabular-nums">{naira(Number(e.amount_naira))}</span>
                    <span className="block text-xs text-muted">{timeAgo(e.created_at)}</span>
                  </div>
                  <StatusPill status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Package mix">
          {mix.length === 0 ? (
            <Empty>No students yet.</Empty>
          ) : (
            <ul className="space-y-4">
              {PACKAGES.map((p) => {
                const n = Number(mix.find((m) => m.package_id === p.id)?.n ?? 0);
                return (
                  <li key={p.id}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-semibold">{p.name}</span>
                      <span className="tabular-nums text-muted">{n}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-cream">
                      <div className={`h-full rounded-full ${p.vip ? "bg-gold" : "bg-moss"}`} style={{ width: `${(n / maxMix) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Needs a nudge" action={<span className="text-xs font-semibold text-muted">inactive 7+ days</span>}>
          {inactive.length === 0 ? (
            <Empty>Everyone has been active this week 🎉</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {inactive.map((s) => {
                const wa = waLink(s.phone, `Hi ${s.full_name.split(" ")[0]}! It’s your Money Buddy 👋 Just checking in: how’s the budget going this week? Log in and update your tracker, I’m rooting for you!`);
                return (
                  <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1"><StudentLink id={s.id} name={s.full_name} email={`last seen ${timeAgo(s.last_seen_at)}`} /></div>
                    {wa && (
                      <a href={wa} target="_blank" className="rounded-lg bg-moss/10 px-3 py-1.5 text-xs font-bold text-moss hover:bg-moss/20">WhatsApp nudge</a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Learning" action={<Link href="/admin/courses" className="text-sm font-semibold text-moss">Courses →</Link>}>
          <p className="text-sm text-muted">
            <span className="font-display text-2xl font-bold text-ink">{lessons7?.n ?? 0}</span> lessons completed in the last 7 days
          </p>
          {topCourses.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {topCourses.map((c) => (
                <li key={c.title} className="flex items-center gap-3 rounded-xl bg-cream px-3 py-2">
                  <span aria-hidden>{c.emoji}</span>
                  <span className="flex-1 font-semibold">{c.title}</span>
                  <span className="text-muted">{c.n} learner{Number(c.n) === 1 ? "" : "s"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
