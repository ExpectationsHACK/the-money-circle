import Link from "next/link";
import { notFound } from "next/navigation";
import { courseOutline, getCourseById } from "@/lib/learning";
import { PACKAGES, PILLARS, type Pillar } from "@/lib/packages";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/app/ui";
import { input } from "@/lib/styles";
import { Panel } from "@/components/admin/ui";
import { addLesson, addModule, deleteCourse, deleteModule, moveLesson, moveModule, renameModule, setCoursePublished, updateCourse } from "../../../actions";

function Mover({ action, id, courseId, first, last, label }: { action: (fd: FormData) => Promise<void>; id: string; courseId: string; first: boolean; last: boolean; label: string }) {
  return (
    <div className="flex">
      {(["up", "down"] as const).map((dir) => (
        <form key={dir} action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="dir" value={dir} />
          <button
            disabled={dir === "up" ? first : last}
            aria-label={`Move ${label} ${dir}`}
            className="rounded px-1.5 py-1 text-xs text-muted hover:bg-cream hover:text-ink disabled:opacity-20"
          >
            {dir === "up" ? "▲" : "▼"}
          </button>
        </form>
      ))}
    </div>
  );
}

export default async function CourseEditor({ params }: { params: Promise<{ id: string }> }) {
  const course = await getCourseById((await params).id);
  if (!course) notFound();
  const { modules, lessons } = await courseOutline(course.id);
  const audience = PACKAGES.filter((p) => p.pillars.includes(course.pillar as Pillar)).map((p) => p.name);

  return (
    <>
      <Link href="/admin/courses" className="text-sm font-semibold text-muted hover:text-ink">← Courses</Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-14 place-items-center rounded-2xl bg-paper text-3xl ring-1 ring-line" aria-hidden>{course.emoji}</span>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="text-sm text-muted">{lessons.length} lessons · visible to {audience.join(", ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {course.published ? (
            <Link href={`/app/learn/${course.slug}`} className="rounded-xl bg-paper px-4 py-2.5 text-sm font-bold ring-1 ring-line hover:bg-cream">Preview ↗</Link>
          ) : null}
          <form action={setCoursePublished}>
            <input type="hidden" name="courseId" value={course.id} />
            <input type="hidden" name="published" value={course.published ? "0" : "1"} />
            <SubmitButton variant={course.published ? "ghost" : "primary"} className={course.published ? "ring-1 ring-line" : ""}>
              {course.published ? "Unpublish" : "Publish course"}
            </SubmitButton>
          </form>
        </div>
      </div>

      {!course.published && (
        <p className="rounded-2xl bg-gold/20 px-4 py-3 text-sm"><strong>Draft:</strong> students can’t see this course until you publish it. Lessons also have their own publish switch.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          {modules.map((m, mi) => (
            <section key={m.id} className="rounded-3xl bg-paper ring-1 ring-line">
              <div className="flex items-center gap-2 border-b border-line p-3 sm:px-5">
                <Mover action={moveModule} id={m.id} courseId={course.id} first={mi === 0} last={mi === modules.length - 1} label={m.title} />
                <ActionForm action={renameModule} resetOnSuccess={false} className="flex-1">
                  <input type="hidden" name="moduleId" value={m.id} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">Module {mi + 1}</span>
                    <input name="title" defaultValue={m.title} aria-label="Module title" className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-display font-bold outline-none hover:border-line focus:border-forest" />
                    <SubmitButton variant="ghost" pendingText="…" className="px-2 py-1 text-xs">Save</SubmitButton>
                  </div>
                </ActionForm>
                <form action={deleteModule}>
                  <input type="hidden" name="moduleId" value={m.id} />
                  <input type="hidden" name="courseId" value={course.id} />
                  <ConfirmButton message={`Delete “${m.title}” and its ${m.lessons.length} lesson(s)? Student progress on them is lost.`} className="rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:text-coral">
                    Delete
                  </ConfirmButton>
                </form>
              </div>
              <ol className="p-2">
                {m.lessons.map((l, li) => (
                  <li key={l.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-cream">
                    <Mover action={moveLesson} id={l.id} courseId={course.id} first={li === 0} last={li === m.lessons.length - 1} label={l.title} />
                    <Link href={`/admin/courses/${course.id}/lessons/${l.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold hover:text-moss">{l.title}</span>
                      <span className="text-xs text-muted">{l.video_url ? "▶ Video" : "📄 Reading"} · {l.minutes} min</span>
                    </Link>
                    {!l.published && <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold text-muted">Draft</span>}
                    <Link href={`/admin/courses/${course.id}/lessons/${l.id}`} className="rounded-lg px-2 py-1 text-xs font-semibold text-moss">Edit</Link>
                  </li>
                ))}
              </ol>
              <ActionForm action={addLesson} className="border-t border-line p-3 sm:px-5">
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="moduleId" value={m.id} />
                <div className="flex gap-2">
                  <input name="title" required maxLength={120} placeholder="New lesson title…" aria-label={`New lesson in ${m.title}`} className={`${input} py-2 text-sm`} />
                  <SubmitButton variant="dark" pendingText="…">Add lesson</SubmitButton>
                </div>
              </ActionForm>
            </section>
          ))}

          <ActionForm action={addModule} className="rounded-3xl border-2 border-dashed border-line p-4">
            <input type="hidden" name="courseId" value={course.id} />
            <div className="flex gap-2">
              <input name="title" required maxLength={100} placeholder="New module, e.g. “Putting it into practice”" aria-label="New module title" className={`${input} py-2 text-sm`} />
              <SubmitButton variant="ghost" pendingText="…" className="ring-1 ring-line">Add module</SubmitButton>
            </div>
          </ActionForm>
        </div>

        <div className="space-y-6">
          <Panel title="Course details">
            <ActionForm action={updateCourse} resetOnSuccess={false}>
              <input type="hidden" name="courseId" value={course.id} />
              <div className="grid grid-cols-[4.5rem_1fr] gap-3">
                <label className="text-sm font-semibold">
                  Icon
                  <input name="emoji" defaultValue={course.emoji} maxLength={8} className={`mt-1 ${input} text-center`} />
                </label>
                <label className="text-sm font-semibold">
                  Title
                  <input name="title" required defaultValue={course.title} maxLength={100} className={`mt-1 ${input}`} />
                </label>
              </div>
              <label className="mt-3 block text-sm font-semibold">
                Summary
                <textarea name="summary" rows={3} maxLength={400} defaultValue={course.summary} className={`mt-1 ${input}`} />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm font-semibold">
                  Tag
                  <input name="tag" defaultValue={course.tag} maxLength={30} placeholder="Start here" className={`mt-1 ${input}`} />
                </label>
                <label className="text-sm font-semibold">
                  URL slug
                  <input name="slug" defaultValue={course.slug} maxLength={60} className={`mt-1 ${input}`} />
                </label>
              </div>
              <label className="mt-3 block text-sm font-semibold">
                Access
                <select name="pillar" defaultValue={String(course.pillar)} className={`mt-1 ${input}`}>
                  {([1, 2, 3, 4] as Pillar[]).map((p) => <option key={p} value={p}>Pillar {p}: {PILLARS[p].name}</option>)}
                </select>
              </label>
              <SubmitButton variant="dark" className="mt-4">Save details</SubmitButton>
            </ActionForm>
          </Panel>

          <form action={deleteCourse} className="text-right">
            <input type="hidden" name="courseId" value={course.id} />
            <ConfirmButton message={`Permanently delete “${course.title}”, all its lessons and every student’s progress in it? This can’t be undone.`} className="text-sm font-semibold text-muted hover:text-coral">
              Delete course
            </ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
