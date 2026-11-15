"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { batch, id, now, one, run } from "@/lib/db";
import { env } from "@/lib/env";
import { DEFAULT_MILESTONES, INVESTMENT_KINDS, parseNaira } from "@/lib/money";
import type { Pillar } from "@/lib/packages";
import { hasPillar, seedSampleData } from "@/lib/students";

export type ActionState = { error?: string; ok?: string } | null;

async function student(pillar?: Pillar) {
  const s = await requireStudent();
  if (pillar && !hasPillar(s, pillar)) throw new Error("Your package doesn’t include this tool yet.");
  return s;
}

function str(fd: FormData, k: string, max = 120): string {
  return String(fd.get(k) ?? "").trim().slice(0, max);
}

function refresh() {
  revalidatePath("/app", "layout");
}

// ---------- Investments (Pillar 3) ----------

export async function addHolding(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(3);
  const name = str(fd, "name", 80);
  const kind = str(fd, "kind");
  const invested = parseNaira(fd.get("invested"));
  const current = fd.get("current") && String(fd.get("current")).trim() ? parseNaira(fd.get("current")) : invested;
  if (!name) return { error: "Name the investment, e.g. “FGN 364-day T-bill”" };
  if (!INVESTMENT_KINDS.some((k) => k.id === kind)) return { error: "Pick a type" };
  if (!(invested > 0) || !(current >= 0)) return { error: "Check the amounts" };
  await run("INSERT INTO holdings (id, student_id, name, kind, invested, current_value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [id(), s.id, name, kind, invested, current, now()]);
  refresh();
  return { ok: "Investment added" };
}

export async function updateHoldingValue(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(3);
  const current = parseNaira(fd.get("current"));
  if (!(current >= 0)) return { error: "Enter today’s value" };
  await run("UPDATE holdings SET current_value = ?, updated_at = ? WHERE id = ? AND student_id = ?", [current, now(), str(fd, "id"), s.id]);
  refresh();
  return { ok: "Value updated" };
}

export async function deleteHolding(fd: FormData) {
  const s = await student(3);
  await run("DELETE FROM holdings WHERE id = ? AND student_id = ?", [str(fd, "id"), s.id]);
  refresh();
}

// ---------- LaunchPad (Pillar 4) ----------

export async function startMilestones() {
  const s = await student(4);
  const existing = await one<{ n: number }>("SELECT COUNT(*) AS n FROM milestones WHERE student_id = ?", [s.id]);
  if (Number(existing?.n ?? 0) === 0) {
    await batch(
      DEFAULT_MILESTONES.map((t, i) => ({ sql: "INSERT INTO milestones (id, student_id, title, sort) VALUES (?, ?, ?, ?)", args: [id(), s.id, t, i] })),
    );
  }
  refresh();
}

export async function toggleMilestone(fd: FormData) {
  const s = await student(4);
  await run(
    "UPDATE milestones SET done = 1 - done, done_at = CASE WHEN done = 0 THEN ? ELSE NULL END WHERE id = ? AND student_id = ?",
    [now(), str(fd, "id"), s.id],
  );
  refresh();
}

export async function addMilestone(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(4);
  const title = str(fd, "title", 100);
  if (!title) return { error: "What’s the milestone?" };
  await run("INSERT INTO milestones (id, student_id, title, sort) VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM milestones WHERE student_id = ?))", [
    id(), s.id, title, s.id,
  ]);
  refresh();
  return { ok: "Milestone added" };
}

export async function deleteMilestone(fd: FormData) {
  const s = await student(4);
  await run("DELETE FROM milestones WHERE id = ? AND student_id = ?", [str(fd, "id"), s.id]);
  refresh();
}

// ---------- Misc ----------

export async function loadSampleData() {
  const s = await requireStudent();
  if (env.paymentMode() !== "demo") return;
  await seedSampleData(s.id);
  refresh();
  redirect("/app");
}

// ---------- Learning ----------

export async function setLessonComplete(fd: FormData) {
  const s = await requireStudent();
  const lessonId = str(fd, "lessonId");
  const complete = str(fd, "complete") === "1";
  const lesson = await one<{ pillar: number; course_slug: string; lesson_slug: string }>(
    `SELECT c.pillar, c.slug course_slug, l.slug lesson_slug FROM lessons l JOIN courses c ON c.id = l.course_id
     WHERE l.id = ? AND l.published = 1 AND c.published = 1`,
    [lessonId],
  );
  if (!lesson || !hasPillar(s, lesson.pillar as Pillar)) return;
  if (complete) await run("INSERT OR IGNORE INTO lesson_progress (student_id, lesson_id, completed_at) VALUES (?, ?, ?)", [s.id, lessonId, now()]);
  else await run("DELETE FROM lesson_progress WHERE student_id = ? AND lesson_id = ?", [s.id, lessonId]);
  refresh();
  const next = str(fd, "next");
  if (complete && next.startsWith("/app/learn/")) redirect(next);
}
