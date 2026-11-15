import Link from "next/link";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm font-semibold text-moss">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-lg font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-3xl bg-paper p-5 ring-1 ring-line">
      <p className="text-sm font-semibold text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</p>
      {sub && <p className={`mt-1 text-xs font-semibold ${tone === "warn" ? "text-coral" : tone === "good" ? "text-moss" : "text-muted"}`}>{sub}</p>}
    </div>
  );
}

const STATUS: Record<string, string> = {
  complete: "bg-moss/15 text-moss",
  processing: "bg-gold/25 text-ink",
  failed: "bg-coral/15 text-coral",
  "awaiting-transfer": "bg-gold/30 text-ink",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[status] ?? "bg-cream"}`}>{status.replace("-", " ")}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-cream px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

/** wa.me link from a Nigerian phone number (0803… or +234…). */
export function waLink(phone: string, text: string): string | null {
  let p = phone.replace(/\D/g, "");
  if (!p) return null;
  if (p.startsWith("0")) p = "234" + p.slice(1);
  if (p.length < 11) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export function StudentLink({ id, name, email }: { id: string; name: string; email?: string }) {
  return (
    <Link href={`/admin/students/${id}`} className="group block min-w-0">
      <span className="block truncate font-semibold group-hover:text-moss group-hover:underline">{name}</span>
      {email && <span className="block truncate text-xs text-muted">{email}</span>}
    </Link>
  );
}
