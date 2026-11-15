/** Pure goal maths, safe to import from client components. */
export interface GoalLike {
  target: number;
  saved: number;
  due_on: string | null;
  created_at: string;
}

/** Monthly amount needed to reach the target by the due date, and whether progress is on pace. */
export function goalPlan(g: GoalLike): { remaining: number; monthsLeft: number | null; perMonth: number | null; pace: "done" | "ahead" | "on-track" | "behind" | "no-date" } {
  const remaining = Math.max(0, Number(g.target) - Number(g.saved));
  if (remaining === 0) return { remaining, monthsLeft: 0, perMonth: 0, pace: "done" };
  if (!g.due_on) return { remaining, monthsLeft: null, perMonth: null, pace: "no-date" };
  const due = new Date(g.due_on).getTime();
  const start = new Date(g.created_at).getTime();
  const nowT = Date.now();
  const monthsLeft = Math.max(1, Math.ceil((due - nowT) / (30.44 * 86400_000)));
  const perMonth = Math.ceil(remaining / monthsLeft / 100) * 100;
  const elapsed = Math.min(1, Math.max(0, (nowT - start) / Math.max(1, due - start)));
  const expected = Number(g.target) * elapsed;
  const actual = Number(g.saved);
  const pace = actual >= expected * 1.1 ? "ahead" : actual >= expected * 0.9 ? "on-track" : "behind";
  return { remaining, monthsLeft, perMonth, pace };
}
