/**
 * The Money Circle 6-month Financial Plan — data shape, defaults and maths.
 * Pure module: safe to import from client and server.
 */

export type Freq = "" | "daily" | "weekly" | "monthly";
export type Profile = "" | "conservative" | "moderate" | "aggressive";

export interface MoneyRow {
  id: string;
  label: string;
  amount: number | null;
  note: string;
}
export interface DebtRow {
  id: string;
  label: string;
  owed: number | null;
  monthly: number | null;
  rate: number | null;
}

export interface PlanData {
  period: { start: string; end: string };
  income: MoneyRow[];
  savings: MoneyRow[];
  debts: DebtRow[];
  primaryGoal: { goal: string; target: number | null; why: string };
  supporting: { emergencyFund: number | null; debtPayoff: number | null; portfolio: number | null; incomeProject: string; literacy: boolean };
  allocation: { needs: number | null; wants: number | null; savings: number | null; investments: number | null };
  savingsPlan: { efTarget: number | null; efBy: string; goalAmount: number | null; goalFor: string; goalBy: string; freq: Freq; perDeposit: number | null };
  debtPlan: { method: "" | "avalanche" | "snowball" | "other"; other: string; extra: number | null; payoffBy: string };
  investPlan: {
    profile: Profile;
    riskScore: number | null;
    mix: { cash: number | null; bonds: number | null; stocks: number | null; alt: number | null };
    target: number | null;
    targetBy: string;
    lumpSum: number | null;
    freq: Freq;
    perContribution: number | null;
  };
}

export interface PlanRecord {
  data: PlanData;
  status: "draft" | "submitted" | "signed";
  client_signature: string | null;
  submitted_at: string | null;
  coach_signed_at: string | null;
  coach_note: string | null;
  updated_at: string;
}

let n = 0;
export const rid = () => `r${Date.now().toString(36)}${(n++).toString(36)}`;

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function defaultPlan(startIso: string): PlanData {
  const row = (label: string): MoneyRow => ({ id: rid(), label, amount: null, note: "" });
  return {
    period: { start: startIso, end: addMonths(startIso, 6) },
    income: [row("Primary job"), row("Side hustle / freelance"), row("Other income")],
    savings: [row("Emergency fund"), row("Savings"), row("Stock / investment portfolio"), row("Other assets")],
    debts: [{ id: rid(), label: "", owed: null, monthly: null, rate: null }],
    primaryGoal: { goal: "", target: null, why: "" },
    supporting: { emergencyFund: null, debtPayoff: null, portfolio: null, incomeProject: "", literacy: false },
    allocation: { needs: 50, wants: 25, savings: 15, investments: 10 },
    savingsPlan: { efTarget: null, efBy: "", goalAmount: null, goalFor: "", goalBy: "", freq: "", perDeposit: null },
    debtPlan: { method: "", other: "", extra: null, payoffBy: "" },
    investPlan: { profile: "", riskScore: null, mix: { cash: null, bonds: null, stocks: null, alt: null }, target: null, targetBy: "", lumpSum: null, freq: "", perContribution: null },
  };
}

/** Merge stored JSON over defaults so older/partial plans never crash the editor. */
export function normalisePlan(raw: unknown, startIso: string): PlanData {
  const d = defaultPlan(startIso);
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Partial<PlanData>;
  return {
    period: { ...d.period, ...(r.period ?? {}) },
    income: Array.isArray(r.income) && r.income.length ? r.income : d.income,
    savings: Array.isArray(r.savings) && r.savings.length ? r.savings : d.savings,
    debts: Array.isArray(r.debts) && r.debts.length ? r.debts : d.debts,
    primaryGoal: { ...d.primaryGoal, ...(r.primaryGoal ?? {}) },
    supporting: { ...d.supporting, ...(r.supporting ?? {}) },
    allocation: { ...d.allocation, ...(r.allocation ?? {}) },
    savingsPlan: { ...d.savingsPlan, ...(r.savingsPlan ?? {}) },
    debtPlan: { ...d.debtPlan, ...(r.debtPlan ?? {}) },
    investPlan: { ...d.investPlan, ...(r.investPlan ?? {}), mix: { ...d.investPlan.mix, ...(r.investPlan?.mix ?? {}) } },
  };
}

// ---------------------------------------------------------------------------
// Reference tables from the coaching template
// ---------------------------------------------------------------------------

export const ALLOCATION_GUIDE = {
  needs: { label: "Needs", min: 50, max: 60 },
  wants: { label: "Wants", min: 20, max: 30 },
  savings: { label: "Savings", min: 10, max: 20 },
  investments: { label: "Investments", min: 5, max: 10 },
} as const;

export const ASSET_CLASSES = [
  { key: "cash", label: "Cash & money market", hint: "Treasury bills, fixed deposits", mix: { conservative: 40, moderate: 20, aggressive: 5 } },
  { key: "bonds", label: "Bonds & mutual funds", hint: "FGN bonds, balanced funds", mix: { conservative: 40, moderate: 40, aggressive: 25 } },
  { key: "stocks", label: "Stocks & equities", hint: "NGX shares, equity funds", mix: { conservative: 15, moderate: 30, aggressive: 50 } },
  { key: "alt", label: "Alternative investments", hint: "Real estate, agric, others", mix: { conservative: 5, moderate: 10, aggressive: 20 } },
] as const;

export const PROFILES: { id: Exclude<Profile, "">; label: string; blurb: string }[] = [
  { id: "conservative", label: "Conservative", blurb: "Preserve capital, low risk, steady growth" },
  { id: "moderate", label: "Moderate", blurb: "Balance growth and safety, medium risk" },
  { id: "aggressive", label: "Aggressive", blurb: "Maximise growth, comfortable with higher risk" },
];

export function profileFromScore(score: number | null): Profile {
  if (!score) return "";
  return score <= 3 ? "conservative" : score <= 7 ? "moderate" : "aggressive";
}

export const perMonth = (amount: number | null, f: Freq) => (amount ? (f === "daily" ? amount * 30 : f === "weekly" ? Math.round(amount * 4.33) : f === "monthly" ? amount : 0) : 0);

// ---------------------------------------------------------------------------
// Live analysis
// ---------------------------------------------------------------------------

const sum = (xs: (number | null)[]) => xs.reduce<number>((a, v) => a + (Number(v) || 0), 0);

export function analyse(p: PlanData) {
  const income = sum(p.income.map((r) => r.amount));
  const saved = sum(p.savings.map((r) => r.amount));
  const debt = sum(p.debts.map((r) => r.owed));
  const debtMonthly = sum(p.debts.map((r) => r.monthly));
  const ef = Number(p.savings.find((r) => /emergenc/i.test(r.label))?.amount ?? 0);
  const alloc = p.allocation;
  const allocTotal = sum([alloc.needs, alloc.wants, alloc.savings, alloc.investments]);
  const monthlyNeeds = income * ((alloc.needs ?? 0) / 100);
  const efMonths = monthlyNeeds > 0 ? ef / monthlyNeeds : null;
  const dti = income > 0 ? debtMonthly / income : null;
  const mixTotal = sum(Object.values(p.investPlan.mix));
  const piggyMonthly = perMonth(p.savingsPlan.perDeposit, p.savingsPlan.freq);
  const investMonthly = perMonth(p.investPlan.perContribution, p.investPlan.freq);
  const plannedSaveMonthly = income * ((alloc.savings ?? 0) / 100);
  const plannedInvestMonthly = income * ((alloc.investments ?? 0) / 100);
  const efTarget = p.savingsPlan.efTarget ?? p.supporting.emergencyFund ?? null;
  const monthsToEf = efTarget && piggyMonthly > 0 ? Math.max(0, Math.ceil((efTarget - ef) / piggyMonthly)) : null;

  const tips: { tone: "good" | "warn"; text: string }[] = [];
  if (income > 0 && allocTotal !== 100) tips.push({ tone: "warn", text: `Your budget split adds up to ${allocTotal}%. Adjust it to exactly 100%.` });
  (Object.keys(ALLOCATION_GUIDE) as (keyof typeof ALLOCATION_GUIDE)[]).forEach((k) => {
    const v = alloc[k];
    const g = ALLOCATION_GUIDE[k];
    if (v !== null && (v < g.min || v > g.max)) tips.push({ tone: "warn", text: `${g.label} is ${v}%: the guide is ${g.min} to ${g.max}%.` });
  });
  if (efMonths !== null) tips.push(efMonths >= 3 ? { tone: "good", text: `Your emergency fund covers about ${efMonths.toFixed(1)} months of needs. Great cushion.` } : { tone: "warn", text: `Your emergency fund covers ${efMonths.toFixed(1)} months of needs: aim for at least 3.` });
  if (dti !== null && debtMonthly > 0) tips.push(dti > 0.35 ? { tone: "warn", text: `Debt repayments take ${Math.round(dti * 100)}% of income. Prioritise your payoff plan.` } : { tone: "good", text: `Debt repayments are ${Math.round(dti * 100)}% of income: manageable.` });
  if (piggyMonthly && plannedSaveMonthly && piggyMonthly < plannedSaveMonthly * 0.8) tips.push({ tone: "warn", text: `Your auto-save (≈₦${piggyMonthly.toLocaleString("en-NG")}/month) is below your ${alloc.savings}% savings allocation (≈₦${Math.round(plannedSaveMonthly).toLocaleString("en-NG")}).` });
  if (p.investPlan.profile && mixTotal > 0 && mixTotal !== 100) tips.push({ tone: "warn", text: `Your portfolio mix adds up to ${mixTotal}%. Make it 100%.` });

  return { income, saved, debt, debtMonthly, netWorth: saved - debt, ef, efMonths, dti, allocTotal, mixTotal, piggyMonthly, investMonthly, plannedSaveMonthly, plannedInvestMonthly, efTarget, monthsToEf, tips };
}

/** Rough completion across the parts that matter before the review session. */
export function completion(p: PlanData): { pct: number; missing: string[] } {
  const a = analyse(p);
  const checks: [boolean, string][] = [
    [a.income > 0, "Add your monthly income"],
    [p.savings.some((r) => r.amount !== null), "Record your current savings (even ₦0)"],
    [Boolean(p.primaryGoal.goal.trim()) && Boolean(p.primaryGoal.target), "Set your primary goal and target"],
    [Boolean(p.primaryGoal.why.trim()), "Write why your goal matters"],
    [a.allocTotal === 100, "Make your budget split add up to 100%"],
    [Boolean(p.savingsPlan.efTarget || p.supporting.emergencyFund), "Set an emergency fund target"],
    [Boolean(p.savingsPlan.freq) && Boolean(p.savingsPlan.perDeposit), "Choose how often you’ll save, and how much"],
    [Boolean(p.investPlan.profile), "Pick your investor profile"],
  ];
  const done = checks.filter(([ok]) => ok).length;
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, m]) => m) };
}
