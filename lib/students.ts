import { all, batch, id, now, one, run } from "./db";
import { PACKAGES, findOffer, type Package, type Pillar } from "./packages";

export interface Student {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  package_id: string;
  offer_slug: string;
  vault_url: string | null;
  booking_url: string | null;
  monthly_income: number | null;
  started_at: string;
  created_at: string;
  last_seen_at: string | null;
}

export function packageOf(s: Student): Package {
  return PACKAGES.find((p) => p.id === s.package_id) ?? PACKAGES[0];
}

export function hasPillar(s: Student, p: Pillar): boolean {
  return packageOf(s).pillars.includes(p);
}

export function firstName(s: Pick<Student, "full_name">): string {
  return s.full_name.trim().split(/\s+/)[0] ?? s.full_name;
}

/** Month N of the programme (1-based) and total months. */
export function programmeProgress(s: Student): { month: number; total: number | null } {
  const months = Math.floor((Date.now() - new Date(s.started_at).getTime()) / (30.44 * 86400_000)) + 1;
  const pkg = packageOf(s);
  const total = /6 months/.test(pkg.duration) ? 6 : pkg.route === "launchpad" ? 3 : null;
  return { month: total ? Math.min(months, total) : months, total };
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  return one<Student>("SELECT * FROM students WHERE id = ?", [studentId]);
}

export async function getStudentByEmail(email: string): Promise<Student | null> {
  return one<Student>("SELECT * FROM students WHERE email = ?", [email.toLowerCase().trim()]);
}

/**
 * Creates the student's app account on enrollment, or upgrades an existing one.
 * Upgrades keep the higher tier when someone buys a smaller add-on later.
 */
export async function upsertStudentFromEnrollment(input: {
  email: string;
  fullName: string;
  phone: string;
  offerSlug: string;
  vaultUrl?: string;
  bookingUrl?: string;
}): Promise<Student> {
  const found = findOffer(input.offerSlug);
  if (!found) throw new Error(`Unknown offer ${input.offerSlug}`);
  const email = input.email.toLowerCase().trim();
  const existing = await getStudentByEmail(email);

  if (!existing) {
    const sid = id();
    const t = now();
    await run(
      `INSERT INTO students (id, email, full_name, phone, package_id, offer_slug, vault_url, booking_url, started_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sid, email, input.fullName, input.phone, found.pkg.id, input.offerSlug, input.vaultUrl ?? null, input.bookingUrl ?? null, t, t],
    );
    return (await getStudentById(sid))!;
  }

  const current = packageOf(existing);
  const rank = (p: Package) => p.pillars.length + (p.vip ? 10 : 0);
  // LaunchPad + Wealth together = Billionaire Circle access
  const combined =
    (current.id === "wealth" && found.pkg.id === "launchpad") || (current.id === "launchpad" && found.pkg.id === "wealth")
      ? PACKAGES.find((p) => p.id === "billionaire")!
      : rank(found.pkg) >= rank(current)
        ? found.pkg
        : current;

  await run(
    `UPDATE students SET full_name = ?, phone = COALESCE(NULLIF(?, ''), phone), package_id = ?, offer_slug = ?,
       vault_url = COALESCE(?, vault_url), booking_url = COALESCE(?, booking_url),
       started_at = CASE WHEN ? THEN ? ELSE started_at END
     WHERE id = ?`,
    [
      input.fullName,
      input.phone,
      combined.id,
      combined.id === found.pkg.id ? input.offerSlug : existing.offer_slug,
      input.vaultUrl ?? null,
      input.bookingUrl ?? null,
      combined.id !== current.id ? 1 : 0,
      now(),
      existing.id,
    ],
  );
  return (await getStudentById(existing.id))!;
}

/** Records activity at most every 10 minutes (powers "inactive students" in the admin). */
export async function touchStudent(s: Student) {
  if (s.last_seen_at && Date.now() - new Date(s.last_seen_at).getTime() < 10 * 60_000) return;
  await run("UPDATE students SET last_seen_at = ? WHERE id = ?", [now(), s.id]);
}

export async function setMonthlyIncome(studentId: string, income: number) {
  await run("UPDATE students SET monthly_income = ? WHERE id = ?", [income, studentId]);
}

/** Fills a fresh account with realistic sample data, for showcasing the app. */
export async function seedSampleData(studentId: string) {
  const has = await one<{ n: number }>("SELECT COUNT(*) AS n FROM expenses WHERE student_id = ?", [studentId]);
  if (has && Number(has.n) > 0) return;
  const d = new Date();
  const month = d.toISOString().slice(0, 7);
  const day = (n: number) => `${month}-${String(Math.min(n, d.getDate())).padStart(2, "0")}`;
  const t = now();
  await setMonthlyIncome(studentId, 650000);
  const budget: [string, number][] = [
    ["housing", 150000], ["food", 90000], ["transport", 45000], ["utilities", 30000], ["family", 40000],
    ["social", 25000], ["personal", 20000], ["giving", 30000], ["savings", 130000], ["debt", 40000], ["other", 10000],
  ];
  const expenses: [number, number, string, string][] = [
    [1, 150000, "housing", "Rent contribution"], [2, 18500, "food", "Market run"], [3, 6000, "transport", "Bolt to work"],
    [4, 12000, "utilities", "MTN data bundle"], [5, 25000, "family", "Mama's upkeep"], [6, 15000, "social", "Owambe aso-ebi"],
    [7, 9500, "food", "Lunch for the week"], [8, 4500, "transport", "Fuel top-up"], [9, 30000, "giving", "Tithe"],
    [10, 7000, "personal", "Haircut"], [11, 22000, "food", "Groceries"], [12, 8000, "utilities", "DStv"],
  ];
  await batch([
    ...budget.map(([c, a]) => ({ sql: "INSERT OR REPLACE INTO budgets (student_id, month, category, amount) VALUES (?, ?, ?, ?)", args: [studentId, month, c, a] })),
    ...expenses.map(([dd, a, c, n]) => ({
      sql: "INSERT INTO expenses (id, student_id, spent_on, amount, category, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id(), studentId, day(dd), a, c, n, t],
    })),
    ...seedGoals(studentId, t),
    ...([
      ["Stanbic IBTC Money Market Fund", "money-market", 250000, 263500],
      ["FGN 364-day Treasury Bill", "treasury-bills", 300000, 318000],
      ["MTN Nigeria shares", "stocks", 120000, 131400],
      ["ARM Ethical Fund", "mutual-funds", 80000, 84200],
    ] as const).map(([n, k, inv, cur]) => ({
      sql: "INSERT INTO holdings (id, student_id, name, kind, invested, current_value, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id(), studentId, n, k, inv, cur, t],
    })),
    { sql: "INSERT INTO incomes (id, student_id, month, source, amount, received, sort) VALUES (?, ?, ?, 'Salary', 550000, 1, 0)", args: [id(), studentId, month] },
    { sql: "INSERT INTO incomes (id, student_id, month, source, amount, received, sort) VALUES (?, ?, ?, 'Side hustle (graphics)', 100000, 0, 1)", args: [id(), studentId, month] },
    { sql: "INSERT OR IGNORE INTO month_meta (student_id, month, notes, initialized) VALUES (?, ?, '', 1)", args: [studentId, month] },
    ...([
      ["DStv Compact", 12500, "utilities", 12],
      ["MTN data plan", 12000, "utilities", 4],
      ["Tithe", 30000, "giving", 9],
    ] as const).map(([n, a, c, d]) => ({
      sql: "INSERT INTO recurring (id, student_id, name, amount, category, method, day, active, last_month, created_at) VALUES (?, ?, ?, ?, ?, 'transfer', ?, 1, ?, ?)",
      args: [id(), studentId, n, a, c, d, month, t],
    })),
  ]);
}

function monthsAgo(n: number, day: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(Math.min(day, last, n === 0 ? new Date().getDate() : 31)).padStart(2, "0")}`;
}

/** Three goals with a realistic deposit history over the last few months. */
function seedGoals(studentId: string, t: string) {
  const goals: { name: string; emoji: string; target: number; platform: string; dueMonths: number; deposits: [number, number, number][] }[] = [
    { name: "Emergency fund", emoji: "🛟", target: 1200000, platform: "PiggyVest", dueMonths: 8, deposits: [[4, 1, 150000], [3, 28, 70000], [2, 28, 70000], [1, 28, 70000], [0, 2, 60000]] },
    { name: "New laptop for business", emoji: "💻", target: 650000, platform: "Cowrywise", dueMonths: 4, deposits: [[3, 5, 50000], [2, 5, 45000], [1, 5, 45000], [0, 5, 40000]] },
    { name: "December in the village", emoji: "🎄", target: 300000, platform: "PiggyVest", dueMonths: 1, deposits: [[2, 15, 30000], [1, 15, 35000], [0, 10, 30000]] },
  ];
  return goals.flatMap((g) => {
    const gid = id();
    const due = new Date();
    due.setMonth(due.getMonth() + g.dueMonths);
    const created = monthsAgo(Math.max(...g.deposits.map((d) => d[0])), 1);
    const saved = g.deposits.reduce((a, d) => a + d[2], 0);
    return [
      {
        sql: "INSERT INTO goals (id, student_id, name, emoji, target, saved, due_on, platform, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [gid, studentId, g.name, g.emoji, g.target, saved, due.toISOString().slice(0, 10), g.platform, `${created}T09:00:00.000Z`],
      },
      ...g.deposits.map(([ago, day, amt], i) => ({
        sql: "INSERT INTO goal_deposits (id, goal_id, student_id, amount, deposited_on, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [id(), gid, studentId, amt, monthsAgo(ago, day), i === 0 && ago >= 3 ? "Salary day" : "", t],
      })),
    ];
  });
}

export async function countRows(table: "expenses" | "goals" | "holdings" | "budgets", studentId: string): Promise<number> {
  const r = await all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE student_id = ?`, [studentId]);
  return Number(r[0]?.n ?? 0);
}
