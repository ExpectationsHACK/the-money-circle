import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { completedLessonIds, courseOutline, embedUrl, getCourseBySlug } from "@/lib/learning";
import { PILLARS, type Pillar } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { Locked, SubmitButton } from "@/components/app/ui";
import { Markdown } from "@/components/Markdown";
import { setLessonComplete } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ course: string; lesson: string }> }) {
  const s = await requireStudent();
  const p = await params;
  const course = await getCourseBySlug(p.course);
  if (!course || !course.published) notFound();
  if (!hasPillar(s, course.pillar as Pillar))
    return <Locked title={course.title} pillarName={PILLARS[course.pillar as Pillar].name} body={course.summary} />;

  const [{ lessons, modules }, done] = await Promise.all([courseOutline(course.id, { publishedOnly: true }), completedLessonIds(s.id)]);
  const idx = lessons.findIndex((l) => l.slug === p.lesson);
  if (idx < 0) notFound();
  const lesson = lessons[idx];
  const prev = lessons[idx - 1];
  const next = lessons[idx + 1];
  const isDone = done.has(lesson.id);
  const embed = embedUrl(lesson.video_url);
  const moduleTitle = modules.find((m) => m.id === lesson.module_id)?.title;
  const base = `/app/learn/${course.slug}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_17rem]">
      <article className="min-w-0">
        <Link href={base} className="text-sm font-semibold text-muted hover:text-ink">← {course.title}</Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-moss">
          Lesson {idx + 1} of {lessons.length}{moduleTitle ? ` · ${moduleTitle}` : ""}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">{lesson.title}</h1>
        <p className="mt-1 text-sm text-muted">{lesson.minutes} min{isDone ? " · ✓ Completed" : ""}</p>

        {embed ? (
          <div className="mt-6 aspect-video overflow-hidden rounded-3xl bg-ink ring-1 ring-line">
            <iframe
              src={embed}
              title={lesson.title}
              className="size-full"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : lesson.video_url ? (
          <a href={lesson.video_url} target="_blank" rel="noreferrer" className="mt-6 flex items-center gap-3 rounded-2xl bg-forest p-5 font-semibold text-cream">
            ▶ Watch the lesson video
          </a>
        ) : null}

        {lesson.body.trim() && (
          <div className="mt-6 rounded-3xl bg-paper p-6 ring-1 ring-line sm:p-8">
            <Markdown source={lesson.body} />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-paper p-4 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
          {prev ? (
            <Link href={`${base}/${prev.slug}`} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:bg-cream hover:text-ink">← Previous</Link>
          ) : <span />}
          <form action={setLessonComplete} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <input type="hidden" name="complete" value={isDone ? "0" : "1"} />
            <input type="hidden" name="next" value={next ? `${base}/${next.slug}` : base} />
            {isDone ? (
              <>
                <SubmitButton variant="ghost" pendingText="…">Mark as not done</SubmitButton>
                {next && <Link href={`${base}/${next.slug}`} className="rounded-xl bg-forest px-4 py-2.5 text-center text-sm font-bold text-cream hover:bg-forest-2">Next lesson →</Link>}
              </>
            ) : (
              <SubmitButton pendingText="Saving…">{next ? "Complete & continue →" : "Complete course 🎉"}</SubmitButton>
            )}
          </form>
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-8 rounded-3xl bg-paper p-3 ring-1 ring-line">
          <p className="px-3 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-muted">In this course</p>
          <ol>
            {lessons.map((l, i) => (
              <li key={l.id}>
                <Link
                  href={`${base}/${l.slug}`}
                  aria-current={l.id === lesson.id ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${l.id === lesson.id ? "bg-gold/25 font-bold" : "hover:bg-cream"}`}
                >
                  <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done.has(l.id) ? "bg-moss text-cream" : "border border-line text-muted"}`}>
                    {done.has(l.id) ? "✓" : i + 1}
                  </span>
                  <span className="line-clamp-2">{l.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}
