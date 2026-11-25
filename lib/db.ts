import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

/**
 * Database: SQLite file locally, Turso (hosted libSQL) in production.
 *   local:      DATABASE_URL unset  -> file:./data/tmc.db
 *   production: DATABASE_URL=libsql://your-db.turso.io  DATABASE_AUTH_TOKEN=...
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  package_id TEXT NOT NULL,
  offer_slug TEXT NOT NULL,
  vault_url TEXT,
  booking_url TEXT,
  monthly_income INTEGER,
  started_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enrollments (
  reference TEXT PRIMARY KEY,
  student_id TEXT,
  email TEXT NOT NULL,
  offer_slug TEXT NOT NULL,
  amount_naira INTEGER NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  vault_url TEXT,
  booking_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS budgets (
  student_id TEXT NOT NULL,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  PRIMARY KEY (student_id, month, category)
);
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  spent_on TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS expenses_student_date ON expenses (student_id, spent_on);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target INTEGER NOT NULL,
  saved INTEGER NOT NULL DEFAULT 0,
  due_on TEXT,
  platform TEXT NOT NULL DEFAULT 'PiggyVest',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS holdings (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  invested INTEGER NOT NULL,
  current_value INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  title TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  done_at TEXT
);
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '📘',
  tag TEXT NOT NULL DEFAULT '',
  pillar INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  body TEXT NOT NULL DEFAULT '',
  minutes INTEGER NOT NULL DEFAULT 5,
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  UNIQUE (course_id, slug)
);
CREATE TABLE IF NOT EXISTS lesson_progress (
  student_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  PRIMARY KEY (student_id, lesson_id)
);
CREATE TABLE IF NOT EXISTS coach_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  student_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🧾',
  bucket TEXT NOT NULL DEFAULT 'wants',
  sort INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, key)
);
CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  month TEXT NOT NULL,
  source TEXT NOT NULL,
  amount INTEGER NOT NULL,
  received INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS incomes_student_month ON incomes (student_id, month);
CREATE TABLE IF NOT EXISTS month_meta (
  student_id TEXT NOT NULL,
  month TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  initialized INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, month)
);
CREATE TABLE IF NOT EXISTS recurring (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  category TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'transfer',
  day INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  last_month TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goal_deposits (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  deposited_on TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS deposits_goal ON goal_deposits (goal_id, deposited_on);
CREATE TABLE IF NOT EXISTS financial_plans (
  student_id TEXT PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  client_signature TEXT,
  submitted_at TEXT,
  coach_signed_at TEXT,
  coach_note TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lp_projects (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  revenue_target INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS lp_tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not-started',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_on TEXT,
  end_on TEXT,
  description TEXT NOT NULL DEFAULT '',
  deliverable TEXT NOT NULL DEFAULT '',
  pct INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  est_hours REAL NOT NULL DEFAULT 0,
  actual_hours REAL NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS lp_tasks_project ON lp_tasks (project_id, sort);
CREATE TABLE IF NOT EXISTS lp_sales (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  sold_on TEXT NOT NULL,
  client TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
`;

/** Additive changes for databases created by earlier versions. Each runs once; "duplicate column" errors are ignored. */
const MIGRATIONS = [
  "ALTER TABLE students ADD COLUMN last_seen_at TEXT",
  "ALTER TABLE enrollments ADD COLUMN full_name TEXT",
  "ALTER TABLE enrollments ADD COLUMN phone TEXT",
  "ALTER TABLE expenses ADD COLUMN method TEXT NOT NULL DEFAULT 'transfer'",
  "ALTER TABLE expenses ADD COLUMN recurring_id TEXT",
  "ALTER TABLE goals ADD COLUMN emoji TEXT NOT NULL DEFAULT '🎯'",
  "ALTER TABLE goals ADD COLUMN achieved_at TEXT",
  "ALTER TABLE students ADD COLUMN welcome_seen_at TEXT",
  "ALTER TABLE students ADD COLUMN vault_opened_at TEXT",
  "ALTER TABLE students ADD COLUMN session_booked_at TEXT",
  "ALTER TABLE month_meta ADD COLUMN start_balance INTEGER",
];

const g = globalThis as unknown as { __tmcDb?: Client; __tmcDbReady?: Promise<void> };

function client(): Client {
  if (!g.__tmcDb) {
    let url = process.env.DATABASE_URL?.trim();
    if (!url) {
      const dir = path.join(process.cwd(), "data");
      fs.mkdirSync(dir, { recursive: true });
      url = `file:${path.join(dir, "tmc.db")}`;
    }
    g.__tmcDb = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN?.trim() || undefined });
  }
  return g.__tmcDb;
}

async function ready(): Promise<Client> {
  const c = client();
  g.__tmcDbReady ??= c.executeMultiple(SCHEMA).then(async () => {
    for (const m of MIGRATIONS) await c.execute(m).catch(() => undefined);
  });
  await g.__tmcDbReady;
  return c;
}

export async function all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const res = await (await ready()).execute({ sql, args });
  return res.rows.map((r) => ({ ...r }) as unknown as T);
}

export async function one<T>(sql: string, args: InValue[] = []): Promise<T | null> {
  return (await all<T>(sql, args))[0] ?? null;
}

export async function run(sql: string, args: InValue[] = []): Promise<number> {
  const res = await (await ready()).execute({ sql, args });
  return res.rowsAffected;
}

export async function batch(stmts: { sql: string; args: InValue[] }[]): Promise<void> {
  await (await ready()).batch(stmts, "write");
}

export function id(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
