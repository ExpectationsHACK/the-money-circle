/** LaunchPad project tracker: types and constants (client-safe). */
export type TaskStatus = "on-hold" | "not-started" | "in-progress" | "complete";
export type Priority = "low" | "medium" | "high";

export interface LpTask {
  id: string;
  project_id: string;
  name: string;
  status: TaskStatus;
  priority: Priority;
  start_on: string | null;
  end_on: string | null;
  description: string;
  deliverable: string;
  pct: number;
  cost: number;
  est_hours: number;
  actual_hours: number;
  sort: number;
}

export interface LpSale {
  id: string;
  project_id: string;
  sold_on: string;
  client: string;
  amount: number;
  note: string;
}

export interface LpProject {
  id: string;
  name: string;
  description: string;
  revenue_target: number;
  created_at: string;
  tasks: LpTask[];
  sales: LpSale[];
}

export const STATUSES: { id: TaskStatus; label: string; cls: string }[] = [
  { id: "not-started", label: "Not yet started", cls: "bg-cream text-muted" },
  { id: "in-progress", label: "In progress", cls: "bg-gold/30 text-ink" },
  { id: "on-hold", label: "On hold", cls: "bg-coral/15 text-coral" },
  { id: "complete", label: "Complete", cls: "bg-moss/15 text-moss" },
];

export const PRIORITIES: { id: Priority; label: string; cls: string }[] = [
  { id: "high", label: "High", cls: "text-coral" },
  { id: "medium", label: "Medium", cls: "text-ink" },
  { id: "low", label: "Low", cls: "text-muted" },
];

/** The default breakdown for a LaunchPad sales project. */
export const SALES_TEMPLATE: { name: string; deliverable: string; priority: Priority; days: number; est: number }[] = [
  { name: "Define the offer, price and ideal client", deliverable: "One-line offer + price list", priority: "high", days: 3, est: 4 },
  { name: "Build a list of 50 prospects", deliverable: "Prospect list (name, contact, need)", priority: "high", days: 5, est: 6 },
  { name: "Create a simple portfolio / WhatsApp catalogue", deliverable: "Portfolio link or catalogue", priority: "medium", days: 5, est: 8 },
  { name: "Post proof content 3x a week", deliverable: "9 posts across 3 weeks", priority: "medium", days: 21, est: 9 },
  { name: "Outreach: 10 messages a day", deliverable: "150 conversations started", priority: "high", days: 15, est: 15 },
  { name: "Follow up every warm lead within 48 hours", deliverable: "Follow-up tracker up to date", priority: "high", days: 21, est: 6 },
  { name: "Close your first 3 paying clients", deliverable: "3 paid invoices", priority: "high", days: 30, est: 10 },
  { name: "Deliver, then collect testimonials", deliverable: "3 testimonials", priority: "medium", days: 30, est: 6 },
];

