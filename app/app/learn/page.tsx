import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { env } from "@/lib/env";
import { continueLearning, listCourses, progressByCourse } from "@/lib/learning";
import { PILLARS, type Pillar } from "@/lib/packages";
import { hasPillar, packageOf } from "@/lib/students";
import { Bar } from "@/components/app/ui";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const s = await requireStudent();
  const pkg = packageOf(s);
  const [courses, progress, next] = await Promise.all([
    listCourses({ publishedOnly: true }),
    progressByCourse(s.id),
    continueLearning(s.id, pkg.pillars),
  ]);
  const calls = env.get("ACADEMY_CALLS_URL");
  const communities = pkg.automation.communities.map((c) => ({ label: c.label, url: env.get(c.urlEnv) })).filter((c) => c.url);
  const unlocked = courses.filter((c) => hasPillar(s, c.pillar as Pillar));
  const locked = courses.filter((c) => !hasPillar(s, c.pillar as Pillar));
  const completedCourses = unlocked.filter((c) => progress[c.id] && progress[c.id].done === progress[c.id].total).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-moss">TMC Academy</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Learn &amp; heal</h1>
        </div>
        {unlocked.length > 0 && (
          <p className="text-sm font-semibold text-muted">{completedCourses} of {unlocked.length} courses completed</p>
        )}
      </div>

      {next && (
        <Link
          href={`/app/learn/${next.course.slug}/${next.lesson.slug}`}
          className="grain group block rounded-3xl bg-forest p-6 text-cream transition hover:bg-forest-2 sm:p-8"
        >
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{next.done ? "Continue learning" : "Start here"}</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-3xl" aria-hidden>{next.course.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-cream/70">{next.course.title}</p>
              <p className="font-display text-2xl font-bold leading-tight">{next.lesson.title}</p>
            </div>
            <span className="hidden rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-ink transition group-hover:bg-gold-soft sm:block">
              {next.done ? "Resume" : "Start"} →
            </span>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold" style={{ width: `${(next.done / Math.max(1, next.total)) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-cream/60">{next.done} of {next.total} lessons · {next.lesson.minutes} min lesson</p>
        </Link>
      )}

      <section>
        <h2 className="font-display text-xl font-bold">Your courses</h2>
        {unlocked.length === 0 ? (
          <p className="mt-2 text-sm text-muted">New courses for your package are on the way.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {unlocked.map((c) => {
              const p = progress[c.id] ?? { done: 0, total: 0 };
              const finished = p.total > 0 && p.done === p.total;
              return (
                <Link key={c.id} href={`/app/learn/${c.slug}`} className="flex flex-col rounded-3xl bg-paper p-5 ring-1 ring-line transition hover:-translate-y-0.5 hover:ring-forest/40">
                  <div className="flex items-start justify-between">
                    <span className="grid size-12 place-items-center rounded-2xl bg-cream text-2xl" aria-hidden>{c.emoji}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${finished ? "bg-moss text-cream" : "bg-cream"}`}>
                      {finished ? "Completed ✓" : c.tag || PILLARS[c.pillar as Pillar]?.short}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted">{c.summary}</p>
                  <div className="mt-4"><Bar value={p.total ? (p.done / p.total) * 100 : 0} tone={finished ? "forest" : "gold"} /></div>
                  <p className="mt-1.5 text-xs font-semibold text-muted">{p.done}/{p.total} lessons</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {locked.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold">Unlock more</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((c) => (
              <Link key={c.id} href="/#packages" className="flex flex-col rounded-3xl bg-paper/60 p-5 ring-1 ring-line ring-dashed">
                <div className="flex items-start justify-between">
                  <span className="grid size-12 place-items-center rounded-2xl bg-cream text-2xl opacity-60" aria-hidden>{c.emoji}</span>
                  <span className="rounded-full bg-cream px-2.5 py-1 text-xs font-bold">🔒 {PILLARS[c.pillar as Pillar]?.name}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-ink/70">{c.title}</h3>
                <p className="mt-1 text-sm text-muted">{c.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl bg-paper p-6 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Live every month</p>
          <h2 className="mt-2 font-display text-xl font-bold">Money Therapy &amp; Q&amp;A</h2>
          <p className="mt-1 text-sm text-muted">Bring your real questions. Group calls with your coach and the Circle.</p>
          {hasPillar(s, 1) && calls ? (
            <a href={calls} target="_blank" className="mt-4 inline-block rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-cream">See the schedule</a>
          ) : (
            <p className="mt-4 text-sm text-muted">{hasPillar(s, 1) ? "Schedule coming soon." : `Included with ${PILLARS[1].name}.`}</p>
          )}
        </section>
        <section className="rounded-3xl bg-paper p-6 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Your circles</p>
          <h2 className="mt-2 font-display text-xl font-bold">Community</h2>
          {communities.length ? (
            <ul className="mt-3 space-y-2">
              {communities.map((c) => (
                <li key={c.label}>
                  <a href={c.url} target="_blank" className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 text-sm font-semibold hover:bg-gold/25">
                    {c.label} <span aria-hidden>→</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">Your community invite links are in your acceptance letter.</p>
          )}
        </section>
      </div>
    </div>
  );
}
