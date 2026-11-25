"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { all, batch, id, now, one, run } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { adminNotification } from "@/lib/emails";
import { env } from "@/lib/env";
import { recalcGoal } from "@/lib/finance";
import { currentMonth, today } from "@/lib/money";
import { getPlan, writePlanData } from "@/lib/plan";
import { analyse, completion, normalisePlan, type MoneyRow, type PlanData } from "@/lib/plan-model";
import { hasPillar } from "@/lib/students";

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };

async function me() {
  const s = await requireStudent();
  if (!hasPillar(s, 2)) throw new Error("The financial plan is part of Foundation & Wealth and the Billionaire Circle.");
  return s;
}

export async function savePlan(data: PlanData): Promise<Result<{ savedAt: string }>> {
  const s = await me();
  const json = JSON.stringify(data ?? {});
  if (json.length > 100_000) return { ok: false, error: "Your plan is too long to save. Trim some notes." };
  await writePlanData(s.id, normalisePlan(data, s.started_at.slice(0, 10)));
  return { ok: true, data: { savedAt: now() } };
}

export async function submitPlan(data: PlanData, signature: string): Promise<Result<{ submittedAt: string }>> {
  const s = await me();
  const sig = String(signature ?? "").trim().slice(0, 80);
  if (sig.length < 3) return { ok: false, error: "Type your full name to sign your plan." };
  const plan = normalisePlan(data, s.started_at.slice(0, 10));
  const c = completion(plan);
  const a = analyse(plan);
  if (a.income <= 0) return { ok: false, error: "Add your monthly income before submitting." };
  if (!plan.primaryGoal.goal.trim() || !plan.primaryGoal.target) return { ok: false, error: "Set your primary goal and its target amount." };
  if (a.allocTotal !== 100) return { ok: false, error: "Your budget split must add up to 100%." };

  await writePlanData(s.id, plan);
  const t = now();
  await run("UPDATE financial_plans SET status = CASE WHEN status = 'signed' THEN 'signed' ELSE 'submitted' END, client_signature = ?, submitted_at = ? WHERE student_id = ?", [sig, t, s.id]);

  const adminEmail = env.adminEmail();
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      ...adminNotification({
        title: `📋 Financial plan submitted: ${s.full_name}`,
        rows: [
          ["Student", `${s.full_name} <${s.email}>`],
          ["Primary goal", `${plan.primaryGoal.goal} (₦${Number(plan.primaryGoal.target).toLocaleString("en-NG")})`],
          ["Monthly income", `₦${a.income.toLocaleString("en-NG")}`],
          ["Net worth", `₦${a.netWorth.toLocaleString("en-NG")}`],
          ["Completeness", `${c.pct}%`],
        ],
        links: [{ label: "Review & countersign the plan", url: `${env.siteUrl()}/admin/students/${s.id}/plan` }],
      }),
    }).catch((e) => console.error("[plan] coach email failed", e));
  }
  revalidatePath("/app", "layout");
  return { ok: true, data: { submittedAt: t } };
}

/** Pulls numbers the student already tracks in the app into the "Where you are now" section. */
export async function importFromApp(): Promise<Result<{ income: MoneyRow[]; savings: MoneyRow[] }>> {
  const s = await me();
  const month = currentMonth();
  const [incomes, goals, holdings] = await Promise.all([
    all<{ source: string; amount: number }>("SELECT source, amount FROM incomes WHERE student_id = ? AND month = ? ORDER BY sort", [s.id, month]),
    all<{ name: string; saved: number }>("SELECT name, saved FROM goals WHERE student_id = ?", [s.id]),
    one<{ v: number }>("SELECT COALESCE(SUM(current_value),0) v FROM holdings WHERE student_id = ?", [s.id]),
  ]);
  const income: MoneyRow[] = incomes.map((i, idx) => ({
    id: `imp${idx}${Date.now().toString(36)}`,
    label: idx === 0 && /salary|job/i.test(i.source) ? "Primary job" : i.source,
    amount: Number(i.amount),
    note: idx === 0 ? "" : "",
  }));
  if (!income.length && s.monthly_income) income.push({ id: `imp0${Date.now().toString(36)}`, label: "Primary job", amount: Number(s.monthly_income), note: "" });
  const ef = goals.filter((g) => /emergenc/i.test(g.name)).reduce((a, g) => a + Number(g.saved), 0);
  const other = goals.filter((g) => !/emergenc/i.test(g.name)).reduce((a, g) => a + Number(g.saved), 0);
  const savings: MoneyRow[] = [
    { id: `sv1${Date.now().toString(36)}`, label: "Emergency fund", amount: ef, note: "From your Savings goals" },
    { id: `sv2${Date.now().toString(36)}`, label: "Savings", amount: other, note: goals.length ? "Other savings goals" : "" },
    { id: `sv3${Date.now().toString(36)}`, label: "Stock / investment portfolio", amount: Number(holdings?.v ?? 0), note: "From your Portfolio" },
    { id: `sv4${Date.now().toString(36)}`, label: "Other assets", amount: null, note: "" },
  ];
  return { ok: true, data: { income, savings } };
}

/** Turns the plan's targets into real savings goals (skips ones that already exist). */
export async function applyPlanToGoals(): Promise<Result<{ created: string[] }>> {
  const s = await me();
  if (!hasPillar(s, 3)) return { ok: false, error: "Savings goals are part of Foundation & Wealth." };
  const { data: p } = await getPlan(s);
  const existing = await all<{ name: string }>("SELECT name FROM goals WHERE student_id = ?", [s.id]);
  const has = (re: RegExp, name: string) => existing.some((g) => re.test(g.name) || g.name.toLowerCase() === name.toLowerCase());
  const t = now();
  const wanted: { name: string; emoji: string; target: number; due: string | null; saved: number }[] = [];
  const efTarget = p.savingsPlan.efTarget ?? p.supporting.emergencyFund;
  const efNow = Number(p.savings.find((r) => /emergenc/i.test(r.label))?.amount ?? 0);
  if (efTarget && !has(/emergenc/i, "Emergency fund")) wanted.push({ name: "Emergency fund", emoji: "🛟", target: efTarget, due: p.savingsPlan.efBy || p.period.end, saved: efNow });
  if (p.primaryGoal.goal.trim() && p.primaryGoal.target && !has(/^$/, p.primaryGoal.goal.trim())) wanted.push({ name: p.primaryGoal.goal.trim().slice(0, 60), emoji: "⭐", target: p.primaryGoal.target, due: p.period.end, saved: 0 });
  if (p.savingsPlan.goalAmount && p.savingsPlan.goalFor.trim() && !has(/^$/, p.savingsPlan.goalFor.trim())) wanted.push({ name: p.savingsPlan.goalFor.trim().slice(0, 60), emoji: "🎯", target: p.savingsPlan.goalAmount, due: p.savingsPlan.goalBy || p.period.end, saved: 0 });
  if (p.debtPlan.extra && p.supporting.debtPayoff && !has(/debt/i, "Debt payoff")) wanted.push({ name: "Debt payoff", emoji: "📉", target: p.supporting.debtPayoff, due: p.debtPlan.payoffBy || p.period.end, saved: 0 });
  if (!wanted.length) return { ok: true, data: { created: [] } };

  const stmts: { sql: string; args: (string | number | null)[] }[] = [];
  const ids: string[] = [];
  for (const w of wanted) {
    const gid = id();
    ids.push(gid);
    stmts.push({
      sql: "INSERT INTO goals (id, student_id, name, emoji, target, saved, due_on, platform, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, 'PiggyVest', ?)",
      args: [gid, s.id, w.name, w.emoji, w.target, w.due, t],
    });
    if (w.saved > 0)
      stmts.push({
        sql: "INSERT INTO goal_deposits (id, goal_id, student_id, amount, deposited_on, note, created_at) VALUES (?, ?, ?, ?, ?, 'Starting balance', ?)",
        args: [id(), gid, s.id, w.saved, today(), t],
      });
  }
  await batch(stmts);
  await Promise.all(ids.map((g) => recalcGoal(g)));
  revalidatePath("/app", "layout");
  return { ok: true, data: { created: wanted.map((w) => w.name) } };
}
