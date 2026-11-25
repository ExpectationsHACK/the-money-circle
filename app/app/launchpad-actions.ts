"use server";

import { revalidatePath } from "next/cache";
import { requireStudent } from "@/lib/auth";
import { batch, id, now, one, run } from "@/lib/db";
import { SALES_TEMPLATE, type LpProject, type LpSale, type LpTask, type Priority, type TaskStatus } from "@/lib/launchpad";
import { parseNaira, today } from "@/lib/money";
import { hasPillar } from "@/lib/students";

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });

async function me() {
  const s = await requireStudent();
  if (!hasPillar(s, 4)) throw new Error("The project tracker is part of LaunchPad.");
  return s;
}

const STATUS: TaskStatus[] = ["on-hold", "not-started", "in-progress", "complete"];
const PRIORITY: Priority[] = ["low", "medium", "high"];
const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(new Date(d).getTime());
const clean = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
const touch = () => revalidatePath("/app", "layout");

function addDays(iso: string, d: number) {
  const x = new Date(iso + "T00:00:00");
  x.setDate(x.getDate() + d);
  return x.toISOString().slice(0, 10);
}

async function loadProject(studentId: string, projectId: string): Promise<LpProject | null> {
  const { getProjects } = await import("@/lib/launchpad");
  return (await getProjects(studentId)).find((p) => p.id === projectId) ?? null;
}

export async function createProject(input: { name: string; description?: string; revenue?: string; template?: boolean }): Promise<Result<LpProject>> {
  const s = await me();
  const name = clean(input.name, 80);
  if (!name) return fail("Name your project");
  const revenue = input.revenue ? parseNaira(input.revenue) : 0;
  const pid = id();
  const t = now();
  const start = today();
  const stmts: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: "INSERT INTO lp_projects (id, student_id, name, description, revenue_target, sort, created_at) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort),0)+1 FROM lp_projects WHERE student_id = ?), ?)",
      args: [pid, s.id, name, clean(input.description, 400), Number.isNaN(revenue) ? 0 : revenue, s.id, t],
    },
  ];
  if (input.template) {
    let cursor = start;
    SALES_TEMPLATE.forEach((task, i) => {
      const startOn = i < 2 ? addDays(start, i * 3) : cursor;
      const endOn = addDays(startOn, task.days);
      cursor = addDays(startOn, Math.max(2, Math.floor(task.days / 3)));
      stmts.push({
        sql: "INSERT INTO lp_tasks (id, project_id, student_id, name, status, priority, start_on, end_on, deliverable, est_hours, sort, created_at) VALUES (?, ?, ?, ?, 'not-started', ?, ?, ?, ?, ?, ?, ?)",
        args: [id(), pid, s.id, task.name, task.priority, startOn, endOn, task.deliverable, task.est, i, t],
      });
    });
  }
  await batch(stmts);
  touch();
  return { ok: true, data: (await loadProject(s.id, pid))! };
}

export async function updateProject(projectId: string, patch: { name?: string; description?: string; revenue?: string }): Promise<Result> {
  const s = await me();
  if (patch.name !== undefined) {
    const name = clean(patch.name, 80);
    if (!name) return fail("Name can’t be empty");
    await run("UPDATE lp_projects SET name = ? WHERE id = ? AND student_id = ?", [name, projectId, s.id]);
  }
  if (patch.description !== undefined) await run("UPDATE lp_projects SET description = ? WHERE id = ? AND student_id = ?", [clean(patch.description, 400), projectId, s.id]);
  if (patch.revenue !== undefined) {
    const v = patch.revenue.trim() ? parseNaira(patch.revenue) : 0;
    if (Number.isNaN(v) || v < 0) return fail("Enter a revenue target like 300k");
    await run("UPDATE lp_projects SET revenue_target = ? WHERE id = ? AND student_id = ?", [v, projectId, s.id]);
  }
  touch();
  return { ok: true, data: null };
}

export async function deleteProject(projectId: string): Promise<Result> {
  const s = await me();
  await batch([
    { sql: "DELETE FROM lp_tasks WHERE project_id = ? AND student_id = ?", args: [projectId, s.id] },
    { sql: "DELETE FROM lp_sales WHERE project_id = ? AND student_id = ?", args: [projectId, s.id] },
    { sql: "DELETE FROM lp_projects WHERE id = ? AND student_id = ?", args: [projectId, s.id] },
  ]);
  touch();
  return { ok: true, data: null };
}

export async function createTask(projectId: string, name: string): Promise<Result<LpTask>> {
  const s = await me();
  const n = clean(name, 160);
  if (!n) return fail("Name the task");
  const p = await one("SELECT 1 FROM lp_projects WHERE id = ? AND student_id = ?", [projectId, s.id]);
  if (!p) return fail("Project not found");
  const tid = id();
  await run(
    "INSERT INTO lp_tasks (id, project_id, student_id, name, start_on, sort, created_at) VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort),0)+1 FROM lp_tasks WHERE project_id = ?), ?)",
    [tid, projectId, s.id, n, today(), projectId, now()],
  );
  touch();
  return { ok: true, data: (await one<LpTask>("SELECT * FROM lp_tasks WHERE id = ?", [tid]))! };
}

type TaskField = "name" | "status" | "priority" | "start_on" | "end_on" | "description" | "deliverable" | "pct" | "cost" | "est_hours" | "actual_hours";

export async function updateTask(taskId: string, field: TaskField, value: string): Promise<Result<LpTask>> {
  const s = await me();
  const task = await one<LpTask>("SELECT * FROM lp_tasks WHERE id = ? AND student_id = ?", [taskId, s.id]);
  if (!task) return fail("Task not found");
  const sets: [string, string | number | null][] = [];
  switch (field) {
    case "name": {
      const v = clean(value, 160);
      if (!v) return fail("Name can’t be empty");
      sets.push(["name", v]);
      break;
    }
    case "description":
    case "deliverable":
      sets.push([field, clean(value, 400)]);
      break;
    case "status":
      if (!STATUS.includes(value as TaskStatus)) return fail("Pick a status");
      sets.push(["status", value]);
      if (value === "complete") sets.push(["pct", 100]);
      else if (task.status === "complete" && Number(task.pct) === 100) sets.push(["pct", 90]);
      break;
    case "priority":
      if (!PRIORITY.includes(value as Priority)) return fail("Pick a priority");
      sets.push(["priority", value]);
      break;
    case "start_on":
    case "end_on": {
      const v = value.trim();
      if (v && !isDate(v)) return fail("Pick a valid date");
      const start = field === "start_on" ? v : task.start_on;
      const end = field === "end_on" ? v : task.end_on;
      if (start && end && end < start) return fail("End date can’t be before the start date");
      sets.push([field, v || null]);
      break;
    }
    case "pct": {
      const v = Math.round(Number(String(value).replace("%", "")));
      if (!(v >= 0 && v <= 100)) return fail("Use 0 to 100%");
      sets.push(["pct", v]);
      if (v === 100) sets.push(["status", "complete"]);
      else if (v > 0 && task.status === "not-started") sets.push(["status", "in-progress"]);
      else if (v < 100 && task.status === "complete") sets.push(["status", "in-progress"]);
      break;
    }
    case "cost": {
      const v = value.trim() ? parseNaira(value) : 0;
      if (Number.isNaN(v) || v < 0) return fail("Enter an amount like 15k");
      sets.push(["cost", v]);
      break;
    }
    case "est_hours":
    case "actual_hours": {
      const v = value.trim() ? Number(value) : 0;
      if (!(v >= 0 && v <= 10000)) return fail("Enter hours, e.g. 2.5");
      sets.push([field, Math.round(v * 10) / 10]);
      break;
    }
    default:
      return fail("Unknown field");
  }
  await run(`UPDATE lp_tasks SET ${sets.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ? AND student_id = ?`, [...sets.map(([, v]) => v), taskId, s.id]);
  touch();
  return { ok: true, data: (await one<LpTask>("SELECT * FROM lp_tasks WHERE id = ?", [taskId]))! };
}

export async function deleteTask(taskId: string): Promise<Result> {
  const s = await me();
  await run("DELETE FROM lp_tasks WHERE id = ? AND student_id = ?", [taskId, s.id]);
  touch();
  return { ok: true, data: null };
}

export async function addSale(projectId: string, input: { date: string; client: string; amount: string; note?: string }): Promise<Result<LpSale>> {
  const s = await me();
  const p = await one("SELECT 1 FROM lp_projects WHERE id = ? AND student_id = ?", [projectId, s.id]);
  if (!p) return fail("Project not found");
  const amount = parseNaira(input.amount);
  const date = clean(input.date, 10) || today();
  if (!(amount > 0)) return fail("Enter the sale amount, e.g. 45k");
  if (!isDate(date) || date > today()) return fail("Pick a valid date (not in the future)");
  const sid = id();
  await run("INSERT INTO lp_sales (id, project_id, student_id, sold_on, client, amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    sid, projectId, s.id, date, clean(input.client, 80), amount, clean(input.note, 160), now(),
  ]);
  touch();
  return { ok: true, data: (await one<LpSale>("SELECT id, project_id, sold_on, client, amount, note FROM lp_sales WHERE id = ?", [sid]))! };
}

export async function deleteSale(saleId: string): Promise<Result> {
  const s = await me();
  await run("DELETE FROM lp_sales WHERE id = ? AND student_id = ?", [saleId, s.id]);
  touch();
  return { ok: true, data: null };
}
