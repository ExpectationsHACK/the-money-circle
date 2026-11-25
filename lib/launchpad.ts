import { all } from "./db";
import type { LpProject, LpSale, LpTask } from "./launchpad-model";

export * from "./launchpad-model";

export async function getProjects(studentId: string): Promise<LpProject[]> {
  const [projects, tasks, sales] = await Promise.all([
    all<Omit<LpProject, "tasks" | "sales">>("SELECT id, name, description, revenue_target, created_at FROM lp_projects WHERE student_id = ? ORDER BY sort, created_at", [studentId]),
    all<LpTask>("SELECT * FROM lp_tasks WHERE student_id = ? ORDER BY sort, created_at", [studentId]),
    all<LpSale>("SELECT id, project_id, sold_on, client, amount, note FROM lp_sales WHERE student_id = ? ORDER BY sold_on DESC, created_at DESC", [studentId]),
  ]);
  return projects.map((p) => ({
    ...p,
    revenue_target: Number(p.revenue_target),
    tasks: tasks.filter((t) => t.project_id === p.id).map((t) => ({ ...t, pct: Number(t.pct), cost: Number(t.cost), est_hours: Number(t.est_hours), actual_hours: Number(t.actual_hours) })),
    sales: sales.filter((s) => s.project_id === p.id).map((s) => ({ ...s, amount: Number(s.amount) })),
  }));
}
