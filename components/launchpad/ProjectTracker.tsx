"use client";

import { useState } from "react";
import { PRIORITIES, STATUSES, type LpProject, type LpTask, type TaskStatus } from "@/lib/launchpad-model";
import { addSale, createProject, createTask, deleteProject, deleteSale, deleteTask, updateProject, updateTask } from "@/app/app/launchpad-actions";
import { DateCell, SelectCell, TextCell, fmt, fmtCompact, toast } from "@/components/finance/cells";

const days = (a: string | null, b: string | null) => (a && b ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400_000)) : null);
const statusOf = (s: string) => STATUSES.find((x) => x.id === s) ?? STATUSES[0];

function Rollup({ p }: { p: LpProject }) {
  const done = p.tasks.filter((t) => t.status === "complete").length;
  const avg = p.tasks.length ? Math.round(p.tasks.reduce((a, t) => a + t.pct, 0) / p.tasks.length) : 0;
  const cost = p.tasks.reduce((a, t) => a + t.cost, 0);
  const est = p.tasks.reduce((a, t) => a + t.est_hours, 0);
  const act = p.tasks.reduce((a, t) => a + t.actual_hours, 0);
  const sold = p.sales.reduce((a, s) => a + s.amount, 0);
  const late = p.tasks.filter((t) => t.status !== "complete" && t.end_on && t.end_on < new Date().toISOString().slice(0, 10)).length;
  const items = [
    { k: "Progress", v: `${avg}%`, sub: `${done}/${p.tasks.length} tasks done` },
    { k: "Revenue", v: fmtCompact(sold), sub: p.revenue_target ? `of ${fmtCompact(p.revenue_target)} target` : `${p.sales.length} sale${p.sales.length === 1 ? "" : "s"}` },
    { k: "Spent", v: fmtCompact(cost), sub: sold ? `profit ${fmtCompact(sold - cost)}` : "fixed costs" },
    { k: "Hours", v: `${act}h`, sub: est ? `of ${est}h estimated` : "logged" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line sm:grid-cols-4">
        {items.map((i) => (
          <div key={i.k} className="bg-cream/60 p-3">
            <p className="text-xs font-semibold text-muted">{i.k}</p>
            <p className="font-display text-xl font-bold tabular-nums">{i.v}</p>
            <p className="text-[11px] text-muted">{i.sub}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={avg} aria-valuemin={0} aria-valuemax={100} aria-label="Project progress">
        <div className="h-full rounded-full bg-moss transition-all" style={{ width: `${avg}%` }} />
      </div>
      {p.revenue_target > 0 && (
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={Math.min(100, Math.round((sold / p.revenue_target) * 100))} aria-valuemin={0} aria-valuemax={100} aria-label="Revenue progress">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.min(100, (sold / p.revenue_target) * 100)}%` }} />
        </div>
      )}
      {late > 0 && <p className="mt-2 text-xs font-semibold text-coral">⏰ {late} task{late > 1 ? "s are" : " is"} past the end date</p>}
    </div>
  );
}

function ProjectCard({ initial, onDeleted }: { initial: LpProject; onDeleted: () => void }) {
  const [p, setP] = useState(initial);
  const [newTask, setNewTask] = useState("");
  const [sale, setSale] = useState({ date: new Date().toISOString().slice(0, 10), client: "", amount: "" });
  const [filter, setFilter] = useState<"" | TaskStatus>("");
  const [open, setOpen] = useState(true);

  const setTask = (t: LpTask) => setP((x) => ({ ...x, tasks: x.tasks.map((y) => (y.id === t.id ? t : y)) }));
  const edit = (t: LpTask, field: Parameters<typeof updateTask>[1]) => async (v: string) => {
    const r = await updateTask(t.id, field, v);
    if (r.ok) setTask(r.data);
    return r;
  };
  const tasks = filter ? p.tasks.filter((t) => t.status === filter) : p.tasks;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="rounded-3xl bg-paper ring-1 ring-line" aria-label={`Project ${p.name}`}>
      <div className="flex flex-wrap items-start gap-3 p-5 sm:p-6">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? "Collapse project" : "Expand project"} className="mt-1 rounded-lg px-1.5 text-muted hover:text-ink">
          {open ? "▾" : "▸"}
        </button>
        <div className="min-w-0 flex-1">
          <TextCell
            value={p.name}
            ariaLabel="Project name"
            className="font-display text-xl font-bold"
            onSave={async (v) => {
              const r = await updateProject(p.id, { name: v });
              if (r.ok) setP((x) => ({ ...x, name: v.trim() }));
              return r;
            }}
          />
          <TextCell
            value={p.description}
            placeholder="What are you selling, to whom? (click to add)"
            ariaLabel="Project description"
            className="text-sm text-muted"
            onSave={async (v) => {
              const r = await updateProject(p.id, { description: v });
              if (r.ok) setP((x) => ({ ...x, description: v.trim() }));
              return r;
            }}
          />
        </div>
        <div className="w-40 text-right">
          <p className="px-2 text-xs font-semibold text-muted">Revenue target</p>
          <TextCell
            value={p.revenue_target ? p.revenue_target.toLocaleString("en-NG") : ""}
            display={p.revenue_target ? fmt(p.revenue_target) : undefined}
            placeholder="Set target"
            ariaLabel="Revenue target"
            inputMode="decimal"
            align="right"
            className="font-semibold"
            onSave={async (v) => {
              const r = await updateProject(p.id, { revenue: v });
              if (r.ok) setP((x) => ({ ...x, revenue_target: v.trim() ? Number(v.replace(/[^\d.]/g, "")) * (/k$/i.test(v.trim()) ? 1000 : /m$/i.test(v.trim()) ? 1_000_000 : 1) : 0 }));
              return r;
            }}
          />
        </div>
      </div>

      <div className="px-5 pb-5 sm:px-6"><Rollup p={p} /></div>

      {open && (
        <>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 sm:px-6">
            <span className="text-sm font-bold">Tasks</span>
            <div className="flex flex-wrap gap-1">
              {[{ id: "", label: "All" }, ...STATUSES].map((s) => (
                <button key={s.id || "all"} onClick={() => setFilter(s.id as "" | TaskStatus)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filter === s.id ? "bg-forest text-cream" : "bg-cream text-muted hover:text-ink"}`}>
                  {s.label} {s.id ? `(${p.tasks.filter((t) => t.status === s.id).length})` : `(${p.tasks.length})`}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[1080px]">
              <div className="grid grid-cols-[8.5rem_5.5rem_minmax(0,1fr)_6rem_6rem_3.5rem_minmax(0,0.8fr)_6.5rem_6.5rem_4rem_4rem_2rem] gap-1 border-y border-line bg-cream/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <span className="px-2">Status</span><span className="px-2">Priority</span><span className="px-2">Task</span><span className="px-2">Start</span><span className="px-2">End</span><span className="px-1 text-right">Days</span><span className="px-2">Deliverable</span><span className="px-2 text-right">% done</span><span className="px-2 text-right">Cost</span><span className="px-1 text-right">Est h</span><span className="px-1 text-right">Act h</span><span />
              </div>
              {tasks.map((t) => {
                const st = statusOf(t.status);
                const overdue = t.status !== "complete" && t.end_on && t.end_on < today;
                return (
                  <div key={t.id} className="group grid grid-cols-[8.5rem_5.5rem_minmax(0,1fr)_6rem_6rem_3.5rem_minmax(0,0.8fr)_6.5rem_6.5rem_4rem_4rem_2rem] items-center gap-1 border-b border-line/60 px-4 py-0.5">
                    <SelectCell value={t.status} ariaLabel="Status" options={STATUSES.map((s) => ({ value: s.id, label: s.label }))} display={<span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${st.cls}`}>{st.label}</span>} onSave={edit(t, "status")} />
                    <SelectCell value={t.priority} ariaLabel="Priority" options={PRIORITIES.map((s) => ({ value: s.id, label: s.label }))} display={<span className={`text-sm font-semibold ${PRIORITIES.find((x) => x.id === t.priority)?.cls}`}>{PRIORITIES.find((x) => x.id === t.priority)?.label}</span>} onSave={edit(t, "priority")} />
                    <TextCell value={t.name} ariaLabel="Task name" className={`font-semibold ${t.status === "complete" ? "text-muted line-through" : ""}`} onSave={edit(t, "name")} />
                    {t.start_on ? <DateCell value={t.start_on} ariaLabel="Start date" onSave={edit(t, "start_on")} /> : <TextCell value="" placeholder="—" ariaLabel="Start date (YYYY-MM-DD)" onSave={edit(t, "start_on")} />}
                    {t.end_on ? (
                      <div className={overdue ? "rounded-lg ring-1 ring-coral/40" : ""}><DateCell value={t.end_on} ariaLabel="End date" onSave={edit(t, "end_on")} /></div>
                    ) : (
                      <TextCell value="" placeholder="Set end" ariaLabel="End date (YYYY-MM-DD)" onSave={edit(t, "end_on")} />
                    )}
                    <span className="px-1 text-right text-sm tabular-nums text-muted">{days(t.start_on, t.end_on) ?? "—"}</span>
                    <TextCell value={t.deliverable} placeholder="—" ariaLabel="Deliverable" className="text-sm" onSave={edit(t, "deliverable")} />
                    <div className="px-1">
                      <TextCell value={String(t.pct)} display={<span className="tabular-nums">{t.pct}%</span>} ariaLabel="Percent done" inputMode="decimal" align="right" className="text-sm font-semibold" onSave={edit(t, "pct")} />
                      <div className="mx-2 h-1 overflow-hidden rounded-full bg-cream"><div className="h-full rounded-full bg-moss" style={{ width: `${t.pct}%` }} /></div>
                    </div>
                    <TextCell value={t.cost ? t.cost.toLocaleString("en-NG") : ""} display={t.cost ? fmt(t.cost) : undefined} placeholder="₦0" ariaLabel="Fixed cost" inputMode="decimal" align="right" className="text-sm" onSave={edit(t, "cost")} />
                    <TextCell value={t.est_hours ? String(t.est_hours) : ""} placeholder="0" ariaLabel="Estimated hours" inputMode="decimal" align="right" className="text-sm" onSave={edit(t, "est_hours")} />
                    <TextCell value={t.actual_hours ? String(t.actual_hours) : ""} placeholder="0" ariaLabel="Actual hours" inputMode="decimal" align="right" className="text-sm" onSave={edit(t, "actual_hours")} />
                    <button
                      aria-label={`Delete ${t.name}`}
                      onClick={async () => {
                        if (!confirm(`Delete “${t.name}”?`)) return;
                        const r = await deleteTask(t.id);
                        if (!r.ok) return toast(r.error, "error");
                        setP((x) => ({ ...x, tasks: x.tasks.filter((y) => y.id !== t.id) }));
                      }}
                      className="rounded-lg px-1 text-muted opacity-0 transition hover:text-coral focus:opacity-100 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <form
                className="flex gap-2 px-4 py-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await createTask(p.id, newTask);
                  if (!r.ok) return toast(r.error, "error");
                  setP((x) => ({ ...x, tasks: [...x.tasks, r.data] }));
                  setNewTask("");
                }}
              >
                <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="+ New task, then press Enter" aria-label="New task name" className="w-full max-w-md rounded-lg px-2 py-1.5 text-sm outline-none placeholder:text-muted/70 focus:bg-cream" />
              </form>
            </div>
          </div>

          {/* Sales log */}
          <div className="border-t border-line p-5 sm:p-6">
            <h3 className="font-display text-base font-bold">💰 Sales log</h3>
            {p.sales.length > 0 && (
              <ul className="mt-2 divide-y divide-line text-sm">
                {p.sales.map((s) => (
                  <li key={s.id} className="group flex items-center gap-3 py-2">
                    <span className="w-24 text-muted">{new Date(s.sold_on + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
                    <span className="flex-1 font-semibold">{s.client || "Client"}</span>
                    <span className="font-semibold tabular-nums">{fmt(s.amount)}</span>
                    <button
                      aria-label="Delete sale"
                      onClick={async () => {
                        const r = await deleteSale(s.id);
                        if (!r.ok) return toast(r.error, "error");
                        setP((x) => ({ ...x, sales: x.sales.filter((y) => y.id !== s.id) }));
                      }}
                      className="px-1 text-muted opacity-0 hover:text-coral focus:opacity-100 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-[9rem_1fr_9rem_auto]"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await addSale(p.id, sale);
                if (!r.ok) return toast(r.error, "error");
                setP((x) => ({ ...x, sales: [r.data, ...x.sales] }));
                setSale((s) => ({ ...s, client: "", amount: "" }));
                toast(p.sales.length === 0 ? "🎉 Your first sale! Huge win." : `+${fmt(r.data.amount)} logged`);
              }}
            >
              <input type="date" value={sale.date} max={today} onChange={(e) => setSale((s) => ({ ...s, date: e.target.value }))} aria-label="Sale date" className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-forest" />
              <input value={sale.client} onChange={(e) => setSale((s) => ({ ...s, client: e.target.value }))} placeholder="Client name" aria-label="Client" className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-forest" />
              <input value={sale.amount} onChange={(e) => setSale((s) => ({ ...s, amount: e.target.value }))} placeholder="₦ amount" inputMode="decimal" required aria-label="Sale amount" className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-right text-sm outline-none focus:border-forest" />
              <button className="rounded-lg bg-gold px-4 py-1.5 text-sm font-bold text-ink hover:bg-gold-soft">+ Log sale</button>
            </form>
          </div>

          <div className="border-t border-line px-5 py-3 text-right sm:px-6">
            <button
              onClick={async () => {
                if (!confirm(`Delete the project “${p.name}” with all its tasks and sales? This can’t be undone.`)) return;
                const r = await deleteProject(p.id);
                if (!r.ok) return toast(r.error, "error");
                onDeleted();
              }}
              className="text-xs font-semibold text-muted hover:text-coral"
            >
              Delete project
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function ProjectTracker({ initial }: { initial: LpProject[] }) {
  const [projects, setProjects] = useState(initial);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(template: boolean) {
    setBusy(true);
    const r = await createProject({ name: name || (template ? "My LaunchPad sales project" : "New project"), template });
    setBusy(false);
    if (!r.ok) return toast(r.error, "error");
    setProjects((x) => [...x, r.data]);
    setName("");
    toast(template ? "Sales project created with 8 starter tasks 🚀" : "Project created");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Project tracker</h2>
          <p className="text-sm text-muted">Break your LaunchPad sales project into tasks, track progress, costs and hours, and log every sale.</p>
        </div>
      </div>

      {projects.map((p) => (
        <ProjectCard key={p.id} initial={p} onDeleted={() => setProjects((x) => x.filter((y) => y.id !== p.id))} />
      ))}

      <div className="rounded-3xl border-2 border-dashed border-line p-5">
        <p className="text-sm font-semibold">{projects.length ? "Start another project" : "Start your first project"}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name, e.g. Social media management" aria-label="New project name" maxLength={80} className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 py-2 text-sm outline-none focus:border-forest" />
          <button disabled={busy} onClick={() => create(true)} className="rounded-xl bg-forest px-4 py-2 text-sm font-bold text-cream hover:bg-forest-2 disabled:opacity-60">🚀 Use sales project template</button>
          <button disabled={busy} onClick={() => create(false)} className="rounded-xl px-4 py-2 text-sm font-semibold ring-1 ring-line hover:bg-cream disabled:opacity-60">Blank project</button>
        </div>
      </div>
    </div>
  );
}
