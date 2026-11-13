"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { batch, id, now, one, run } from "@/lib/db";
import { env } from "@/lib/env";
import { CATEGORY_IDS, DEFAULT_MILESTONES, INVESTMENT_KINDS, SAVINGS_PLATFORMS, fiftyThirtyTwenty, isMonth, parseNaira, today } from "@/lib/money";
import type { Pillar } from "@/lib/packages";
import { hasPillar, seedSampleData, setMonthlyIncome } from "@/lib/students";

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

// ---------- Money Tracker (Pillar 2) ----------

export async function addExpense(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(2);
  const amount = parseNaira(fd.get("amount"));
  const cat = str(fd, "category");
  const date = str(fd, "date") || today();
  if (!(amount > 0)) return { error: "Enter an amount, e.g. 4,500 or 4.5k" };
  if (!CATEGORY_IDS.includes(cat)) return { error: "Pick a category" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a valid date" };
  await run("INSERT INTO expenses (id, student_id, spent_on, amount, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    id(), s.id, date, amount, cat, str(fd, "note"), now(),
  ]);
  refresh();
  return { ok: `Logged ₦${amount.toLocaleString("en-NG")}` };
}

export async function deleteExpense(fd: FormData) {
  const s = await student(2);
  await run("DELETE FROM expenses WHERE id = ? AND student_id = ?", [str(fd, "id"), s.id]);
  refresh();
}

export async function saveIncome(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(2);
  const income = parseNaira(fd.get("income"));
  if (!(income > 0)) return { error: "Enter your monthly take-home pay" };
  await setMonthlyIncome(s.id, income);
  refresh();
  return { ok: "Income saved" };
}

export async function saveBudget(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(2);
  const month = str(fd, "month");
  if (!isMonth(month)) return { error: "Invalid month" };
  const stmts = [];
  for (const c of CATEGORY_IDS) {
    const raw = fd.get(`b_${c}`);
    if (raw === null || String(raw).trim() === "") {
      stmts.push({ sql: "DELETE FROM budgets WHERE student_id = ? AND month = ? AND category = ?", args: [s.id, month, c] });
      continue;
    }
    const v = parseNaira(raw);
    if (!(v >= 0)) return { error: `Check the amount for ${c}` };
    stmts.push({ sql: "INSERT OR REPLACE INTO budgets VALUES (?, ?, ?, ?)", args: [s.id, month, c, v] });
  }
  await batch(stmts);
  refresh();
  return { ok: "Budget saved" };
}

export async function applyFiftyThirtyTwenty(fd: FormData) {
  const s = await student(2);
  const month = str(fd, "month");
  if (!isMonth(month) || !s.monthly_income) return;
  const plan = fiftyThirtyTwenty(Number(s.monthly_income));
  await batch(Object.entries(plan).map(([c, v]) => ({ sql: "INSERT OR REPLACE INTO budgets VALUES (?, ?, ?, ?)", args: [s.id, month, c, v] })));
  refresh();
}

export async function copyLastMonthBudget(fd: FormData) {
  const s = await student(2);
  const month = str(fd, "month");
  const from = str(fd, "from");
  if (!isMonth(month) || !isMonth(from)) return;
  await run(
    "INSERT OR REPLACE INTO budgets (student_id, month, category, amount) SELECT student_id, ?, category, amount FROM budgets WHERE student_id = ? AND month = ?",
    [month, s.id, from],
  );
  refresh();
}

// ---------- Savings goals (Pillar 3) ----------

export async function addGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(3);
  const name = str(fd, "name", 60);
  const target = parseNaira(fd.get("target"));
  const saved = fd.get("saved") ? parseNaira(fd.get("saved")) : 0;
  const due = str(fd, "due") || null;
  const platform = SAVINGS_PLATFORMS.includes(str(fd, "platform")) ? str(fd, "platform") : "Other";
  if (!name) return { error: "Give your goal a name" };
  if (!(target > 0)) return { error: "Enter a target amount" };
  if (!(saved >= 0)) return { error: "Check the amount already saved" };
  await run("INSERT INTO goals (id, student_id, name, target, saved, due_on, platform, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    id(), s.id, name, target, saved, due, platform, now(),
  ]);
  refresh();
  return { ok: `“${name}” created` };
}

export async function topUpGoal(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await student(3);
  const amount = parseNaira(fd.get("amount"));
  if (!amount || Number.isNaN(amount)) return { error: "Enter an amount" };
  await run("UPDATE goals SET saved = MAX(0, saved + ?) WHERE id = ? AND student_id = ?", [amount, str(fd, "id"), s.id]);
  refresh();
  return { ok: amount > 0 ? "Nice! Progress saved 🎉" : "Withdrawal recorded" };
}

export async function deleteGoal(fd: FormData) {
  const s = await student(3);
  await run("DELETE FROM goals WHERE id = ? AND student_id = ?", [str(fd, "id"), s.id]);
  refresh();
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
  await run("INSERT INTO holdings VALUES (?, ?, ?, ?, ?, ?, ?)", [id(), s.id, name, kind, invested, current, now()]);
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
