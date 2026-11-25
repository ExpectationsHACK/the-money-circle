import Link from "next/link";
import { all } from "@/lib/db";
import { PACKAGES } from "@/lib/packages";
import { Empty, PageHeader, StudentLink, shortDate, timeAgo } from "@/components/admin/ui";

export const metadata = { title: "Students" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; pkg?: string; sort?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const pkg = PACKAGES.some((p) => p.id === sp.pkg) ? sp.pkg! : "";
  const sort = sp.sort === "active" ? "last_seen_at DESC" : sp.sort === "name" ? "full_name" : "created_at DESC";

  const where: string[] = [];
  const args: string[] = [];
  if (q) {
    where.push("(lower(full_name) LIKE ? OR lower(email) LIKE ? OR phone LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (pkg) {
    where.push("package_id = ?");
    args.push(pkg);
  }

  const rows = await all<{ id: string; full_name: string; email: string; phone: string; package_id: string; created_at: string; last_seen_at: string | null; lessons: number; expenses: number; plan_status: string | null }>(
    `SELECT s.*, (SELECT COUNT(*) FROM lesson_progress p WHERE p.student_id = s.id) lessons,
            (SELECT COUNT(*) FROM expenses e WHERE e.student_id = s.id) expenses,
            (SELECT status FROM financial_plans f WHERE f.student_id = s.id) plan_status
     FROM students s ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${sort} LIMIT 500`,
    args,
  );

  const input = "rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-forest";

  return (
    <>
      <PageHeader eyebrow="People" title={`Students (${rows.length})`} />

      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search name, email or phone…" aria-label="Search students" className={`${input} min-w-0 flex-1`} />
        <select name="pkg" defaultValue={pkg} aria-label="Package" className={input}>
          <option value="">All packages</option>
          {PACKAGES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select name="sort" defaultValue={sp.sort ?? ""} aria-label="Sort" className={input}>
          <option value="">Newest first</option>
          <option value="active">Recently active</option>
          <option value="name">Name A–Z</option>
        </select>
        <button className="rounded-xl bg-forest px-4 py-2.5 text-sm font-bold text-cream">Filter</button>
        {(q || pkg || sp.sort) && <Link href="/admin/students" className="self-center px-2 text-sm font-semibold text-muted">Clear</Link>}
      </form>

      {rows.length === 0 ? (
        <Empty>{q || pkg ? "No students match those filters." : "No students yet. Run a demo enrollment to see one here."}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-paper ring-1 ring-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">Package</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4 font-semibold">Last active</th>
                <th className="p-4 font-semibold">Plan</th>
                <th className="p-4 text-right font-semibold">Lessons</th>
                <th className="p-4 text-right font-semibold">Expenses logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((s) => {
                const stale = !s.last_seen_at || Date.now() - new Date(s.last_seen_at).getTime() > 7 * 86400_000;
                return (
                  <tr key={s.id} className="hover:bg-cream/60">
                    <td className="max-w-[16rem] p-4"><StudentLink id={s.id} name={s.full_name} email={s.email} /></td>
                    <td className="p-4">{PACKAGES.find((p) => p.id === s.package_id)?.name}</td>
                    <td className="p-4 text-muted">{shortDate(s.created_at)}</td>
                    <td className={`p-4 ${stale ? "font-semibold text-coral" : "text-muted"}`}>{timeAgo(s.last_seen_at)}</td>
                    <td className="p-4">
                      {s.plan_status ? (
                        <Link href={`/admin/students/${s.id}/plan`} className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.plan_status === "signed" ? "bg-moss/15 text-moss" : s.plan_status === "submitted" ? "bg-gold/30 text-ink" : "bg-cream text-muted"}`}>
                          {s.plan_status === "submitted" ? "To review" : s.plan_status}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right tabular-nums">{s.lessons}</td>
                    <td className="p-4 text-right tabular-nums">{s.expenses}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
