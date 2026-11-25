import { one, run, now } from "./db";
import { env } from "./env";
import { lagosNow } from "./money";
import { packageOf, hasPillar, type Student } from "./students";

export interface KitStep {
  key: "vault" | "plan" | "book" | "community";
  title: string;
  body: string;
  href: string;
  external?: boolean;
  done: boolean;
  locked?: string;
  progress?: number;
}

/** "December" when it's November in Lagos: the month the next session budgets for. */
export function nextMonthName(): string {
  const d = lagosNow();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).toLocaleDateString("en-NG", { month: "long" });
}

/** What the next coaching session covers, per package. */
export function sessionAgenda(s: Pick<Student, "package_id">): string[] {
  const st = s as Student;
  const items: string[] = [];
  if (hasPillar(st, 2)) items.push("Review your financial plan", `Work on your budget for ${nextMonthName()}`);
  if (hasPillar(st, 4)) items.push("Break down your LaunchPad sales project");
  if (!items.length) items.push("Get settled into the Academy and set your learning goals");
  return items;
}

/** Calendly (or any) booking link for this student, with name/email pre-filled. */
export function bookingUrl(s: Student): string | null {
  const pkg = packageOf(s);
  const base = s.booking_url || (pkg.automation.bookingEnv ? env.get(pkg.automation.bookingEnv) : undefined);
  if (!base) return null;
  try {
    const u = new URL(base);
    if (u.hostname.includes("calendly.com")) {
      u.searchParams.set("name", s.full_name);
      u.searchParams.set("email", s.email);
    }
    return u.toString();
  } catch {
    return base;
  }
}

export async function getKit(s: Student): Promise<{ steps: KitStep[]; done: number; total: number; planRequired: boolean; planSubmitted: boolean }> {
  const planRequired = hasPillar(s, 2);
  const plan = planRequired ? await one<{ status: string; data: string }>("SELECT status, data FROM financial_plans WHERE student_id = ?", [s.id]) : null;
  const planSubmitted = Boolean(plan && plan.status !== "draft");
  let planPct = 0;
  if (plan) {
    try {
      const { completion, normalisePlan } = await import("./plan-model");
      planPct = completion(normalisePlan(JSON.parse(plan.data), s.started_at.slice(0, 10))).pct;
    } catch {
      planPct = 0;
    }
  }
  const pkg = packageOf(s);
  const booking = bookingUrl(s);
  const community = pkg.automation.communities.map((c) => env.get(c.urlEnv)).find(Boolean);

  const steps: KitStep[] = [
    {
      key: "vault",
      title: "Open your personal vault",
      body: "Your financial tools in one place: financial plan, money tracker, savings, portfolio" + (hasPillar(s, 4) ? " and LaunchPad project tracker." : "."),
      href: "/app/vault",
      done: Boolean(s.vault_opened_at),
    },
  ];
  if (planRequired)
    steps.push({
      key: "plan",
      title: "Fill out your financial plan",
      body: "Where you are now, where you want to be in 6 months, and your action plan. Required before your session.",
      href: "/app/plan",
      done: planSubmitted,
      progress: planPct,
    });
  if (booking)
    steps.push({
      key: "book",
      title: "Book your next session",
      body: `We’ll ${sessionAgenda(s).map((x) => x[0].toLowerCase() + x.slice(1)).join(", ")}.`,
      href: booking,
      external: true,
      done: Boolean(s.session_booked_at),
      locked: planRequired && !planSubmitted ? "Submit your financial plan first so your coach can prepare." : undefined,
    });
  if (community)
    steps.push({
      key: "community",
      title: "Join your circle",
      body: "Say hi in the community and share your #1 money goal.",
      href: community,
      external: true,
      done: false,
    });

  const required = steps.filter((x) => x.key !== "community");
  return { steps, done: required.filter((x) => x.done).length, total: required.length, planRequired, planSubmitted };
}

export async function markStudent(studentId: string, field: "welcome_seen_at" | "vault_opened_at" | "session_booked_at", value: string | null = now()) {
  await run(`UPDATE students SET ${field} = ${field === "session_booked_at" ? "?" : "COALESCE(" + field + ", ?)"} WHERE id = ?`, [value, studentId]);
}
