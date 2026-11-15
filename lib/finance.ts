/**
 * Finance data layer: categories, monthly budgets & incomes, expenses (with recurring bills),
 * and savings goals backed by a deposit ledger. All amounts are whole naira.
 */
import { all, batch, id, now, one, run } from "./db";
import { CATEGORIES, currentMonth, shiftMonth, today, type Bucket } from "./money";

export type { Bucket };

export interface Category {
  key: string;
  name: string;
  emoji: string;
  bucket: Bucket;
  sort: number;
  archived: number;
}

export interface Expense {
  id: string;
  spent_on: string;
  amount: number;
  category: string;
  note: string;
  method: string;
  recurring_id: string | null;
  created_at: string;
}

export interface Income {
  id: string;
  month: string;
  source: string;
  amount: number;
  received: number;
  sort: number;
}

export interface Recurring {
  id: string;
  name: string;
  amount: number;
  category: string;
  method: string;
  day: number;
  active: number;
  last_month: string | null;
}

export interface Goal {
  id: string;
  name: string;
  emoji: string;
  target: number;
  saved: number;
  due_on: string | null;
  platform: string;
  created_at: string;
  achieved_at: string | null;
}

export interface Deposit {
  id: string;
  goal_id: string;
  amount: number;
  deposited_on: string;
  note: string;
}

export const METHODS: { id: string; label: string }[] = [
  { id: "transfer", label: "Transfer" },
  { id: "card", label: "Card" },
  { id: "cash", label: "Cash" },
  { id: "pos", label: "POS" },
  { id: "ussd", label: "USSD" },
  { id: "wallet", label: "Wallet / app" },
];

export const BUCKETS: { id: Bucket; label: string; guide: number; hint: string }[] = [
  { id: "needs", label: "Needs", guide: 50, hint: "Bills you must pay to live and work" },
  { id: "wants", label: "Wants", guide: 30, hint: "Lifestyle, fun and nice-to-haves" },
  { id: "savings", label: "Savings & debt", guide: 20, hint: "Future you: saving, investing, clearing debt" },
];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function ensureCategories(studentId: string): Promise<void> {
  const has = await one<{ n: number }>("SELECT COUNT(*) n FROM categories WHERE student_id = ?", [studentId]);
  if (Number(has?.n ?? 0) > 0) return;
  await batch(
    CATEGORIES.map((c, i) => ({
      sql: "INSERT OR IGNORE INTO categories (student_id, key, name, emoji, bucket, sort) VALUES (?, ?, ?, ?, ?, ?)",
      args: [studentId, c.id, c.label, c.emoji, c.bucket, i],
    })),
  );
}

export async function getCategories(studentId: string, opts: { includeArchived?: boolean } = {}): Promise<Category[]> {
  await ensureCategories(studentId);
  return all<Category>(
    `SELECT key, name, emoji, bucket, sort, archived FROM categories WHERE student_id = ? ${opts.includeArchived ? "" : "AND archived = 0"} ORDER BY sort, rowid`,
    [studentId],
  );
}

/** Lookup that tolerates unknown/deleted keys. */
export function categoryLookup(cats: Category[]) {
  const map = new Map(cats.map((c) => [c.key, c]));
  return (key: string): Category => map.get(key) ?? { key, name: "Uncategorised", emoji: "🧾", bucket: "wants", sort: 999, archived: 0 };
}

// ---------------------------------------------------------------------------
// Month setup: incomes + budget + notes
// ---------------------------------------------------------------------------

/**
 * The first time a student opens the current (or a future) month, carry over last month's
 * income lines and planned amounts — like duplicating a Notion monthly template.
 */
export async function ensureMonth(studentId: string, month: string, fallbackIncome: number | null): Promise<void> {
  if (month < currentMonth()) return;
  const meta = await one<{ initialized: number }>("SELECT initialized FROM month_meta WHERE student_id = ? AND month = ?", [studentId, month]);
  if (meta && Number(meta.initialized)) return;

  const [incomes, budgets] = await Promise.all([
    one<{ n: number }>("SELECT COUNT(*) n FROM incomes WHERE student_id = ? AND month = ?", [studentId, month]),
    one<{ n: number }>("SELECT COUNT(*) n FROM budgets WHERE student_id = ? AND month = ?", [studentId, month]),
  ]);
  const prev = shiftMonth(month, -1);
  const stmts: { sql: string; args: (string | number | null)[] }[] = [];

  if (!Number(incomes?.n ?? 0)) {
    const prevIncomes = await all<Income>("SELECT * FROM incomes WHERE student_id = ? AND month = ? ORDER BY sort", [studentId, prev]);
    if (prevIncomes.length) {
      prevIncomes.forEach((i) =>
        stmts.push({ sql: "INSERT INTO incomes (id, student_id, month, source, amount, received, sort) VALUES (?, ?, ?, ?, ?, 0, ?)", args: [id(), studentId, month, i.source, i.amount, i.sort] }),
      );
    } else if (fallbackIncome) {
      stmts.push({ sql: "INSERT INTO incomes (id, student_id, month, source, amount, received, sort) VALUES (?, ?, ?, 'Salary', ?, 0, 0)", args: [id(), studentId, month, fallbackIncome] });
    }
  }
  if (!Number(budgets?.n ?? 0)) {
    stmts.push({
      sql: "INSERT OR IGNORE INTO budgets (student_id, month, category, amount) SELECT student_id, ?, category, amount FROM budgets WHERE student_id = ? AND month = ?",
      args: [month, studentId, prev],
    });
  }
  stmts.push({
    sql: "INSERT INTO month_meta (student_id, month, initialized) VALUES (?, ?, 1) ON CONFLICT(student_id, month) DO UPDATE SET initialized = 1",
    args: [studentId, month],
  });
  await batch(stmts);
}

export async function getMonthNotes(studentId: string, month: string): Promise<string> {
  const r = await one<{ notes: string }>("SELECT notes FROM month_meta WHERE student_id = ? AND month = ?", [studentId, month]);
  return r?.notes ?? "";
}

export async function getIncomes(studentId: string, month: string): Promise<Income[]> {
  return all<Income>("SELECT id, month, source, amount, received, sort FROM incomes WHERE student_id = ? AND month = ? ORDER BY sort, rowid", [studentId, month]);
}

export async function monthIncomeTotal(studentId: string, month: string, fallback: number | null): Promise<number> {
  const r = await one<{ v: number; n: number }>("SELECT COALESCE(SUM(amount),0) v, COUNT(*) n FROM incomes WHERE student_id = ? AND month = ?", [studentId, month]);
  return Number(r?.n ?? 0) ? Number(r?.v ?? 0) : Number(fallback ?? 0);
}

export async function getPlanned(studentId: string, month: string): Promise<Record<string, number>> {
  const rows = await all<{ category: string; amount: number }>("SELECT category, amount FROM budgets WHERE student_id = ? AND month = ?", [studentId, month]);
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.amount)]));
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function getExpenses(studentId: string, month: string): Promise<Expense[]> {
  return all<Expense>(
    "SELECT id, spent_on, amount, category, note, method, recurring_id, created_at FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ? ORDER BY spent_on DESC, created_at DESC",
    [studentId, month],
  );
}

export async function spentByCategory(studentId: string, month: string): Promise<Record<string, number>> {
  const rows = await all<{ category: string; v: number }>(
    "SELECT category, SUM(amount) v FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) = ? GROUP BY category",
    [studentId, month],
  );
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.v)]));
}

/** Total spent per month for the last `n` months (oldest first). */
export async function spendingTrend(studentId: string, endMonth: string, n = 6): Promise<{ month: string; total: number }[]> {
  const start = shiftMonth(endMonth, -(n - 1));
  const rows = await all<{ m: string; v: number }>(
    "SELECT substr(spent_on,1,7) m, SUM(amount) v FROM expenses WHERE student_id = ? AND substr(spent_on,1,7) BETWEEN ? AND ? GROUP BY m",
    [studentId, start, endMonth],
  );
  return Array.from({ length: n }, (_, i) => {
    const m = shiftMonth(start, i);
    return { month: m, total: Number(rows.find((r) => r.m === m)?.v ?? 0) };
  });
}

// ---------------------------------------------------------------------------
// Recurring bills
// ---------------------------------------------------------------------------

export async function getRecurring(studentId: string): Promise<Recurring[]> {
  return all<Recurring>("SELECT id, name, amount, category, method, day, active, last_month FROM recurring WHERE student_id = ? ORDER BY day, name", [studentId]);
}

/** Posts this month's recurring bills whose day has arrived (idempotent per rule per month). */
export async function postDueRecurring(studentId: string): Promise<number> {
  const month = currentMonth();
  const day = Number(today().slice(8, 10));
  const due = await all<Recurring>(
    "SELECT * FROM recurring WHERE student_id = ? AND active = 1 AND day <= ? AND (last_month IS NULL OR last_month < ?)",
    [studentId, day, month],
  );
  if (!due.length) return 0;
  const t = now();
  const stmts = due.flatMap((r) => {
    const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const date = `${month}-${String(Math.min(r.day, lastDay)).padStart(2, "0")}`;
    return [
      {
        sql: "INSERT INTO expenses (id, student_id, spent_on, amount, category, note, method, recurring_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [id(), studentId, date, r.amount, r.category, r.name, r.method, r.id, t],
      },
      { sql: "UPDATE recurring SET last_month = ? WHERE id = ? AND (last_month IS NULL OR last_month < ?)", args: [month, r.id, month] },
    ];
  });
  await batch(stmts);
  return due.length;
}

// ---------------------------------------------------------------------------
// Savings goals + deposit ledger
// ---------------------------------------------------------------------------

/** Goals created before the ledger existed get their saved balance as an opening deposit. */
export async function ensureOpeningDeposits(studentId: string): Promise<void> {
  const orphans = await all<{ id: string; saved: number; created_at: string }>(
    `SELECT g.id, g.saved, g.created_at FROM goals g
     WHERE g.student_id = ? AND g.saved > 0 AND NOT EXISTS (SELECT 1 FROM goal_deposits d WHERE d.goal_id = g.id)`,
    [studentId],
  );
  if (!orphans.length) return;
  const t = now();
  await batch(
    orphans.map((g) => ({
      sql: "INSERT INTO goal_deposits (id, goal_id, student_id, amount, deposited_on, note, created_at) VALUES (?, ?, ?, ?, ?, 'Starting balance', ?)",
      args: [id(), g.id, studentId, g.saved, g.created_at.slice(0, 10), t],
    })),
  );
}

/** Recomputes the cached `saved` total and achievement date from the ledger. */
export async function recalcGoal(goalId: string): Promise<void> {
  await run(
    `UPDATE goals SET saved = (SELECT COALESCE(SUM(amount),0) FROM goal_deposits WHERE goal_id = goals.id),
       achieved_at = CASE
         WHEN (SELECT COALESCE(SUM(amount),0) FROM goal_deposits WHERE goal_id = goals.id) >= target THEN COALESCE(achieved_at, ?)
         ELSE NULL END
     WHERE id = ?`,
    [now(), goalId],
  );
}

export async function getGoals(studentId: string): Promise<Goal[]> {
  await ensureOpeningDeposits(studentId);
  return all<Goal>(
    "SELECT id, name, emoji, target, saved, due_on, platform, created_at, achieved_at FROM goals WHERE student_id = ? ORDER BY achieved_at IS NOT NULL, created_at",
    [studentId],
  );
}

export async function getDeposits(goalId: string): Promise<Deposit[]> {
  return all<Deposit>("SELECT id, goal_id, amount, deposited_on, note FROM goal_deposits WHERE goal_id = ? ORDER BY deposited_on DESC, created_at DESC", [goalId]);
}

/** Net deposits per month across all goals for the last n months (oldest first). */
export async function savingsTrend(studentId: string, endMonth: string, n = 6): Promise<{ month: string; total: number }[]> {
  const start = shiftMonth(endMonth, -(n - 1));
  const rows = await all<{ m: string; v: number }>(
    `SELECT substr(deposited_on,1,7) m, SUM(amount) v FROM goal_deposits
     WHERE student_id = ? AND substr(deposited_on,1,7) BETWEEN ? AND ? AND note != 'Starting balance' GROUP BY m`,
    [studentId, start, endMonth],
  );
  return Array.from({ length: n }, (_, i) => {
    const m = shiftMonth(start, i);
    return { month: m, total: Number(rows.find((r) => r.m === m)?.v ?? 0) };
  });
}

/** Consecutive months (ending this month or last month) with a positive net deposit. */
export function savingsStreak(trend: { month: string; total: number }[]): number {
  let streak = 0;
  for (let i = trend.length - 1; i >= 0; i--) {
    if (trend[i].total > 0) streak++;
    else if (i === trend.length - 1) continue; // this month not saved yet doesn't break the streak
    else break;
  }
  return streak;
}

export { goalPlan } from "./goal-math";
