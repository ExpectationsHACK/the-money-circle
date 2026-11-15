"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Category, Expense, Recurring } from "@/lib/finance";
import {
  createExpense,
  createRecurring,
  deleteExpenses,
  deleteRecurring,
  duplicateExpense,
  toggleRecurring,
  updateExpense,
} from "@/app/app/finance-actions";
import { DateCell, Meter, SelectCell, TextCell, fmt, fmtCompact, toast } from "./cells";

type View = "table" | "board" | "calendar";
type GroupBy = "day" | "category" | "none";
type Sort = "newest" | "oldest" | "amount";

const METHODS = [
  { id: "transfer", label: "Transfer" },
  { id: "card", label: "Card" },
  { id: "cash", label: "Cash" },
  { id: "pos", label: "POS" },
  { id: "ussd", label: "USSD" },
  { id: "wallet", label: "Wallet / app" },
];
const methodLabel = (m: string) => METHODS.find((x) => x.id === m)?.label ?? m;

function dayLabel(d: string, today: string) {
  if (d === today) return "Today";
  const y = new Date(today + "T00:00:00");
  y.setDate(y.getDate() - 1);
  if (d === y.toISOString().slice(0, 10)) return "Yesterday";
  return new Date(d + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "short" });
}

export function ExpenseDatabase(props: {
  month: string;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  thisMonthHref: string | null;
  today: string;
  categories: Category[];
  expenses: Expense[];
  planned: Record<string, number>;
  recurring: Recurring[];
  lastMonthTotal: number;
  initialCategory: string;
  postedRecurring: number;
}) {
  const { month, today } = props;
  const [rows, setRows] = useState(props.expenses);
  const [recurring, setRecurring] = useState(props.recurring);
  const [view, setView] = useState<View>("table");
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const [sort, setSort] = useState<Sort>("newest");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(props.initialCategory);
  const [method, setMethod] = useState("");
  const [day, setDay] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showRecurring, setShowRecurring] = useState(false);
  const isCurrent = month === today.slice(0, 7);
  const defaultDate = isCurrent ? today : `${month}-01`;
  const [draft, setDraft] = useState({ date: defaultDate, note: "", category: "", amount: "", method: "transfer" });
  const [saving, setSaving] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  const catOf = useMemo(() => {
    const m = new Map(props.categories.map((c) => [c.key, c]));
    return (k: string): Category => m.get(k) ?? { key: k, name: "Uncategorised", emoji: "🧾", bucket: "wants", sort: 999, archived: 0 };
  }, [props.categories]);
  const catOptions = props.categories.map((c) => ({ value: c.key, label: `${c.emoji} ${c.name}` }));

  // ---- Derived data -------------------------------------------------------------------
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        (!cat || r.category === cat) &&
        (!method || r.method === method) &&
        (!day || r.spent_on === day) &&
        (!needle || r.note.toLowerCase().includes(needle) || catOf(r.category).name.toLowerCase().includes(needle) || String(r.amount).includes(needle)),
    );
    return out.sort((a, b) =>
      sort === "amount" ? Number(b.amount) - Number(a.amount) : sort === "oldest" ? a.spent_on.localeCompare(b.spent_on) || a.created_at.localeCompare(b.created_at) : b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at),
    );
  }, [rows, q, cat, method, day, sort, catOf]);

  const total = rows.reduce((a, r) => a + Number(r.amount), 0);
  const filteredTotal = filtered.reduce((a, r) => a + Number(r.amount), 0);
  const isFiltered = Boolean(q || cat || method || day);

  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const daysElapsed = isCurrent ? Number(today.slice(8, 10)) : month < today.slice(0, 7) ? daysInMonth : 0;
  const daily = useMemo(() => {
    const arr = Array.from({ length: daysInMonth }, () => 0);
    rows.forEach((r) => (arr[Number(r.spent_on.slice(8, 10)) - 1] += Number(r.amount)));
    return arr;
  }, [rows, daysInMonth]);
  const avg = daysElapsed ? total / daysElapsed : 0;
  const projected = isCurrent ? Math.round(avg * daysInMonth) : total;
  const plannedTotal = Object.values(props.planned).reduce((a, v) => a + v, 0);
  const vsLast = props.lastMonthTotal ? Math.round(((total - props.lastMonthTotal) / props.lastMonthTotal) * 100) : null;
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + Number(r.amount)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  // ---- Mutations ------------------------------------------------------------------------
  const replace = (e: Expense) => setRows((x) => x.map((r) => (r.id === e.id ? e : r)));
  const edit = (r: Expense, field: "spent_on" | "amount" | "category" | "note" | "method") => async (v: string) => {
    const res = await updateExpense(r.id, field, v);
    if (res.ok) {
      if (res.data.spent_on.slice(0, 7) !== month) {
        setRows((x) => x.filter((e) => e.id !== r.id));
        toast("Moved to another month");
      } else replace(res.data);
    }
    return res;
  };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.category) {
      toast("Pick a category", "error");
      return;
    }
    setSaving(true);
    const r = await createExpense(draft);
    setSaving(false);
    if (!r.ok) return toast(r.error, "error");
    if (r.data.spent_on.slice(0, 7) === month) setRows((x) => [r.data, ...x]);
    toast(`Logged ${fmt(Number(r.data.amount))} · ${catOf(r.data.category).name}`);
    setDraft((d) => ({ ...d, note: "", amount: "" }));
    noteRef.current?.focus();
  }

  async function removeSelected() {
    if (!selected.size || !confirm(`Delete ${selected.size} expense${selected.size > 1 ? "s" : ""}?`)) return;
    const ids = [...selected];
    const r = await deleteExpenses(ids);
    if (!r.ok) return toast(r.error, "error");
    setRows((x) => x.filter((e) => !selected.has(e.id)));
    setSelected(new Set());
    toast("Deleted");
  }

  async function removeOne(e: Expense) {
    const r = await deleteExpenses([e.id]);
    if (!r.ok) return toast(r.error, "error");
    setRows((x) => x.filter((y) => y.id !== e.id));
    toast("Deleted");
  }

  async function dup(e: Expense) {
    const r = await duplicateExpense(e.id);
    if (!r.ok) return toast(r.error, "error");
    if (r.data.spent_on.slice(0, 7) === month) setRows((x) => [r.data, ...x]);
    toast("Duplicated to today");
  }

  // ---- Groups for the table view ---------------------------------------------------------
  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "", items: filtered }];
    const m = new Map<string, Expense[]>();
    filtered.forEach((r) => {
      const k = groupBy === "day" ? r.spent_on : r.category;
      m.set(k, [...(m.get(k) ?? []), r]);
    });
    const entries = [...m.entries()];
    if (groupBy === "category") entries.sort((a, b) => b[1].reduce((s, r) => s + Number(r.amount), 0) - a[1].reduce((s, r) => s + Number(r.amount), 0));
    return entries.map(([k, items]) => ({
      key: k,
      label: groupBy === "day" ? dayLabel(k, today) : `${catOf(k).emoji} ${catOf(k).name}`,
      items,
    }));
  }, [filtered, groupBy, today, catOf]);

  const control = "rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-forest";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-moss">🧾 Expenses</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{props.monthLabel}</h1>
        </div>
        <nav className="flex items-center gap-1 rounded-xl bg-paper p-1 ring-1 ring-line" aria-label="Month">
          <Link href={props.prevHref} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream" aria-label="Previous month">←</Link>
          {props.thisMonthHref && <Link href={props.thisMonthHref} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream">Today</Link>}
          <Link href={props.nextHref} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream" aria-label="Next month">→</Link>
        </nav>
      </div>

      {props.postedRecurring > 0 && (
        <p className="rounded-2xl bg-moss/10 px-4 py-3 text-sm font-semibold text-moss">↻ {props.postedRecurring} recurring bill{props.postedRecurring > 1 ? "s were" : " was"} logged for you today.</p>
      )}

      {/* Insights */}
      <section className="grid gap-px overflow-hidden rounded-3xl bg-line ring-1 ring-line sm:grid-cols-4" aria-label="Spending insights">
        <div className="bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Spent</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{fmt(total)}</p>
          {plannedTotal > 0 && <div className="mt-2"><Meter value={total} max={plannedTotal} over={total > plannedTotal} /></div>}
          <p className="mt-1 text-xs text-muted">{plannedTotal ? `of ${fmtCompact(plannedTotal)} budget` : `${rows.length} expenses`}</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm font-semibold text-muted">Daily average</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{fmt(avg)}</p>
          <p className="mt-1 text-xs text-muted">over {daysElapsed || 0} day{daysElapsed === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm font-semibold text-muted">{isCurrent ? "Projected month-end" : "Month total"}</p>
          <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${plannedTotal && projected > plannedTotal ? "text-coral" : ""}`}>{fmt(projected)}</p>
          <p className={`mt-1 text-xs ${plannedTotal && projected > plannedTotal ? "font-semibold text-coral" : "text-muted"}`}>
            {plannedTotal ? (projected > plannedTotal ? `${fmtCompact(projected - plannedTotal)} over budget at this pace` : "on track with your budget") : "at today’s pace"}
          </p>
        </div>
        <div className="bg-paper p-5">
          <p className="text-sm font-semibold text-muted">vs last month</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{vsLast === null ? "—" : `${vsLast > 0 ? "▲" : vsLast < 0 ? "▼" : ""} ${Math.abs(vsLast)}%`}</p>
          <p className="mt-1 truncate text-xs text-muted">{byCat[0] ? `Top: ${catOf(byCat[0][0]).emoji} ${catOf(byCat[0][0]).name}` : "No spending yet"}</p>
        </div>
      </section>

      {/* Daily chart */}
      {total > 0 && (
        <section className="rounded-3xl bg-paper p-5 ring-1 ring-line" aria-label="Daily spending chart">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-base font-bold">Daily spending</h2>
            <p className="text-xs text-muted">peak {fmtCompact(Math.max(...daily))}</p>
          </div>
          <DailyBars data={daily} month={month} todayDay={isCurrent ? Number(today.slice(8, 10)) : 0} selectedDay={day} onPick={(d) => { setDay(d === day ? "" : d); setView("table"); }} />
        </section>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="View" className="flex rounded-xl bg-paper p-1 ring-1 ring-line">
          {(["table", "board", "calendar"] as View[]).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize ${view === v ? "bg-forest text-cream" : "text-muted hover:text-ink"}`}
            >
              {v === "table" ? "☰ Table" : v === "board" ? "▦ Board" : "▤ Calendar"}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Search expenses" className={`${control} w-36 sm:w-44`} />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className={control}>
          <option value="">All categories</option>
          {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Filter by payment method" className={control}>
          <option value="">Any method</option>
          {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        {view === "table" && (
          <>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} aria-label="Group by" className={control}>
              <option value="day">Group: Day</option>
              <option value="category">Group: Category</option>
              <option value="none">No grouping</option>
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className={control}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount">Biggest first</option>
            </select>
          </>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={() => setShowRecurring((x) => !x)} aria-expanded={showRecurring} className="rounded-xl bg-paper px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-cream">
            ↻ Recurring ({recurring.filter((r) => r.active).length})
          </button>
          <a href={`/app/expenses/export?m=${month}`} className="rounded-xl bg-paper px-3 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-cream">⤓ CSV</a>
        </div>
      </div>

      {isFiltered && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Showing {filtered.length} of {rows.length} · {fmt(filteredTotal)}</span>
          {day && <span className="rounded-full bg-gold/25 px-2.5 py-0.5 font-semibold">{dayLabel(day, today)}</span>}
          <button onClick={() => { setQ(""); setCat(""); setMethod(""); setDay(""); }} className="font-semibold text-moss underline">Clear filters</button>
        </div>
      )}

      {showRecurring && <RecurringPanel recurring={recurring} setRecurring={setRecurring} catOptions={catOptions} catOf={catOf} />}

      {/* Quick add (Notion "New" row) */}
      <form onSubmit={add} className="grid grid-cols-2 gap-2 rounded-2xl bg-paper p-3 ring-1 ring-line sm:grid-cols-[8.5rem_1fr_11rem_8rem_8rem_auto]" aria-label="Add expense">
        <input type="date" value={draft.date} max={today} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} aria-label="Date" className={control} />
        <input ref={noteRef} value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} placeholder="What for? e.g. Bolt to work" aria-label="Description" maxLength={120} className={`${control} col-span-2 sm:col-span-1`} />
        <select value={draft.category} onChange={(e) => { setDraft((d) => ({ ...d, category: e.target.value })); amountRef.current?.focus(); }} aria-label="Category" className={control} required>
          <option value="" disabled>Category…</option>
          {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={draft.method} onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))} aria-label="Payment method" className={control}>
          {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <input ref={amountRef} value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} placeholder="₦ 4.5k" inputMode="decimal" aria-label="Amount" required className={`${control} text-right tabular-nums`} />
        <button disabled={saving} className="col-span-2 rounded-lg bg-gold px-4 py-1.5 text-sm font-bold text-ink hover:bg-gold-soft disabled:opacity-60 sm:col-span-1">
          {saving ? "…" : "+ Add"}
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-3xl bg-paper px-6 py-12 text-center ring-1 ring-line">
          <p className="text-4xl" aria-hidden>🧾</p>
          <p className="mt-3 font-display text-lg font-bold">No expenses in {props.monthLabel} yet</p>
          <p className="mt-1 text-sm text-muted">Log your first one above. Tip: type amounts like “4.5k” or “1.2m”.</p>
        </div>
      ) : view === "table" ? (
        <section className="overflow-x-auto rounded-3xl bg-paper ring-1 ring-line" aria-label="Expenses table">
          <div className="min-w-[760px]">
            <div className="sticky top-0 z-10 grid grid-cols-[2.25rem_6.5rem_1fr_11rem_7.5rem_8rem_4.5rem] items-center gap-1 border-b border-line bg-paper px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <input
                type="checkbox"
                aria-label="Select all shown"
                checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((r) => r.id)) : new Set())}
                className="mx-auto size-4 accent-[#0f3d2e]"
              />
              <span className="px-2">Date</span>
              <span className="px-2">Description</span>
              <span className="px-2">Category</span>
              <span className="px-2">Method</span>
              <span className="px-2 text-right">Amount</span>
              <span />
            </div>
            {selected.size > 0 && (
              <div className="flex items-center justify-between bg-forest px-4 py-2 text-sm text-cream">
                <span>{selected.size} selected · {fmt(rows.filter((r) => selected.has(r.id)).reduce((a, r) => a + Number(r.amount), 0))}</span>
                <span className="flex gap-3">
                  <button onClick={() => setSelected(new Set())} className="font-semibold text-cream/70 hover:text-cream">Clear</button>
                  <button onClick={removeSelected} className="font-bold text-gold hover:text-gold-soft">Delete</button>
                </span>
              </div>
            )}
            {filtered.length === 0 && <p className="px-6 py-8 text-center text-sm text-muted">Nothing matches these filters.</p>}
            {groups.map((g) => (
              <div key={g.key}>
                {groupBy !== "none" && (
                  <div className="flex items-center justify-between bg-cream/60 px-5 py-1.5 text-xs font-bold">
                    <span>{g.label} <span className="font-semibold text-muted">· {g.items.length}</span></span>
                    <span className="tabular-nums">{fmt(g.items.reduce((a, r) => a + Number(r.amount), 0))}</span>
                  </div>
                )}
                {g.items.map((r) => {
                  const c = catOf(r.category);
                  return (
                    <div key={r.id} className={`group grid grid-cols-[2.25rem_6.5rem_1fr_11rem_7.5rem_8rem_4.5rem] items-center gap-1 border-b border-line/60 px-3 py-0.5 ${selected.has(r.id) ? "bg-gold/10" : ""}`}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.note || c.name}`}
                        checked={selected.has(r.id)}
                        onChange={(e) =>
                          setSelected((x) => {
                            const y = new Set(x);
                            if (e.target.checked) y.add(r.id);
                            else y.delete(r.id);
                            return y;
                          })
                        }
                        className="mx-auto size-4 accent-[#0f3d2e]"
                      />
                      <DateCell value={r.spent_on} max={today} ariaLabel="Date" onSave={edit(r, "spent_on")} />
                      <div className="flex min-w-0 items-center">
                        <TextCell value={r.note} placeholder={c.name} ariaLabel="Description" className="truncate font-semibold" onSave={edit(r, "note")} />
                        {r.recurring_id && <span title="Recurring bill" className="shrink-0 px-1 text-xs text-muted">↻</span>}
                      </div>
                      <SelectCell value={r.category} options={catOptions} ariaLabel="Category" display={<span className="inline-flex items-center gap-1.5 rounded-md bg-cream px-2 py-0.5 text-sm">{c.emoji} <span className="truncate">{c.name}</span></span>} onSave={edit(r, "category")} />
                      <SelectCell value={r.method} options={METHODS.map((m) => ({ value: m.id, label: m.label }))} ariaLabel="Payment method" display={<span className="text-sm text-muted">{methodLabel(r.method)}</span>} onSave={edit(r, "method")} />
                      <TextCell value={Number(r.amount).toLocaleString("en-NG")} display={fmt(Number(r.amount))} ariaLabel="Amount" inputMode="decimal" align="right" className="font-semibold" onSave={edit(r, "amount")} />
                      <div className="flex justify-end opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                        <button onClick={() => dup(r)} title="Duplicate to today" aria-label="Duplicate to today" className="rounded-lg px-1.5 py-1 text-muted hover:bg-cream hover:text-ink">⧉</button>
                        <button onClick={() => removeOne(r)} title="Delete" aria-label="Delete expense" className="rounded-lg px-1.5 py-1 text-muted hover:bg-coral/10 hover:text-coral">✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length > 0 && (
              <div className="flex justify-between px-5 py-3 text-sm font-bold">
                <span>{filtered.length} expense{filtered.length === 1 ? "" : "s"}</span>
                <span className="tabular-nums">{fmt(filteredTotal)}</span>
              </div>
            )}
          </div>
        </section>
      ) : view === "board" ? (
        <Board rows={filtered} categories={props.categories} planned={props.planned} catOf={catOf} onMove={async (r, key) => {
          if (r.category === key) return;
          setRows((x) => x.map((e) => (e.id === r.id ? { ...e, category: key } : e)));
          const res = await updateExpense(r.id, "category", key);
          if (!res.ok) {
            setRows((x) => x.map((e) => (e.id === r.id ? r : e)));
            toast(res.error, "error");
          } else toast(`Moved to ${catOf(key).name}`);
        }} />
      ) : (
        <Calendar month={month} today={today} rows={filtered} catOf={catOf} onPick={(d) => { setDay(d); setView("table"); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daily bars (single hue; hover = native tooltip; click filters to that day)
// ---------------------------------------------------------------------------

function DailyBars({ data, month, todayDay, selectedDay, onPick }: { data: number[]; month: string; todayDay: number; selectedDay: string; onPick: (d: string) => void }) {
  const max = Math.max(1, ...data);
  return (
    <div className="mt-3">
      <div className="flex h-28 items-end gap-[2px]" role="list">
        {data.map((v, i) => {
          const d = `${month}-${String(i + 1).padStart(2, "0")}`;
          const isSel = selectedDay === d;
          const future = todayDay > 0 && i + 1 > todayDay;
          return (
            <button
              key={i}
              role="listitem"
              onClick={() => v > 0 && onPick(d)}
              title={`${new Date(d + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" })}: ${fmt(v)}`}
              aria-label={`Day ${i + 1}: ${fmt(v)}`}
              className="group flex h-full flex-1 items-end"
            >
              <span
                className={`block w-full rounded-t-[3px] transition ${isSel ? "bg-gold" : future ? "bg-line/50" : "bg-moss group-hover:bg-forest"}`}
                style={{ height: v > 0 ? `${Math.max(3, (v / max) * 100)}%` : "2px", opacity: v > 0 ? 1 : 0.35 }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span>1</span>
        <span>{Math.ceil(data.length / 2)}</span>
        <span>{data.length}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Board view: one column per category; drag cards to recategorise
// ---------------------------------------------------------------------------

function Board({ rows, categories, planned, catOf, onMove }: {
  rows: Expense[];
  categories: Category[];
  planned: Record<string, number>;
  catOf: (k: string) => Category;
  onMove: (r: Expense, key: string) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const used = new Set(rows.map((r) => r.category));
  const cols = [...categories.filter((c) => used.has(c.key) || planned[c.key]), ...[...used].filter((k) => !categories.some((c) => c.key === k)).map(catOf)];

  return (
    <section className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-label="Expenses board">
      <div className="flex gap-3">
        {cols.map((c) => {
          const items = rows.filter((r) => r.category === c.key);
          const tot = items.reduce((a, r) => a + Number(r.amount), 0);
          const p = planned[c.key];
          return (
            <div
              key={c.key}
              onDragOver={(e) => { e.preventDefault(); setOver(c.key); }}
              onDragLeave={() => setOver((o) => (o === c.key ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const r = rows.find((x) => x.id === dragId);
                if (r) onMove(r, c.key);
                setDragId(null);
              }}
              className={`w-64 shrink-0 rounded-3xl p-3 ring-1 transition ${over === c.key ? "bg-gold/15 ring-gold" : "bg-paper ring-line"}`}
            >
              <div className="px-1">
                <p className="flex items-center justify-between gap-2 text-sm font-bold">
                  <span className="truncate">{c.emoji} {c.name}</span>
                  <span className="text-xs font-semibold text-muted">{items.length}</span>
                </p>
                <p className="mt-0.5 text-xs tabular-nums text-muted">{fmt(tot)}{p ? ` of ${fmtCompact(p)}` : ""}</p>
                {p ? <div className="mt-1.5"><Meter value={tot} max={p} over={tot > p} /></div> : null}
              </div>
              <ul className="mt-3 space-y-2">
                {items.map((r) => (
                  <li
                    key={r.id}
                    draggable
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`cursor-grab rounded-xl bg-cream/70 px-3 py-2.5 text-sm ring-1 ring-line/60 active:cursor-grabbing ${dragId === r.id ? "opacity-40" : ""}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-semibold">{r.note || c.name}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{fmtCompact(Number(r.amount))}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(r.spent_on + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" })} · {methodLabel(r.method)}
                      {r.recurring_id ? " · ↻" : ""}
                    </p>
                  </li>
                ))}
                {items.length === 0 && <li className="rounded-xl border-2 border-dashed border-line px-3 py-4 text-center text-xs text-muted">Drop here</li>}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Tip: drag a card to another column to change its category.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Calendar view
// ---------------------------------------------------------------------------

function Calendar({ month, today, rows, catOf, onPick }: { month: string; today: string; rows: Expense[]; catOf: (k: string) => Category; onPick: (d: string) => void }) {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday first
  const byDay = new Map<string, Expense[]>();
  rows.forEach((r) => byDay.set(r.spent_on, [...(byDay.get(r.spent_on) ?? []), r]));
  const max = Math.max(1, ...[...byDay.values()].map((v) => v.reduce((a, r) => a + Number(r.amount), 0)));
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <section className="rounded-3xl bg-paper p-3 ring-1 ring-line sm:p-4" aria-label="Expenses calendar">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wider text-muted">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const key = `${month}-${String(d).padStart(2, "0")}`;
          const items = byDay.get(key) ?? [];
          const tot = items.reduce((a, r) => a + Number(r.amount), 0);
          const isToday = key === today;
          return (
            <button
              key={key}
              onClick={() => items.length && onPick(key)}
              aria-label={`${d}: ${items.length ? `${fmt(tot)}, ${items.length} expenses` : "no spending"}`}
              className={`flex min-h-20 flex-col rounded-xl p-1.5 text-left transition sm:min-h-24 sm:p-2 ${items.length ? "hover:ring-2 hover:ring-forest/30" : "cursor-default"} ${isToday ? "ring-2 ring-gold" : ""}`}
              style={{ background: tot ? `rgba(47,122,92,${0.06 + (tot / max) * 0.22})` : "var(--color-cream)" }}
            >
              <span className={`text-xs font-bold ${isToday ? "text-forest" : "text-muted"}`}>{d}</span>
              {tot > 0 && <span className="mt-auto text-xs font-bold tabular-nums sm:text-sm">{fmtCompact(tot)}</span>}
              <span className="hidden truncate text-[11px] text-muted sm:block">{items.slice(0, 2).map((r) => catOf(r.category).emoji).join(" ")}{items.length > 2 ? ` +${items.length - 2}` : ""}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Recurring bills panel
// ---------------------------------------------------------------------------

function RecurringPanel({ recurring, setRecurring, catOptions, catOf }: {
  recurring: Recurring[];
  setRecurring: React.Dispatch<React.SetStateAction<Recurring[]>>;
  catOptions: { value: string; label: string }[];
  catOf: (k: string) => Category;
}) {
  const [f, setF] = useState({ name: "", amount: "", category: "", method: "transfer", day: "1" });
  const control = "rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-forest";
  const monthly = recurring.filter((r) => r.active).reduce((a, r) => a + Number(r.amount), 0);

  return (
    <section className="rounded-3xl bg-paper p-5 ring-1 ring-line" aria-label="Recurring bills">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-bold">↻ Recurring bills</h2>
        <p className="text-sm text-muted">{fmt(monthly)}/month on autopilot</p>
      </div>
      <p className="text-sm text-muted">Rent, DStv, data, gym, tithe… They’re logged automatically on their day each month.</p>
      {recurring.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {recurring.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={Boolean(r.active)}
                  aria-label={`${r.name} active`}
                  onChange={async (e) => {
                    const v = e.target.checked;
                    setRecurring((x) => x.map((y) => (y.id === r.id ? { ...y, active: v ? 1 : 0 } : y)));
                    const res = await toggleRecurring(r.id, v);
                    if (!res.ok) toast(res.error, "error");
                  }}
                  className="size-4 accent-[#2f7a5c]"
                />
              </label>
              <span className={`flex-1 ${r.active ? "" : "text-muted line-through"}`}>
                <span className="font-semibold">{r.name}</span>
                <span className="ml-2 text-xs text-muted">{catOf(r.category).emoji} {catOf(r.category).name} · every {ordinal(r.day)}</span>
              </span>
              <span className="font-semibold tabular-nums">{fmt(Number(r.amount))}</span>
              <button
                aria-label={`Delete ${r.name}`}
                onClick={async () => {
                  if (!confirm(`Stop and delete “${r.name}”? Past expenses stay.`)) return;
                  const res = await deleteRecurring(r.id);
                  if (!res.ok) return toast(res.error, "error");
                  setRecurring((x) => x.filter((y) => y.id !== r.id));
                }}
                className="rounded-lg px-1.5 text-muted hover:text-coral"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_8rem_11rem_7rem_6rem_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await createRecurring({ ...f, day: Number(f.day) });
          if (!res.ok) return toast(res.error, "error");
          setRecurring((x) => [...x, res.data].sort((a, b) => a.day - b.day));
          setF({ name: "", amount: "", category: "", method: "transfer", day: "1" });
          toast(res.data.last_month ? `Added. First auto-log next month on the ${ordinal(res.data.day)}` : `Added. Logs on the ${ordinal(res.data.day)}`);
        }}
      >
        <input value={f.name} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} placeholder="Bill name, e.g. Rent" aria-label="Bill name" required className={`${control} col-span-2 sm:col-span-1`} />
        <input value={f.amount} onChange={(e) => setF((x) => ({ ...x, amount: e.target.value }))} placeholder="₦ amount" inputMode="decimal" aria-label="Bill amount" required className={`${control} text-right`} />
        <select value={f.category} onChange={(e) => setF((x) => ({ ...x, category: e.target.value }))} aria-label="Bill category" required className={control}>
          <option value="" disabled>Category…</option>
          {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={f.method} onChange={(e) => setF((x) => ({ ...x, method: e.target.value }))} aria-label="Bill payment method" className={control}>
          {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm text-muted">
          Day
          <input type="number" min={1} max={31} value={f.day} onChange={(e) => setF((x) => ({ ...x, day: e.target.value }))} aria-label="Day of month" className={`${control} w-14`} />
        </label>
        <button className="rounded-lg bg-forest px-4 py-1.5 text-sm font-bold text-cream">Add bill</button>
      </form>
    </section>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
