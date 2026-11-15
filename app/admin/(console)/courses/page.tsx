import Link from "next/link";
import { all } from "@/lib/db";
import { listCourses } from "@/lib/learning";
import { PILLARS, type Pillar } from "@/lib/packages";
import { ActionForm, SubmitButton } from "@/components/app/ui";
import { input } from "@/lib/styles";
import { PageHeader, Panel } from "@/components/admin/ui";
import { createCourse, moveCourse } from "../../actions";

export const metadata = { title: "Courses" };

export default async function CoursesAdmin() {
  const courses = await listCourses();
  const stats = await all<{ course_id: string; lessons: number; learners: number }>(
    `SELECT l.course_id, COUNT(DISTINCT l.id) lessons, COUNT(DISTINCT p.student_id) learners
     FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id = l.id GROUP BY l.course_id`,
  );
  const statOf = (id: string) => stats.find((s) => s.course_id === id);

  return (
    <>
      <PageHeader eyebrow="Learning" title="Courses">
        <Link href="/app/learn" className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-cream">View as student ↗</Link>
      </PageHeader>

      <div className="overflow-hidden rounded-3xl bg-paper ring-1 ring-line">
        <ul className="divide-y divide-line">
          {courses.map((c, i) => {
            const st = statOf(c.id);
            return (
              <li key={c.id} className="flex items-center gap-3 p-4 sm:gap-4 sm:px-6">
                <div className="flex flex-col">
                  <form action={moveCourse}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button disabled={i === 0} aria-label={`Move ${c.title} up`} className="px-1 text-xs text-muted hover:text-ink disabled:opacity-20">▲</button>
                  </form>
                  <form action={moveCourse}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button disabled={i === courses.length - 1} aria-label={`Move ${c.title} down`} className="px-1 text-xs text-muted hover:text-ink disabled:opacity-20">▼</button>
                  </form>
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cream text-2xl" aria-hidden>{c.emoji}</span>
                <Link href={`/admin/courses/${c.id}`} className="group min-w-0 flex-1">
                  <span className="block truncate font-display text-lg font-bold group-hover:text-moss group-hover:underline">{c.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {PILLARS[c.pillar as Pillar].name} · {st?.lessons ?? 0} lessons · {st?.learners ?? 0} learners
                  </span>
                </Link>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.published ? "bg-moss/15 text-moss" : "bg-cream text-muted"}`}>
                  {c.published ? "Published" : "Draft"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <Panel title="New course">
        <ActionForm action={createCourse}>
          <div className="grid gap-3 sm:grid-cols-[5rem_1fr_14rem]">
            <label className="text-sm font-semibold">
              Icon
              <input name="emoji" defaultValue="📘" maxLength={8} className={`mt-1 ${input} text-center`} />
            </label>
            <label className="text-sm font-semibold">
              Title
              <input name="title" required maxLength={100} placeholder="e.g. Rent Without Tears" className={`mt-1 ${input}`} />
            </label>
            <label className="text-sm font-semibold">
              Who can access it
              <select name="pillar" defaultValue="1" className={`mt-1 ${input}`}>
                {([1, 2, 3, 4] as Pillar[]).map((p) => <option key={p} value={p}>Pillar {p}: {PILLARS[p].name}</option>)}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted">Students see a course if their package includes its pillar. New courses start as drafts.</p>
          <SubmitButton className="mt-3" pendingText="Creating…">Create course</SubmitButton>
        </ActionForm>
      </Panel>
    </>
  );
}
