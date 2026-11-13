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
    ...budget.map(([c, a]) => ({ sql: "INSERT OR REPLACE INTO budgets VALUES (?, ?, ?, ?)", args: [studentId, month, c, a] })),
    ...expenses.map(([dd, a, c, n]) => ({
      sql: "INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id(), studentId, day(dd), a, c, n, t],
    })),
    ...([
      ["Emergency fund (3 months)", 1200000, 420000, "PiggyVest"],
      ["New laptop for business", 650000, 180000, "Cowrywise"],
      ["December in the village", 300000, 95000, "PiggyVest"],
    ] as const).map(([n, tg, s, p]) => ({
      sql: "INSERT INTO goals (id, student_id, name, target, saved, due_on, platform, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id(), studentId, n, tg, s, null, p, t],
    })),
    ...([
      ["Stanbic IBTC Money Market Fund", "money-market", 250000, 263500],
      ["FGN 364-day Treasury Bill", "treasury-bills", 300000, 318000],
      ["MTN Nigeria shares", "stocks", 120000, 131400],
      ["ARM Ethical Fund", "mutual-funds", 80000, 84200],
    ] as const).map(([n, k, inv, cur]) => ({
      sql: "INSERT INTO holdings VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [id(), studentId, n, k, inv, cur, t],
    })),
  ]);
}

export async function countRows(table: "expenses" | "goals" | "holdings" | "budgets", studentId: string): Promise<number> {
  const r = await all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE student_id = ?`, [studentId]);
  return Number(r[0]?.n ?? 0);
}
