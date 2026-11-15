import { currentStudent } from "@/lib/auth";
import { categoryLookup, getCategories, getExpenses, METHODS } from "@/lib/finance";
import { currentMonth, isMonth } from "@/lib/money";
import { hasPillar } from "@/lib/students";

function csvCell(v: string | number): string {
  const s = String(v);
  // Neutralise spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(req: Request) {
  const s = await currentStudent();
  if (!s || !hasPillar(s, 2)) return new Response("Unauthorised", { status: 401 });
  const m = new URL(req.url).searchParams.get("m") ?? "";
  const month = isMonth(m) ? m : currentMonth();
  const [rows, cats] = await Promise.all([getExpenses(s.id, month), getCategories(s.id, { includeArchived: true })]);
  const cat = categoryLookup(cats);
  const lines = [
    ["Date", "Description", "Category", "Group", "Method", "Amount (NGN)", "Recurring"].join(","),
    ...rows
      .slice()
      .sort((a, b) => a.spent_on.localeCompare(b.spent_on))
      .map((r) =>
        [r.spent_on, r.note, cat(r.category).name, cat(r.category).bucket, METHODS.find((x) => x.id === r.method)?.label ?? r.method, Number(r.amount), r.recurring_id ? "yes" : ""]
          .map(csvCell)
          .join(","),
      ),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="money-circle-expenses-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
