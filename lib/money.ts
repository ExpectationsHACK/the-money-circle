export type Bucket = "needs" | "wants" | "savings";

export const CATEGORIES: { id: string; label: string; emoji: string; bucket: Bucket; weight: number }[] = [
  { id: "housing", label: "Rent & housing", emoji: "🏠", bucket: "needs", weight: 35 },
  { id: "food", label: "Food & groceries", emoji: "🛒", bucket: "needs", weight: 22 },
  { id: "transport", label: "Transport & fuel", emoji: "🚌", bucket: "needs", weight: 12 },
  { id: "utilities", label: "Power, data & bills", emoji: "💡", bucket: "needs", weight: 9 },
  { id: "family", label: "Family support", emoji: "👨‍👩‍👧", bucket: "needs", weight: 10 },
  { id: "giving", label: "Tithe & giving", emoji: "🙏", bucket: "needs", weight: 12 },
  { id: "social", label: "Owambe & social", emoji: "🎉", bucket: "wants", weight: 35 },
  { id: "personal", label: "Personal & self-care", emoji: "💅", bucket: "wants", weight: 35 },
  { id: "business", label: "Business & learning", emoji: "💼", bucket: "wants", weight: 20 },
  { id: "other", label: "Other", emoji: "🧾", bucket: "wants", weight: 10 },
  { id: "savings", label: "Savings & investments", emoji: "🌱", bucket: "savings", weight: 75 },
  { id: "debt", label: "Debt repayment", emoji: "📉", bucket: "savings", weight: 25 },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

export function category(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.find((c) => c.id === "other")!;
}

/** 50 / 30 / 20 split, spread across categories by weight, rounded to the nearest ₦500. */
export function fiftyThirtyTwenty(income: number): Record<string, number> {
  const share: Record<Bucket, number> = { needs: 0.5, wants: 0.3, savings: 0.2 };
  const out: Record<string, number> = {};
  for (const b of ["needs", "wants", "savings"] as Bucket[]) {
    const cats = CATEGORIES.filter((c) => c.bucket === b);
    const total = cats.reduce((s, c) => s + c.weight, 0);
    for (const c of cats) out[c.id] = Math.round((income * share[b] * c.weight) / total / 500) * 500;
  }
  return out;
}

export const INVESTMENT_KINDS: { id: string; label: string; color: string }[] = [
  { id: "money-market", label: "Money market", color: "#2f7a5c" },
  { id: "treasury-bills", label: "Treasury bills", color: "#0f3d2e" },
  { id: "mutual-funds", label: "Mutual funds", color: "#e8b547" },
  { id: "stocks", label: "Stocks", color: "#e46f4f" },
  { id: "bonds", label: "Bonds", color: "#7a9e8e" },
  { id: "other", label: "Other", color: "#b8ab8a" },
];

export function kindLabel(id: string) {
  return INVESTMENT_KINDS.find((k) => k.id === id)?.label ?? "Other";
}

export const SAVINGS_PLATFORMS = ["PiggyVest", "Cowrywise", "Kuda", "Bank account", "Other"];

export function naira(n: number, opts: { compact?: boolean } = {}): string {
  if (opts.compact && Math.abs(n) >= 1_000_000) return `₦${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}m`;
  if (opts.compact && Math.abs(n) >= 10_000) return `₦${Math.round(n / 1000)}k`;
  return "₦" + Math.round(n).toLocaleString("en-NG");
}

/** Parses "150,000", "₦150k", "1.2m" into naira. */
export function parseNaira(raw: FormDataEntryValue | null): number {
  const s = String(raw ?? "").toLowerCase().replace(/[₦,\s]/g, "");
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return NaN;
  const n = Number(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
  return Math.round(n);
}

export function lagosNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }));
}

export function currentMonth(): string {
  const d = lagosNow();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function today(): string {
  const d = lagosNow();
  return `${currentMonth()}-${String(d.getDate()).padStart(2, "0")}`;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-NG", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function isMonth(v: string | undefined): v is string {
  return Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v));
}

export function greeting(): string {
  const h = lagosNow().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.max(0, Math.min(100, Math.round((part / whole) * 100))) : 0;
}

export const DEFAULT_MILESTONES = [
  "Pick the one skill you’ll sell",
  "Define your offer: who it’s for and the result",
  "Set your price (and practise saying it out loud)",
  "Build a simple portfolio or WhatsApp catalogue",
  "Tell 20 people what you now do",
  "Have 5 sales conversations",
  "Land your first paying client 🎉",
  "Deliver, then ask for a testimonial",
];
