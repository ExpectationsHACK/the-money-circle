import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { completedLessonIds, courseOutline, getCourseBySlug } from "@/lib/learning";
import { PILLARS, type Pillar } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { Bar, Locked } from "@/components/app/ui";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const s = await requireStudent();
  const course = await getCourseBySlug((await params).course);
  if (!course || !course.published) notFound();
  if (!hasPillar(s, course.pillar as Pillar))
    return <Locked title={course.title} pillarName={PILLARS[course.pillar as Pillar].name} body={course.summary} />;

  const [{ modules, lessons }, done] = await Promise.all([courseOutline(course.id, { publishedOnly: true }), completedLessonIds(s.id)]);
  const finished = lessons.filter((l) => done.has(l.id)).length;
  const next = lessons.find((l) => !done.has(l.id)) ?? lessons[0];
  const minutes = lessons.reduce((a, l) => a + Number(l.minutes), 0);

  return (
    <div className="space-y-6">
      <Link href="/app/learn" className="text-sm font-semibold text-muted hover:text-ink">← All courses</Link>

      <header className="grain rounded-3xl bg-forest p-6 text-cream sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-white/10 text-4xl" aria-hidden>{course.emoji}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{course.tag || PILLARS[course.pillar as Pillar].name}</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-2 max-w-xl text-cream/75">{course.summary}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {next && (
            <Link href={`/app/learn/${course.slug}/${next.slug}`} className="rounded-xl bg-gold px-5 py-3 font-bold text-ink hover:bg-gold-soft">
              {finished === 0 ? "Start course" : finished === lessons.length ? "Review course" : "Continue"} →
            </Link>
          )}
          <p className="text-sm text-cream/70">{lessons.length} lessons · about {minutes} min</p>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gold" style={{ width: `${(finished / Math.max(1, lessons.length)) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-cream/60">{finished} of {lessons.length} completed</p>
      </header>

      {modules.filter((m) => m.lessons.length).map((m, mi) => (
        <section key={m.id} className="rounded-3xl bg-paper ring-1 ring-line">
          <div className="flex items-center justify-between gap-4 p-5 pb-2 sm:px-6">
            <h2 className="font-display text-lg font-bold">
              <span className="text-muted">Module {mi + 1} · </span>{m.title}
            </h2>
            <span className="text-xs font-semibold text-muted">{m.lessons.filter((l) => done.has(l.id)).length}/{m.lessons.length}</span>
          </div>
          <div className="px-5 sm:px-6"><Bar value={(m.lessons.filter((l) => done.has(l.id)).length / m.lessons.length) * 100} /></div>
          <ol className="mt-2 p-2 sm:p-3">
            {m.lessons.map((l) => {
              const isDone = done.has(l.id);
              return (
                <li key={l.id}>
                  <Link href={`/app/learn/${course.slug}/${l.slug}`} className="flex items-center gap-3 rounded-2xl p-3 hover:bg-cream">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${isDone ? "bg-moss text-cream" : "border-2 border-line text-muted"}`}>
                      {isDone ? "✓" : lessons.indexOf(l) + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-semibold ${isDone ? "text-muted" : ""}`}>{l.title}</span>
                      <span className="text-xs text-muted">{l.video_url ? "▶ Video" : "📄 Reading"} · {l.minutes} min</span>
                    </span>
                    <span className="text-muted" aria-hidden>→</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
