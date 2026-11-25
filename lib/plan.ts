import { one, run, now } from "./db";
import { normalisePlan, type PlanRecord } from "./plan-model";
import type { Student } from "./students";

export async function getPlan(s: Student): Promise<PlanRecord> {
  const row = await one<{ data: string; status: PlanRecord["status"]; client_signature: string | null; submitted_at: string | null; coach_signed_at: string | null; coach_note: string | null; updated_at: string }>(
    "SELECT * FROM financial_plans WHERE student_id = ?",
    [s.id],
  );
  const start = s.started_at.slice(0, 10);
  let parsed: unknown = null;
  try {
    parsed = row ? JSON.parse(row.data) : null;
  } catch {
    parsed = null;
  }
  return {
    data: normalisePlan(parsed, start),
    status: row?.status ?? "draft",
    client_signature: row?.client_signature ?? null,
    submitted_at: row?.submitted_at ?? null,
    coach_signed_at: row?.coach_signed_at ?? null,
    coach_note: row?.coach_note ?? null,
    updated_at: row?.updated_at ?? now(),
  };
}

export async function writePlanData(studentId: string, data: unknown) {
  await run(
    `INSERT INTO financial_plans (student_id, data, status, updated_at) VALUES (?, ?, 'draft', ?)
     ON CONFLICT(student_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    [studentId, JSON.stringify(data), now()],
  );
}
