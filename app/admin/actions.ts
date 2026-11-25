"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin-auth";
import { createLoginLink } from "@/lib/auth";
import { all, batch, id, now, one, run } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { slugify } from "@/lib/learning";
import { PACKAGES } from "@/lib/packages";
import { site } from "@/lib/site";
import { isAdmin } from "@/lib/validation";

export type AdminState = { ok?: string; error?: string; link?: string } | null;

function str(fd: FormData, k: string, max = 200): string {
  return String(fd.get(k) ?? "").trim().slice(0, max);
}

// ---------- Session ----------

export async function adminLogin(fd: FormData) {
  if (!isAdmin(str(fd, "secret", 500))) redirect("/admin/login?error=1");
  await startAdminSession();
  const next = str(fd, "next");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function adminLogout() {
  await endAdminSession();
  redirect("/admin/login");
}

// ---------- Students ----------

export async function addCoachNote(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const body = str(fd, "body", 4000);
  const studentId = str(fd, "studentId");
  if (!body) return { error: "Write a note first" };
  await run("INSERT INTO coach_notes (id, student_id, body, created_at) VALUES (?, ?, ?, ?)", [id(), studentId, body, now()]);
  revalidatePath(`/admin/students/${studentId}`);
  return { ok: "Note saved" };
}

export async function deleteCoachNote(fd: FormData) {
  await requireAdmin();
  await run("DELETE FROM coach_notes WHERE id = ?", [str(fd, "id")]);
  revalidatePath(`/admin/students/${str(fd, "studentId")}`);
}

export async function changeStudentPackage(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const studentId = str(fd, "studentId");
  const pkg = PACKAGES.find((p) => p.id === str(fd, "packageId"));
  if (!pkg) return { error: "Pick a package" };
  await run("UPDATE students SET package_id = ?, offer_slug = ? WHERE id = ?", [pkg.id, pkg.offers[0].slug, studentId]);
  revalidatePath("/admin", "layout");
  return { ok: `Access changed to ${pkg.name}` };
}

export async function sendStudentLoginLink(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const s = await one<{ id: string; email: string; full_name: string }>("SELECT id, email, full_name FROM students WHERE id = ?", [str(fd, "studentId")]);
  if (!s) return { error: "Student not found" };
  const link = await createLoginLink(s.id);
  await sendEmail({
    to: s.email,
    subject: `Your ${site.name} sign-in link`,
    text: `Hi ${s.full_name.split(" ")[0]}, tap to sign in: ${link}\n\nExpires in 30 minutes.`,
    html: `<p>Hi ${s.full_name.split(" ")[0]},</p><p><a href="${link}">Tap here to sign in to ${site.name}</a>. The link expires in 30 minutes.</p>`,
  });
  return { ok: `Sign-in link emailed to ${s.email}`, link: env.emailProvider() === "console" ? link : undefined };
}

// ---------- Courses ----------

async function uniqueCourseSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; ; i++) {
    const taken = await one<{ id: string }>("SELECT id FROM courses WHERE slug = ?", [slug]);
    if (!taken || taken.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
}

async function uniqueLessonSlug(courseId: string, title: string, exceptId?: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; ; i++) {
    const taken = await one<{ id: string }>("SELECT id FROM lessons WHERE course_id = ? AND slug = ?", [courseId, slug]);
    if (!taken || taken.id === exceptId) return slug;
    slug = `${base}-${i}`;
  }
}

function pillarOf(fd: FormData): number {
  const p = Number(fd.get("pillar"));
  return [1, 2, 3, 4].includes(p) ? p : 1;
}

export async function createCourse(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const title = str(fd, "title", 100);
  if (!title) return { error: "Give the course a title" };
  const cid = id();
  const max = await one<{ m: number }>("SELECT COALESCE(MAX(sort), 0) m FROM courses");
  await batch([
    {
      sql: "INSERT INTO courses (id, slug, title, summary, emoji, tag, pillar, sort, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
      args: [cid, await uniqueCourseSlug(title), title, "", str(fd, "emoji", 8) || "📘", "", pillarOf(fd), Number(max?.m ?? 0) + 1, now()],
    },
    { sql: "INSERT INTO modules (id, course_id, title, sort) VALUES (?, ?, ?, 0)", args: [id(), cid, "Module 1"] },
  ]);
  revalidatePath("/admin/courses");
  redirect(`/admin/courses/${cid}`);
}

export async function updateCourse(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const cid = str(fd, "courseId");
  const title = str(fd, "title", 100);
  if (!title) return { error: "Title is required" };
  await run("UPDATE courses SET title = ?, slug = ?, summary = ?, emoji = ?, tag = ?, pillar = ? WHERE id = ?", [
    title,
    await uniqueCourseSlug(str(fd, "slug", 60) || title, cid),
    str(fd, "summary", 400),
    str(fd, "emoji", 8) || "📘",
    str(fd, "tag", 30),
    pillarOf(fd),
    cid,
  ]);
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/app/learn", "layout");
  return { ok: "Course saved" };
}

export async function setCoursePublished(fd: FormData) {
  await requireAdmin();
  await run("UPDATE courses SET published = ? WHERE id = ?", [str(fd, "published") === "1" ? 1 : 0, str(fd, "courseId")]);
  revalidatePath("/admin/courses", "layout");
  revalidatePath("/app/learn", "layout");
}

export async function moveCourse(fd: FormData) {
  await requireAdmin();
  await reorder("courses", "1 = 1", [], str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidatePath("/admin/courses");
  revalidatePath("/app/learn", "layout");
}

export async function deleteCourse(fd: FormData) {
  await requireAdmin();
  const cid = str(fd, "courseId");
  await batch([
    { sql: "DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id = ?)", args: [cid] },
    { sql: "DELETE FROM lessons WHERE course_id = ?", args: [cid] },
    { sql: "DELETE FROM modules WHERE course_id = ?", args: [cid] },
    { sql: "DELETE FROM courses WHERE id = ?", args: [cid] },
  ]);
  revalidatePath("/admin/courses");
  revalidatePath("/app/learn", "layout");
  redirect("/admin/courses");
}

/** Swaps an item with its neighbour, normalising sort values first. */
async function reorder(table: "courses" | "modules" | "lessons", scope: string, scopeArgs: string[], itemId: string, dir: -1 | 1) {
  const rows = await all<{ id: string }>(`SELECT id FROM ${table} WHERE ${scope} ORDER BY sort, rowid`, scopeArgs);
  const i = rows.findIndex((r) => r.id === itemId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await batch(rows.map((r, idx) => ({ sql: `UPDATE ${table} SET sort = ? WHERE id = ?`, args: [idx, r.id] })));
}

// ---------- Modules ----------

export async function addModule(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const cid = str(fd, "courseId");
  const title = str(fd, "title", 100);
  if (!title) return { error: "Name the module" };
  await run("INSERT INTO modules (id, course_id, title, sort) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM modules WHERE course_id = ?))", [id(), cid, title, cid]);
  revalidatePath(`/admin/courses/${cid}`);
  return { ok: "Module added" };
}

export async function renameModule(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const title = str(fd, "title", 100);
  if (!title) return { error: "Name can’t be empty" };
  await run("UPDATE modules SET title = ? WHERE id = ?", [title, str(fd, "moduleId")]);
  revalidatePath(`/admin/courses/${str(fd, "courseId")}`);
  revalidatePath("/app/learn", "layout");
  return { ok: "Saved" };
}

export async function moveModule(fd: FormData) {
  await requireAdmin();
  const cid = str(fd, "courseId");
  await reorder("modules", "course_id = ?", [cid], str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidatePath(`/admin/courses/${cid}`);
  revalidatePath("/app/learn", "layout");
}

export async function deleteModule(fd: FormData) {
  await requireAdmin();
  const mid = str(fd, "moduleId");
  const cid = str(fd, "courseId");
  await batch([
    { sql: "DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id = ?)", args: [mid] },
    { sql: "DELETE FROM lessons WHERE module_id = ?", args: [mid] },
    { sql: "DELETE FROM modules WHERE id = ?", args: [mid] },
  ]);
  revalidatePath(`/admin/courses/${cid}`);
  revalidatePath("/app/learn", "layout");
}

// ---------- Lessons ----------

export async function addLesson(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const cid = str(fd, "courseId");
  const mid = str(fd, "moduleId");
  const title = str(fd, "title", 120);
  if (!title) return { error: "Name the lesson" };
  const lid = id();
  await run(
    `INSERT INTO lessons (id, course_id, module_id, slug, title, video_url, body, minutes, sort, published)
     VALUES (?, ?, ?, ?, ?, NULL, '', 5, (SELECT COALESCE(MAX(sort), 0) + 1 FROM lessons WHERE module_id = ?), 0)`,
    [lid, cid, mid, await uniqueLessonSlug(cid, title), title, mid],
  );
  revalidatePath(`/admin/courses/${cid}`);
  redirect(`/admin/courses/${cid}/lessons/${lid}`);
}

export async function updateLesson(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const lid = str(fd, "lessonId");
  const cid = str(fd, "courseId");
  const title = str(fd, "title", 120);
  const video = str(fd, "video_url", 500);
  const minutes = Math.max(1, Math.min(600, Number(fd.get("minutes")) || 5));
  if (!title) return { error: "Title is required" };
  if (video && !/^https:\/\//.test(video)) return { error: "Video link must start with https://" };
  const mid = str(fd, "moduleId");
  await run("UPDATE lessons SET title = ?, slug = ?, video_url = ?, body = ?, minutes = ?, published = ?, module_id = COALESCE(NULLIF(?, ''), module_id) WHERE id = ?", [
    title,
    await uniqueLessonSlug(cid, str(fd, "slug", 60) || title, lid),
    video || null,
    String(fd.get("body") ?? "").slice(0, 50_000),
    minutes,
    fd.get("published") ? 1 : 0,
    mid,
    lid,
  ]);
  revalidatePath(`/admin/courses/${cid}`, "layout");
  revalidatePath("/app/learn", "layout");
  return { ok: "Lesson saved" };
}

export async function moveLesson(fd: FormData) {
  await requireAdmin();
  const cid = str(fd, "courseId");
  const lesson = await one<{ module_id: string }>("SELECT module_id FROM lessons WHERE id = ?", [str(fd, "id")]);
  if (!lesson) return;
  await reorder("lessons", "module_id = ?", [lesson.module_id], str(fd, "id"), str(fd, "dir") === "up" ? -1 : 1);
  revalidatePath(`/admin/courses/${cid}`);
  revalidatePath("/app/learn", "layout");
}

export async function deleteLesson(fd: FormData) {
  await requireAdmin();
  const lid = str(fd, "lessonId");
  const cid = str(fd, "courseId");
  await batch([
    { sql: "DELETE FROM lesson_progress WHERE lesson_id = ?", args: [lid] },
    { sql: "DELETE FROM lessons WHERE id = ?", args: [lid] },
  ]);
  revalidatePath(`/admin/courses/${cid}`);
  revalidatePath("/app/learn", "layout");
  redirect(`/admin/courses/${cid}`);
}

// ---------- Financial plans ----------

export async function countersignPlan(_: AdminState, fd: FormData): Promise<AdminState> {
  await requireAdmin();
  const studentId = str(fd, "studentId");
  const note = str(fd, "note", 1000);
  const sign = str(fd, "sign") === "1";
  const plan = await one<{ status: string }>("SELECT status FROM financial_plans WHERE student_id = ?", [studentId]);
  if (!plan) return { error: "This student hasn’t started a plan yet." };
  if (sign && plan.status === "draft") return { error: "The student needs to submit the plan before you can sign it." };
  if (sign) await run("UPDATE financial_plans SET status = 'signed', coach_signed_at = ?, coach_note = ? WHERE student_id = ?", [now(), note || null, studentId]);
  else await run("UPDATE financial_plans SET coach_note = ? WHERE student_id = ?", [note || null, studentId]);
  revalidatePath(`/admin/students/${studentId}`, "layout");
  revalidatePath("/app", "layout");
  return { ok: sign ? "Plan countersigned ✍️ The student can see your signature and note." : "Note saved" };
}
