"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Bucket, Category, Income } from "@/lib/finance";
import {
  addIncome,
  applyBudgetTemplate,
  archiveCategory,
  createCategory,
  deleteIncome,
  saveMonthNotes,
  setPlanned,
  setStartBalance,
  updateCategory,
  updateIncome,
} from "@/app/app/finance-actions";
import { Meter, SelectCell, TextCell, fmt, fmtCompact, toast } from "./cells";

const BUCKETS: { id: Bucket; label: string; guide: number; hint: string }[] = [
  { id: "needs", label: "Needs", guide: 50, hint: "Bills you must pay to live and work" },
  { id: "wants", label: "Wants", guide: 30, hint: "Lifestyle, fun and nice-to-haves" },
  { id: "savings", label: "Savings & debt", guide: 20, hint: "Future you: saving, investing, clearing debt" },
];

const n = (v: string | number) => v.toLocaleString("en-NG");

export function BudgetSheet(props: {
  month: string;
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  thisMonthHref: string | null;
  categories: Category[];
  planned: Record<string, number>;
  spent: Record<string, number>;
  incomes: Income[];
  notes: string;
  canCopyLast: boolean;
  startBalance: number | null;
  suggestedStart: number | null;
}) {
  const { month } = props;
  const [cats, setCats] = useState(props.categories);
  const [planned, setPlannedState] = useState(props.planned);
  const [incomes, setIncomes] = useState(props.incomes);
  const [notes, setNotes] = useState(props.notes);
  const [newIncome, setNewIncome] = useState({ source: "", amount: "" });
  const [adding, setAdding] = useState<Bucket | null>(null);
  const [newCat, setNewCat] = useState({ name: "", emoji: "" });
  const [busy, setBusy] = useState(false);
  const [startBal, setStartBal] = useState<number | null>(props.startBalance);

  const income = incomes.reduce((a, i) => a + Number(i.amount), 0);
  const received = incomes.filter((i) => i.received).reduce((a, i) => a + Number(i.amount), 0);
  const totalPlanned = cats.reduce((a, c) => a + (planned[c.key] ?? 0), 0);
  const totalSpent = Object.values(props.spent).reduce((a, v) => a + v, 0);
  const toAssign = income - totalPlanned;
  const endBal = startBal === null ? null : startBal + received - totalSpent;
  const net = received - totalSpent;

  const byBucket = useMemo(
    () =>
      BUCKETS.map((b) => {
        const rows = cats.filter((c) => c.bucket === b.id);
        const p = rows.reduce((a, c) => a + (planned[c.key] ?? 0), 0);
        const s = rows.reduce((a, c) => a + (props.spent[c.key] ?? 0), 0);
        return { ...b, rows, planned: p, spent: s };
      }),
    [cats, planned, props.spent],
  );

  // Spending against categories that were archived / deleted still has to show up somewhere.
  const orphanSpent = Object.entries(props.spent).filter(([k]) => !cats.some((c) => c.key === k));

  async function template(t: "503020" | "copy" | "clear") {
    const msg =
      t === "503020" ? "Fill this month using the 50/30/20 rule? This replaces your planned amounts." : t === "copy" ? "Replace this month’s plan with last month’s?" : "Clear every planned amount for this month?";
    if (!confirm(msg)) return;
    setBusy(true);
    const r = await applyBudgetTemplate(month, t);
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    setPlannedState(r.data);
    toast(t === "clear" ? "Plan cleared" : "Budget filled in ✨");
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-moss">📒 Budget</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">{props.monthLabel}</h1>
        </div>
        <nav className="flex items-center gap-1 rounded-xl bg-paper p-1 ring-1 ring-line" aria-label="Month">
          <Link href={props.prevHref} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream" aria-label="Previous month">←</Link>
          {props.thisMonthHref && <Link href={props.thisMonthHref} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream">Today</Link>}
          <Link href={props.nextHref} className="rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-cream" aria-label="Next month">→</Link>
        </nav>
      </div>

      {/* Summary callout */}
      <section className="grid gap-px overflow-hidden rounded-3xl bg-line ring-1 ring-line sm:grid-cols-4" aria-label="Month summary">
        {[
          { label: "Income", value: fmt(income), sub: income ? `${fmt(received)} received` : "Add your income below" },
          { label: "Planned", value: fmt(totalPlanned), sub: income ? `${Math.round((totalPlanned / income) * 100)}% of income` : "—" },
          { label: "Spent", value: fmt(totalSpent), sub: totalPlanned ? `${Math.round((totalSpent / totalPlanned) * 100)}% of plan` : "—" },
        ].map((x) => (
          <div key={x.label} className="bg-paper p-5">
            <p className="text-sm font-semibold text-muted">{x.label}</p>
            <p className="mt-1 font-display text-2xl font-bold tabular-nums">{x.value}</p>
            <p className="mt-0.5 text-xs text-muted">{x.sub}</p>
          </div>
        ))}
        <div className={`p-5 ${toAssign === 0 && income > 0 ? "bg-moss text-cream" : toAssign < 0 ? "bg-coral/10" : "bg-gold/20"}`}>
          <p className={`text-sm font-semibold ${toAssign === 0 && income > 0 ? "text-cream/80" : "text-muted"}`}>Left to assign</p>
          <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${toAssign < 0 ? "text-coral" : ""}`}>{fmt(toAssign)}</p>
          <p className={`mt-0.5 text-xs ${toAssign === 0 && income > 0 ? "text-cream/80" : toAssign < 0 ? "font-semibold text-coral" : "text-muted"}`}>
            {income === 0 ? "Start with your income" : toAssign === 0 ? "Every naira has a job ✨" : toAssign > 0 ? "Give these naira a job" : "You’ve planned more than you earn"}
          </p>
        </div>
      </section>

      {/* Money on hand: start → end balance (like the Money Tracker sheet) */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl bg-paper p-5 ring-1 ring-line" aria-label="Start and end balance">
        <div className="w-40">
          <p className="px-2 text-xs font-semibold text-muted">Start balance</p>
          <TextCell
            value={startBal === null ? "" : n(startBal)}
            display={startBal === null ? undefined : fmt(startBal)}
            placeholder="Set it"
            ariaLabel="Start balance (money on hand at the start of the month)"
            inputMode="decimal"
            className="font-display text-xl font-bold"
            onSave={async (v) => {
              const r = await setStartBalance(month, v);
              if (r.ok) setStartBal(r.data);
              return r;
            }}
          />
          {startBal === null && props.suggestedStart !== null && (
            <button
              type="button"
              onClick={async () => {
                const r = await setStartBalance(month, String(props.suggestedStart));
                if (r.ok) setStartBal(r.data);
                else toast(r.error, "error");
              }}
              className="px-2 text-xs font-semibold text-moss underline"
            >
              Use last month’s end: {fmt(props.suggestedStart)}
            </button>
          )}
        </div>
        <p className="text-sm text-muted">
          <span className="font-semibold text-moss">+ {fmt(received)}</span> received <span className="mx-1">·</span>
          <span className="font-semibold text-coral">− {fmt(totalSpent)}</span> spent
        </p>
        <div className="ml-auto text-right">
          <p className="text-xs font-semibold text-muted">End balance</p>
          <p className="font-display text-xl font-bold tabular-nums">{endBal === null ? "—" : fmt(endBal)}</p>
          <p className={`text-xs font-semibold ${net >= 0 ? "text-moss" : "text-coral"}`}>
            {net >= 0 ? "▲ Saved" : "▼ Spent"} {fmt(Math.abs(net))} this month
            {startBal ? ` (${net >= 0 ? "+" : "−"}${Math.abs(Math.round((net / Math.abs(startBal)) * 100))}%)` : ""}
          </p>
        </div>
      </section>

      {/* 50/30/20 split */}
      {income > 0 && totalPlanned > 0 && (
        <section className="rounded-3xl bg-paper p-5 ring-1 ring-line" aria-label="Needs, wants and savings split">
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {byBucket.map((b) => (
              <div
                key={b.id}
                title={`${b.label}: ${fmt(b.planned)} (${Math.round((b.planned / income) * 100)}%)`}
                className={b.id === "needs" ? "bg-forest" : b.id === "wants" ? "bg-gold" : "bg-moss"}
                style={{ width: `${(b.planned / Math.max(income, totalPlanned)) * 100}%` }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
            {byBucket.map((b) => {
              const share = Math.round((b.planned / income) * 100);
              const off = b.id === "savings" ? share < b.guide - 5 : share > b.guide + 5;
              return (
                <div key={b.id}>
                  <p className="flex items-center gap-1.5 font-semibold">
                    <span className={`size-2.5 rounded-sm ${b.id === "needs" ? "bg-forest" : b.id === "wants" ? "bg-gold" : "bg-moss"}`} aria-hidden />
                    {b.label}
                  </p>
                  <p className="font-display text-xl font-bold tabular-nums">{share}%</p>
                  <p className={`text-xs ${off ? "font-semibold text-coral" : "text-muted"}`}>
                    guide {b.guide}%{off ? (b.id === "savings" ? ": try to save more" : ": a bit high") : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Income table */}
      <section className="rounded-3xl bg-paper ring-1 ring-line" aria-labelledby="income-h">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-6">
          <h2 id="income-h" className="font-display text-lg font-bold">💰 Income</h2>
          <span className="text-sm font-semibold tabular-nums text-muted">{fmt(income)}</span>
        </div>
        <div className="mt-3 px-2 sm:px-3">
          <div className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.75rem_1.75rem] sm:grid-cols-[1fr_8.5rem_5.5rem_2rem] items-center gap-1 border-b border-line px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Source</span>
            <span className="text-right">Amount</span>
            <span className="text-center"><span className="hidden sm:inline">Received</span><span className="sm:hidden" aria-label="Received">✓</span></span>
            <span />
          </div>
          {incomes.map((inc) => (
            <div key={inc.id} className="group grid grid-cols-[minmax(0,1fr)_6.5rem_2.75rem_1.75rem] sm:grid-cols-[1fr_8.5rem_5.5rem_2rem] items-center gap-1 border-b border-line/60 py-1">
              <TextCell
                value={inc.source}
                ariaLabel="Income source"
                className="font-semibold"
                onSave={async (v) => {
                  const r = await updateIncome(inc.id, { source: v });
                  if (r.ok) setIncomes((x) => x.map((i) => (i.id === inc.id ? r.data : i)));
                  return r;
                }}
              />
              <TextCell
                value={n(Number(inc.amount))}
                display={fmt(Number(inc.amount))}
                ariaLabel={`${inc.source} amount`}
                inputMode="decimal"
                align="right"
                onSave={async (v) => {
                  const r = await updateIncome(inc.id, { amount: v });
                  if (r.ok) setIncomes((x) => x.map((i) => (i.id === inc.id ? r.data : i)));
                  return r;
                }}
              />
              <label className="flex justify-center">
                <input
                  type="checkbox"
                  checked={Boolean(inc.received)}
                  aria-label={`${inc.source} received`}
                  onChange={async (e) => {
                    const val = e.target.checked;
                    setIncomes((x) => x.map((i) => (i.id === inc.id ? { ...i, received: val ? 1 : 0 } : i)));
                    const r = await updateIncome(inc.id, { received: val });
                    if (!r.ok) toast(r.error, "error");
                  }}
                  className="size-4 cursor-pointer accent-[#2f7a5c]"
                />
              </label>
              <button
                type="button"
                aria-label={`Delete ${inc.source}`}
                onClick={async () => {
                  if (!confirm(`Remove “${inc.source}”?`)) return;
                  const r = await deleteIncome(inc.id);
                  if (r.ok) setIncomes((x) => x.filter((i) => i.id !== inc.id));
                  else toast(r.error, "error");
                }}
                className="rounded-lg p-1 text-muted opacity-0 transition hover:text-coral focus:opacity-100 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
          <form
            className="grid grid-cols-[minmax(0,1fr)_6.5rem_2.75rem_1.75rem] sm:grid-cols-[1fr_8.5rem_5.5rem_2rem] items-center gap-1 py-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await addIncome(month, newIncome.source || "Income", newIncome.amount);
              if (!r.ok) return toast(r.error, "error");
              setIncomes((x) => [...x, r.data]);
              setNewIncome({ source: "", amount: "" });
            }}
          >
            <input
              value={newIncome.source}
              onChange={(e) => setNewIncome((x) => ({ ...x, source: e.target.value }))}
              placeholder="+ Add income (salary, side hustle…)"
              aria-label="New income source"
              className="rounded-lg px-2 py-1.5 text-sm outline-none placeholder:text-muted/70 focus:bg-cream"
            />
            <input
              value={newIncome.amount}
              onChange={(e) => setNewIncome((x) => ({ ...x, amount: e.target.value }))}
              placeholder="₦ amount"
              inputMode="decimal"
              aria-label="New income amount"
              className="rounded-lg px-2 py-1.5 text-right text-sm tabular-nums outline-none placeholder:text-muted/70 focus:bg-cream"
            />
            <button className="col-span-2 rounded-lg bg-cream px-2 py-1.5 text-xs font-bold hover:bg-gold/30" disabled={!newIncome.amount}>
              Add
            </button>
          </form>
        </div>
      </section>

      {/* Budget table */}
      <section className="rounded-3xl bg-paper ring-1 ring-line" aria-labelledby="plan-h">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <h2 id="plan-h" className="font-display text-lg font-bold">🗂 Plan &amp; track</h2>
          <div className="flex flex-wrap gap-1.5">
            <button disabled={busy} onClick={() => template("503020")} className="rounded-lg bg-gold/25 px-3 py-1.5 text-xs font-bold hover:bg-gold/40">✨ 50/30/20</button>
            {props.canCopyLast && (
              <button disabled={busy} onClick={() => template("copy")} className="rounded-lg bg-cream px-3 py-1.5 text-xs font-bold hover:bg-line">⧉ Copy last month</button>
            )}
            {totalPlanned > 0 && (
              <button disabled={busy} onClick={() => template("clear")} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-cream">Clear</button>
            )}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto px-2 pb-3 sm:px-3">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[2.2rem_1fr_8rem_7rem_8rem_5.5rem] items-center gap-1 border-b border-line px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span />
              <span>Category</span>
              <span className="text-right">Planned</span>
              <span className="text-right">Spent</span>
              <span className="text-right">Left</span>
              <span />
            </div>

            {byBucket.map((b) => (
              <div key={b.id}>
                <div className="mt-3 flex items-baseline justify-between gap-2 rounded-xl bg-cream/70 px-3 py-2">
                  <p className="text-sm">
                    <span className="font-display font-bold">{b.label}</span>
                    <span className="ml-2 hidden text-xs text-muted sm:inline">{b.hint}</span>
                  </p>
                  <p className="text-xs font-semibold tabular-nums text-muted">
                    {fmtCompact(b.spent)} of {fmtCompact(b.planned)}
                  </p>
                </div>

                {b.rows.map((c) => {
                  const p = planned[c.key];
                  const s = props.spent[c.key] ?? 0;
                  const left = (p ?? 0) - s;
                  const over = p !== undefined && s > p;
                  return (
                    <div key={c.key} className="group grid grid-cols-[2.2rem_1fr_8rem_7rem_8rem_5.5rem] items-center gap-1 border-b border-line/60 py-0.5">
                      <TextCell
                        value={c.emoji}
                        ariaLabel={`${c.name} icon`}
                        className="px-1 text-center text-lg"
                        onSave={async (v) => {
                          const r = await updateCategory(c.key, { emoji: v });
                          if (r.ok) setCats((x) => x.map((k) => (k.key === c.key ? { ...k, emoji: v.trim() || "🏷️" } : k)));
                          return r;
                        }}
                      />
                      <div className="min-w-0">
                        <TextCell
                          value={c.name}
                          ariaLabel="Category name"
                          className="font-semibold"
                          onSave={async (v) => {
                            const r = await updateCategory(c.key, { name: v });
                            if (r.ok) setCats((x) => x.map((k) => (k.key === c.key ? { ...k, name: v.trim() } : k)));
                            return r;
                          }}
                        />
                        <div className="px-2 pb-1"><Meter value={s} max={p ?? 0} over={over} /></div>
                      </div>
                      <TextCell
                        value={p !== undefined ? n(p) : ""}
                        display={p !== undefined ? fmt(p) : undefined}
                        placeholder="₦0"
                        ariaLabel={`Planned for ${c.name}`}
                        inputMode="decimal"
                        align="right"
                        onSave={async (v) => {
                          const r = await setPlanned(month, c.key, v);
                          if (r.ok)
                            setPlannedState((x) => {
                              const y = { ...x };
                              if (r.data === null) delete y[c.key];
                              else y[c.key] = r.data;
                              return y;
                            });
                          return r;
                        }}
                      />
                      <Link
                        href={`/app/expenses?m=${month}&cat=${encodeURIComponent(c.key)}`}
                        className="rounded-lg px-2 py-1.5 text-right tabular-nums text-muted hover:bg-cream hover:text-ink"
                        aria-label={`See ${c.name} expenses`}
                      >
                        {fmt(s)}
                      </Link>
                      <span className={`px-2 text-right font-semibold tabular-nums ${over ? "text-coral" : p === undefined ? "text-muted/50" : left === 0 ? "text-muted" : "text-moss"}`}>
                        {p === undefined ? "—" : over ? `−${fmt(-left)}` : fmt(left)}
                      </span>
                      <div className="flex justify-end opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
                        <SelectCell
                          value={c.bucket}
                          ariaLabel={`Move ${c.name} to group`}
                          display={<span className="text-xs">⇄</span>}
                          options={BUCKETS.map((x) => ({ value: x.id, label: `Move to ${x.label}` }))}
                          onSave={async (v) => {
                            const r = await updateCategory(c.key, { bucket: v as Bucket });
                            if (r.ok) setCats((x) => x.map((k) => (k.key === c.key ? { ...k, bucket: v as Bucket } : k)));
                            return r;
                          }}
                          className="w-8"
                        />
                        <button
                          type="button"
                          aria-label={`Hide ${c.name}`}
                          title="Hide category (history is kept)"
                          onClick={async () => {
                            if (!confirm(`Hide “${c.name}” from your budget? Past expenses keep their history.`)) return;
                            const r = await archiveCategory(c.key, true);
                            if (!r.ok) return toast(r.error, "error");
                            setCats((x) => x.filter((k) => k.key !== c.key));
                            toast(`“${c.name}” hidden`);
                          }}
                          className="rounded-lg px-2 py-1.5 text-xs text-muted hover:text-coral"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}

                {adding === b.id ? (
                  <form
                    className="grid grid-cols-[2.2rem_1fr_auto] items-center gap-1 py-1.5"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const r = await createCategory({ name: newCat.name, emoji: newCat.emoji, bucket: b.id });
                      if (!r.ok) return toast(r.error, "error");
                      setCats((x) => [...x, r.data]);
                      setNewCat({ name: "", emoji: "" });
                      setAdding(null);
                      toast(`“${r.data.name}” added`);
                    }}
                  >
                    <input value={newCat.emoji} onChange={(e) => setNewCat((x) => ({ ...x, emoji: e.target.value }))} placeholder="🏷️" aria-label="New category icon" maxLength={8} className="rounded-lg bg-cream px-1 py-1.5 text-center text-lg outline-none" />
                    <input autoFocus value={newCat.name} onChange={(e) => setNewCat((x) => ({ ...x, name: e.target.value }))} placeholder="Category name, e.g. Gym" aria-label="New category name" maxLength={40} className="rounded-lg bg-cream px-2 py-1.5 text-sm outline-none" />
                    <div className="flex gap-1">
                      <button className="rounded-lg bg-forest px-3 py-1.5 text-xs font-bold text-cream">Add</button>
                      <button type="button" onClick={() => setAdding(null)} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-muted">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setAdding(b.id)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-cream hover:text-ink">
                    + New category
                  </button>
                )}
              </div>
            ))}

            {orphanSpent.length > 0 && (
              <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-xs text-muted">
                Also spent in hidden categories: {orphanSpent.map(([, v]) => fmt(v)).join(" + ")}.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Monthly notes */}
      <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
        <h2 className="font-display text-lg font-bold">📝 Month notes</h2>
        <p className="text-sm text-muted">Wins, lessons, what to change next month. Saved automatically.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={async () => {
            if (notes === props.notes) return;
            const r = await saveMonthNotes(month, notes);
            if (r.ok) toast("Notes saved");
            else toast(r.error, "error");
          }}
          rows={4}
          placeholder="e.g. Owambe season, so I moved ₦15k from Wants to Social. Cooked at home 4 days a week 🎉"
          aria-label="Month notes"
          className="mt-3 block w-full resize-y rounded-xl border border-line bg-cream/40 px-4 py-3 text-base leading-relaxed outline-none focus:border-forest focus:bg-paper"
        />
      </section>
    </div>
  );
}
