"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { batch, id, now, one, run } from "@/lib/db";
import {
  METHODS,
  ensureCategories,
  getCategories,
  recalcGoal,
  type Bucket,
  type Category,
  type Deposit,
  type Expense,
  type Goal,
  type Income,
  type Recurring,
} from "@/lib/finance";
import { fiftyThirtyTwenty, isMonth, parseNaira, shiftMonth, today } from "@/lib/money";
import type { Pillar } from "@/lib/packages";
import { hasPillar } from "@/lib/students";

export type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
const fail = (error: string): Result<never> => ({ ok: false, error });

async function me(pillar: Pillar) {
  const s = await requireStudent();
  if (!hasPillar(s, pillar)) throw new Error("Your package doesn’t include this tool yet.");
  return s;
}

function money(v: unknown): number {
  return typeof v === "number" ? Math.round(v) : parseNaira(String(v ?? ""));
}

function clean(v: unknown, max = 120): string {
  return String(v ?? "").trim().slice(0, max);
}

const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d).getTime());
const BUCKET_IDS: Bucket[] = ["needs", "wants", "savings"];

function touch() {
  revalidatePath("/app", "layout");
}

async function validCategory(studentId: string, key: string): Promise<boolean> {
  await ensureCategories(studentId);
  return Boolean(await one("SELECT 1 FROM categories WHERE student_id = ? AND key = ?", [studentId, key]));
}

// ===========================================================================
// Categories
// ===========================================================================

export async function createCategory(input: { name: string; emoji?: string; bucket: Bucket }): Promise<Result<Category>> {
  const s = await me(2);
  const name = clean(input.name, 40);
  if (!name) return fail("Name the category");
  const bucket = BUCKET_IDS.includes(input.bucket) ? input.bucket : "wants";
  const key = `c_${id().slice(0, 8)}`;
  await ensureCategories(s.id);
  await run(
    "INSERT INTO categories (student_id, key, name, emoji, bucket, sort) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort),0)+1 FROM categories WHERE student_id = ?))",
    [s.id, key, name, clean(input.emoji, 8) || "🏷️", bucket, s.id],
  );
  touch();
  const row = await one<Category>("SELECT key, name, emoji, bucket, sort, archived FROM categories WHERE student_id = ? AND key = ?", [s.id, key]);
  return ok(row!);
}

export async function updateCategory(key: string, patch: Partial<Pick<Category, "name" | "emoji" | "bucket">>): Promise<Result<null>> {
  const s = await me(2);
  if (patch.name !== undefined) {
    const name = clean(patch.name, 40);
    if (!name) return fail("Name can’t be empty");
    await run("UPDATE categories SET name = ? WHERE student_id = ? AND key = ?", [name, s.id, key]);
  }
  if (patch.emoji !== undefined) await run("UPDATE categories SET emoji = ? WHERE student_id = ? AND key = ?", [clean(patch.emoji, 8) || "🏷️", s.id, key]);
  if (patch.bucket !== undefined && BUCKET_IDS.includes(patch.bucket)) await run("UPDATE categories SET bucket = ? WHERE student_id = ? AND key = ?", [patch.bucket, s.id, key]);
  touch();
  return ok(null);
}

/** Archive hides a category from budgets and pickers but keeps its history. */
export async function archiveCategory(key: string, archived: boolean): Promise<Result<null>> {
  const s = await me(2);
  await run("UPDATE categories SET archived = ? WHERE student_id = ? AND key = ?", [archived ? 1 : 0, s.id, key]);
  touch();
  return ok(null);
}

// ===========================================================================
// Budget: planned amounts, incomes, notes, templates
// ===========================================================================

export async function setPlanned(month: string, key: string, raw: string): Promise<Result<number | null>> {
  const s = await me(2);
  if (!isMonth(month)) return fail("Invalid month");
  if (!(await validCategory(s.id, key))) return fail("Unknown category");
  if (String(raw).trim() === "") {
    await run("DELETE FROM budgets WHERE student_id = ? AND month = ? AND category = ?", [s.id, month, key]);
    touch();
    return ok(null);
  }
  const v = money(raw);
  if (!(v >= 0)) return fail("Enter an amount like 45,000 or 45k");
  await run("INSERT OR REPLACE INTO budgets (student_id, month, category, amount) VALUES (?, ?, ?, ?)", [s.id, month, key, v]);
  touch();
  return ok(v);
}

export async function applyBudgetTemplate(month: string, template: "503020" | "copy" | "clear"): Promise<Result<Record<string, number>>> {
  const s = await me(2);
  if (!isMonth(month)) return fail("Invalid month");
  const cats = await getCategories(s.id);

  if (template === "clear") {
    await run("DELETE FROM budgets WHERE student_id = ? AND month = ?", [s.id, month]);
    touch();
    return ok({});
  }

  let plan: Record<string, number> = {};
  if (template === "copy") {
    const prev = await import("@/lib/finance").then((f) => f.getPlanned(s.id, shiftMonth(month, -1)));
    if (!Object.keys(prev).length) return fail("Last month has no budget to copy");
    plan = prev;
  } else {
    const inc = await one<{ v: number; n: number }>("SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM incomes WHERE student_id = ? AND month = ?", [s.id, month]);
    const income = Number(inc?.n ?? 0) ? Number(inc?.v ?? 0) : Number(s.monthly_income ?? 0);
    if (!income) return fail("Add your income first, then we can split it 50/30/20");
    // Default-category weights from the 50/30/20 helper; custom categories share their bucket's remainder evenly.
    const base = fiftyThirtyTwenty(income);
    const share: Record<Bucket, number> = { needs: income * 0.5, wants: income * 0.3, savings: income * 0.2 };
    for (const b of BUCKET_IDS) {
      const inBucket = cats.filter((c) => c.bucket === b);
      const known = inBucket.filter((c) => base[c.key] !== undefined);
      const knownTotal = known.reduce((a, c) => a + base[c.key], 0);
      const custom = inBucket.filter((c) => base[c.key] === undefined);
      const scale = knownTotal > 0 ? (custom.length ? 0.85 : 1) * (share[b] / knownTotal) : 0;
      for (const c of known) plan[c.key] = Math.round((base[c.key] * scale) / 500) * 500;
      const left = share[b] - known.reduce((a, c) => a + plan[c.key], 0);
      for (const c of custom) plan[c.key] = Math.max(0, Math.round(left / custom.length / 500) * 500);
    }
  }
  const valid = new Set(cats.map((c) => c.key));
  await batch([
    { sql: "DELETE FROM budgets WHERE student_id = ? AND month = ?", args: [s.id, month] },
    ...Object.entries(plan)
      .filter(([k]) => valid.has(k))
      .map(([k, v]) => ({ sql: "INSERT INTO budgets (student_id, month, category, amount) VALUES (?, ?, ?, ?)", args: [s.id, month, k, v] })),
  ]);
  touch();
  return ok(Object.fromEntries(Object.entries(plan).filter(([k]) => valid.has(k))));
}

export async function addIncome(month: string, source: string, raw: string): Promise<Result<Income>> {
  const s = await me(2);
  if (!isMonth(month)) return fail("Invalid month");
  const src = clean(source, 60) || "Income";
  const amount = money(raw);
  if (!(amount > 0)) return fail("Enter an amount like 350,000 or 350k");
  const iid = id();
  await run(
    "INSERT INTO incomes (id, student_id, month, source, amount, received, sort) VALUES (?, ?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort),0)+1 FROM incomes WHERE student_id = ? AND month = ?))",
    [iid, s.id, month, src, amount, s.id, month],
  );
  // Keep the profile's "typical income" in sync with the current month for 50/30/20 and the coach view.
  touch();
  return ok((await one<Income>("SELECT id, month, source, amount, received, sort FROM incomes WHERE id = ?", [iid]))!);
}

export async function updateIncome(incomeId: string, patch: { source?: string; amount?: string; received?: boolean }): Promise<Result<Income>> {
  const s = await me(2);
  if (patch.source !== undefined) {
    const src = clean(patch.source, 60);
    if (!src) return fail("Name the income source");
    await run("UPDATE incomes SET source = ? WHERE id = ? AND student_id = ?", [src, incomeId, s.id]);
  }
  if (patch.amount !== undefined) {
    const v = money(patch.amount);
    if (!(v >= 0)) return fail("Enter an amount like 350k");
    await run("UPDATE incomes SET amount = ? WHERE id = ? AND student_id = ?", [v, incomeId, s.id]);
  }
  if (patch.received !== undefined) await run("UPDATE incomes SET received = ? WHERE id = ? AND student_id = ?", [patch.received ? 1 : 0, incomeId, s.id]);
  const row = await one<Income>("SELECT id, month, source, amount, received, sort FROM incomes WHERE id = ? AND student_id = ?", [incomeId, s.id]);
  if (!row) return fail("Income not found");
  touch();
  return ok(row);
}

export async function deleteIncome(incomeId: string): Promise<Result<null>> {
  const s = await me(2);
  await run("DELETE FROM incomes WHERE id = ? AND student_id = ?", [incomeId, s.id]);
  touch();
  return ok(null);
}

export async function saveMonthNotes(month: string, notes: string): Promise<Result<null>> {
  const s = await me(2);
  if (!isMonth(month)) return fail("Invalid month");
  await run(
    "INSERT INTO month_meta (student_id, month, notes, initialized) VALUES (?, ?, ?, 0) ON CONFLICT(student_id, month) DO UPDATE SET notes = excluded.notes",
    [s.id, month, String(notes ?? "").slice(0, 5000)],
  );
  return ok(null);
}

// ===========================================================================
// Expenses
// ===========================================================================

const EXPENSE_COLS = "id, spent_on, amount, category, note, method, recurring_id, created_at";

export async function createExpense(input: { date: string; note: string; category: string; amount: string; method: string }): Promise<Result<Expense>> {
  const s = await me(2);
  const amount = money(input.amount);
  const date = clean(input.date, 10) || today();
  if (!(amount > 0)) return fail("Enter an amount, e.g. 4,500 or 4.5k");
  if (!isDate(date)) return fail("Pick a valid date");
  if (date > today()) return fail("That date is in the future");
  if (!(await validCategory(s.id, input.category))) return fail("Pick a category");
  const method = METHODS.some((m) => m.id === input.method) ? input.method : "transfer";
  const eid = id();
  await run("INSERT INTO expenses (id, student_id, spent_on, amount, category, note, method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    eid, s.id, date, amount, input.category, clean(input.note), method, now(),
  ]);
  touch();
  return ok((await one<Expense>(`SELECT ${EXPENSE_COLS} FROM expenses WHERE id = ?`, [eid]))!);
}

export async function updateExpense(expenseId: string, field: "spent_on" | "amount" | "category" | "note" | "method", value: string): Promise<Result<Expense>> {
  const s = await me(2);
  let v: string | number;
  switch (field) {
    case "amount":
      v = money(value);
      if (!(v > 0)) return fail("Enter an amount, e.g. 4,500 or 4.5k");
      break;
    case "spent_on":
      if (!isDate(value)) return fail("Pick a valid date");
      if (value > today()) return fail("That date is in the future");
      v = value;
      break;
    case "category":
      if (!(await validCategory(s.id, value))) return fail("Pick a category");
      v = value;
      break;
    case "method":
      if (!METHODS.some((m) => m.id === value)) return fail("Pick a payment method");
      v = value;
      break;
    case "note":
      v = clean(value);
      break;
    default:
      return fail("Unknown field");
  }
  await run(`UPDATE expenses SET ${field} = ? WHERE id = ? AND student_id = ?`, [v, expenseId, s.id]);
  const row = await one<Expense>(`SELECT ${EXPENSE_COLS} FROM expenses WHERE id = ? AND student_id = ?`, [expenseId, s.id]);
  if (!row) return fail("Expense not found");
  touch();
  return ok(row);
}

export async function deleteExpenses(ids: string[]): Promise<Result<null>> {
  const s = await me(2);
  const list = ids.slice(0, 500);
  if (!list.length) return ok(null);
  await batch(list.map((eid) => ({ sql: "DELETE FROM expenses WHERE id = ? AND student_id = ?", args: [eid, s.id] })));
  touch();
  return ok(null);
}

export async function duplicateExpense(expenseId: string): Promise<Result<Expense>> {
  const s = await me(2);
  const src = await one<Expense>(`SELECT ${EXPENSE_COLS} FROM expenses WHERE id = ? AND student_id = ?`, [expenseId, s.id]);
  if (!src) return fail("Expense not found");
  const eid = id();
  await run("INSERT INTO expenses (id, student_id, spent_on, amount, category, note, method, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    eid, s.id, today(), src.amount, src.category, src.note, src.method, now(),
  ]);
  touch();
  return ok((await one<Expense>(`SELECT ${EXPENSE_COLS} FROM expenses WHERE id = ?`, [eid]))!);
}

// ===========================================================================
// Recurring bills
// ===========================================================================

export async function createRecurring(input: { name: string; amount: string; category: string; method: string; day: number }): Promise<Result<Recurring>> {
  const s = await me(2);
  const name = clean(input.name, 60);
  const amount = money(input.amount);
  const day = Math.max(1, Math.min(31, Math.round(Number(input.day) || 1)));
  if (!name) return fail("Name the bill, e.g. Rent or DStv");
  if (!(amount > 0)) return fail("Enter the amount");
  if (!(await validCategory(s.id, input.category))) return fail("Pick a category");
  const method = METHODS.some((m) => m.id === input.method) ? input.method : "transfer";
  const rid = id();
  // If today is already past the bill day, mark this month as done so we don't back-post a surprise expense.
  const thisMonth = today().slice(0, 7);
  const past = Number(today().slice(8, 10)) >= day;
  await run("INSERT INTO recurring (id, student_id, name, amount, category, method, day, active, last_month, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)", [
    rid, s.id, name, amount, input.category, method, day, past ? thisMonth : null, now(),
  ]);
  touch();
  return ok((await one<Recurring>("SELECT id, name, amount, category, method, day, active, last_month FROM recurring WHERE id = ?", [rid]))!);
}

export async function toggleRecurring(rid: string, active: boolean): Promise<Result<null>> {
  const s = await me(2);
  await run("UPDATE recurring SET active = ? WHERE id = ? AND student_id = ?", [active ? 1 : 0, rid, s.id]);
  touch();
  return ok(null);
}

export async function deleteRecurring(rid: string): Promise<Result<null>> {
  const s = await me(2);
  await run("DELETE FROM recurring WHERE id = ? AND student_id = ?", [rid, s.id]);
  touch();
  return ok(null);
}

// ===========================================================================
// Savings goals & deposits
// ===========================================================================

const GOAL_COLS = "id, name, emoji, target, saved, due_on, platform, created_at, achieved_at";

export async function createGoal(input: { name: string; emoji: string; target: string; saved: string; due: string; platform: string }): Promise<Result<Goal>> {
  const s = await me(3);
  const name = clean(input.name, 60);
  const target = money(input.target);
  const saved = String(input.saved ?? "").trim() ? money(input.saved) : 0;
  const due = clean(input.due, 10);
  if (!name) return fail("Give your goal a name");
  if (!(target > 0)) return fail("Enter a target amount");
  if (!(saved >= 0)) return fail("Check the amount already saved");
  if (due && !isDate(due)) return fail("Pick a valid target date");
  const gid = id();
  const t = now();
  await batch([
    {
      sql: "INSERT INTO goals (id, student_id, name, emoji, target, saved, due_on, platform, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
      args: [gid, s.id, name, clean(input.emoji, 8) || "🎯", target, due || null, clean(input.platform, 30) || "PiggyVest", t],
    },
    ...(saved > 0
      ? [{ sql: "INSERT INTO goal_deposits (id, goal_id, student_id, amount, deposited_on, note, created_at) VALUES (?, ?, ?, ?, ?, 'Starting balance', ?)", args: [id(), gid, s.id, saved, today(), t] }]
      : []),
  ]);
  await recalcGoal(gid);
  touch();
  return ok((await one<Goal>(`SELECT ${GOAL_COLS} FROM goals WHERE id = ?`, [gid]))!);
}

export async function updateGoal(goalId: string, patch: { name?: string; emoji?: string; target?: string; due?: string; platform?: string }): Promise<Result<Goal>> {
  const s = await me(3);
  const g = await one<Goal>(`SELECT ${GOAL_COLS} FROM goals WHERE id = ? AND student_id = ?`, [goalId, s.id]);
  if (!g) return fail("Goal not found");
  const name = patch.name !== undefined ? clean(patch.name, 60) : g.name;
  const target = patch.target !== undefined ? money(patch.target) : Number(g.target);
  const due = patch.due !== undefined ? clean(patch.due, 10) : g.due_on ?? "";
  if (!name) return fail("Name can’t be empty");
  if (!(target > 0)) return fail("Enter a target amount");
  if (due && !isDate(due)) return fail("Pick a valid date");
  await run("UPDATE goals SET name = ?, emoji = ?, target = ?, due_on = ?, platform = ? WHERE id = ?", [
    name,
    patch.emoji !== undefined ? clean(patch.emoji, 8) || "🎯" : g.emoji,
    target,
    due || null,
    patch.platform !== undefined ? clean(patch.platform, 30) || "Other" : g.platform,
    goalId,
  ]);
  await recalcGoal(goalId);
  touch();
  return ok((await one<Goal>(`SELECT ${GOAL_COLS} FROM goals WHERE id = ?`, [goalId]))!);
}

export async function deleteGoal(goalId: string): Promise<Result<null>> {
  const s = await me(3);
  await batch([
    { sql: "DELETE FROM goal_deposits WHERE goal_id = ? AND student_id = ?", args: [goalId, s.id] },
    { sql: "DELETE FROM goals WHERE id = ? AND student_id = ?", args: [goalId, s.id] },
  ]);
  touch();
  return ok(null);
}

/** Positive = deposit, negative = withdrawal. */
export async function addDeposit(goalId: string, input: { amount: string; date?: string; note?: string; withdraw?: boolean }): Promise<Result<{ goal: Goal; deposit: Deposit }>> {
  const s = await me(3);
  const g = await one<Goal>(`SELECT ${GOAL_COLS} FROM goals WHERE id = ? AND student_id = ?`, [goalId, s.id]);
  if (!g) return fail("Goal not found");
  let amount = money(String(input.amount).replace(/^-/, ""));
  if (!(amount > 0)) return fail("Enter an amount, e.g. 20k");
  const withdraw = input.withdraw || String(input.amount).trim().startsWith("-");
  if (withdraw) {
    if (amount > Number(g.saved)) return fail(`You can withdraw at most ₦${Number(g.saved).toLocaleString("en-NG")}`);
    amount = -amount;
  }
  const date = clean(input.date, 10) || today();
  if (!isDate(date) || date > today()) return fail("Pick a valid date (not in the future)");
  const did = id();
  await run("INSERT INTO goal_deposits (id, goal_id, student_id, amount, deposited_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    did, goalId, s.id, amount, date, clean(input.note, 80), now(),
  ]);
  await recalcGoal(goalId);
  touch();
  return ok({
    goal: (await one<Goal>(`SELECT ${GOAL_COLS} FROM goals WHERE id = ?`, [goalId]))!,
    deposit: (await one<Deposit>("SELECT id, goal_id, amount, deposited_on, note FROM goal_deposits WHERE id = ?", [did]))!,
  });
}

export async function deleteDeposit(depositId: string): Promise<Result<Goal>> {
  const s = await me(3);
  const d = await one<{ goal_id: string }>("SELECT goal_id FROM goal_deposits WHERE id = ? AND student_id = ?", [depositId, s.id]);
  if (!d) return fail("Entry not found");
  await run("DELETE FROM goal_deposits WHERE id = ? AND student_id = ?", [depositId, s.id]);
  await recalcGoal(d.goal_id);
  touch();
  return ok((await one<Goal>(`SELECT ${GOAL_COLS} FROM goals WHERE id = ?`, [d.goal_id]))!);
}
