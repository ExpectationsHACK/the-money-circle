import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/lib/db";
import { courseOutline, embedUrl, getCourseById, type Lesson } from "@/lib/learning";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/app/ui";
import { input } from "@/lib/styles";
import { Panel } from "@/components/admin/ui";
import { Markdown } from "@/components/Markdown";
import { deleteLesson, updateLesson } from "../../../../../actions";

export default async function LessonEditor({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const p = await params;
  const [course, lesson] = await Promise.all([getCourseById(p.id), one<Lesson>("SELECT * FROM lessons WHERE id = ? AND course_id = ?", [p.lessonId, p.id])]);
  if (!course || !lesson) notFound();
  const { modules } = await courseOutline(course.id);
  const embed = embedUrl(lesson.video_url);
  const completions = await one<{ n: number }>("SELECT COUNT(*) n FROM lesson_progress WHERE lesson_id = ?", [lesson.id]);

  return (
    <>
      <Link href={`/admin/courses/${course.id}`} className="text-sm font-semibold text-muted hover:text-ink">← {course.title}</Link>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Edit lesson">
          <ActionForm action={updateLesson} resetOnSuccess={false}>
            <input type="hidden" name="lessonId" value={lesson.id} />
            <input type="hidden" name="courseId" value={course.id} />
            <label className="block text-sm font-semibold">
              Title
              <input name="title" required maxLength={120} defaultValue={lesson.title} className={`mt-1 ${input}`} />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem]">
              <label className="text-sm font-semibold">
                Module
                <select name="moduleId" defaultValue={lesson.module_id} className={`mt-1 ${input}`}>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">
                Minutes
                <input name="minutes" type="number" min={1} max={600} defaultValue={lesson.minutes} className={`mt-1 ${input}`} />
              </label>
            </div>
            <label className="mt-3 block text-sm font-semibold">
              Video link <span className="font-normal text-muted">(YouTube, Vimeo or Loom; optional)</span>
              <input name="video_url" type="url" defaultValue={lesson.video_url ?? ""} placeholder="https://youtu.be/…" className={`mt-1 ${input}`} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Lesson notes
              <textarea name="body" rows={16} defaultValue={lesson.body} className={`mt-1 ${input} font-mono text-sm leading-relaxed`} />
            </label>
            <p className="mt-1 text-xs text-muted">
              Formatting: <code>## Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- bullet</code>, <code>1. step</code>, <code>&gt; quote</code>, <code>[link](https://…)</code>. Leave a blank line between paragraphs.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="text-sm font-semibold">
                URL slug
                <input name="slug" defaultValue={lesson.slug} maxLength={60} className={`mt-1 ${input}`} />
              </label>
              <label className="flex items-center gap-2 rounded-xl bg-cream px-4 py-2.5 text-sm font-semibold">
                <input type="checkbox" name="published" defaultChecked={Boolean(lesson.published)} className="size-4 accent-[#0f3d2e]" />
                Published
              </label>
            </div>
            <SubmitButton className="mt-4">Save lesson</SubmitButton>
          </ActionForm>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
            <span>Completed by {completions?.n ?? 0} student{Number(completions?.n) === 1 ? "" : "s"}</span>
            <form action={deleteLesson}>
              <input type="hidden" name="lessonId" value={lesson.id} />
              <input type="hidden" name="courseId" value={course.id} />
              <ConfirmButton message={`Delete “${lesson.title}”? Student progress on it is lost.`} className="font-semibold hover:text-coral">Delete lesson</ConfirmButton>
            </form>
          </div>
        </Panel>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Preview (last saved)</p>
          <div className="rounded-3xl bg-cream p-5 ring-1 ring-line sm:p-6">
            <h2 className="font-display text-2xl font-bold">{lesson.title}</h2>
            <p className="text-sm text-muted">{lesson.minutes} min</p>
            {embed ? (
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-ink">
                <iframe src={embed} title={lesson.title} className="size-full" allowFullScreen loading="lazy" />
              </div>
            ) : lesson.video_url ? (
              <p className="mt-4 rounded-xl bg-coral/10 p-3 text-sm text-coral">This link can’t be embedded, so students will get a “Watch video” button instead. Use a YouTube, Vimeo or Loom share link to embed it.</p>
            ) : null}
            {lesson.body.trim() ? (
              <div className="mt-4 rounded-2xl bg-paper p-5"><Markdown source={lesson.body} /></div>
            ) : (
              <p className="mt-4 text-sm text-muted">No notes yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
