import Link from "next/link";
import { all, one } from "@/lib/db";
import { naira } from "@/lib/money";
import { PACKAGES, findOffer } from "@/lib/packages";
import { ApproveForm } from "@/components/admin/ApproveForm";
import { Empty, PageHeader, Panel, StatusPill, StudentLink, shortDate } from "@/components/admin/ui";

export const metadata = { title: "Enrollments" };

interface Row {
  reference: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  offer_slug: string;
  amount_naira: number;
  channel: string;
  status: string;
  notes: string | null;
  created_at: string;
  student_id: string | null;
}

const FILTERS = [
  { id: "", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "complete", label: "Complete" },
];

export default async function EnrollmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter = sp.status === "attention" ? "WHERE status IN ('awaiting-transfer','failed')" : sp.status === "complete" ? "WHERE status = 'complete'" : "";
  const [rows, totals] = await Promise.all([
    all<Row>(`SELECT * FROM enrollments ${filter} ORDER BY created_at DESC LIMIT 300`),
    one<{ v: number; n: number }>("SELECT COALESCE(SUM(amount_naira),0) v, COUNT(*) n FROM enrollments WHERE status = 'complete'"),
  ]);
  const offers = PACKAGES.flatMap((p) => p.offers.map((o) => ({ slug: o.slug, label: `${p.name} · ${o.label} (${naira(o.priceNaira)})` })));

  const approveHref = (r: Row) =>
    `/admin/enrollments?${new URLSearchParams({
      ref: r.reference,
      name: r.full_name ?? "",
      email: r.email,
      phone: r.phone ?? "",
      offer: r.offer_slug,
      amount: String(r.amount_naira),
      ...(sp.status ? { status: sp.status } : {}),
    })}#approve`;

  return (
    <>
      <PageHeader eyebrow="Payments" title="Enrollments">
        <p className="text-sm font-semibold text-muted">{totals?.n ?? 0} completed · {naira(Number(totals?.v ?? 0))}</p>
      </PageHeader>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={f.id ? `/admin/enrollments?status=${f.id}` : "/admin/enrollments"}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${(sp.status ?? "") === f.id ? "bg-forest text-cream" : "bg-paper ring-1 ring-line"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty>No enrollments here.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-paper ring-1 ring-line">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">Package</th>
                <th className="p-4 text-right font-semibold">Amount</th>
                <th className="p-4 font-semibold">Channel</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.reference} className={sp.ref === r.reference ? "bg-gold/15" : "hover:bg-cream/60"}>
                  <td className="max-w-[15rem] p-4">
                    {r.student_id ? <StudentLink id={r.student_id} name={r.full_name ?? r.email} email={r.email} /> : (
                      <>
                        <span className="block truncate font-semibold">{r.full_name ?? r.email}</span>
                        <span className="block truncate text-xs text-muted">{r.email}</span>
                      </>
                    )}
                    <span className="mt-0.5 block font-mono text-[10px] text-muted">{r.reference}</span>
                  </td>
                  <td className="p-4">{findOffer(r.offer_slug)?.pkg.name ?? r.offer_slug}</td>
                  <td className="p-4 text-right font-semibold tabular-nums">{naira(Number(r.amount_naira))}</td>
                  <td className="p-4 text-muted">{r.channel}</td>
                  <td className="p-4 text-muted">{shortDate(r.created_at)}</td>
                  <td className="p-4">
                    <StatusPill status={r.status} />
                    {r.status === "failed" && r.notes && <span className="mt-1 block max-w-[14rem] text-xs text-coral">{r.notes.slice(0, 120)}</span>}
                  </td>
                  <td className="p-4 text-right">
                    {r.status === "awaiting-transfer" && (
                      <Link href={approveHref(r)} className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-ink">Approve</Link>
                    )}
                    {r.status === "failed" && (
                      <Link href={approveHref(r)} className="rounded-lg bg-coral/15 px-3 py-1.5 text-xs font-bold text-coral">Retry</Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div id="approve" className="scroll-mt-6">
        <Panel title={sp.ref ? `Approve ${sp.name || sp.ref}` : "Record a bank transfer or cash payment"}>
          <p className="-mt-2 mb-5 text-sm text-muted">
            Check your bank app first. Confirming runs the full onboarding: account, Vault, acceptance letter and community links.
          </p>
          <ApproveForm
            offers={offers}
            prefill={{ ref: sp.ref, name: sp.name, email: sp.email, phone: sp.phone, offer: sp.offer, amount: sp.amount }}
          />
        </Panel>
      </div>
    </>
  );
}
