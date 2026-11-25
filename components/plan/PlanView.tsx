import { ALLOCATION_GUIDE, ASSET_CLASSES, PROFILES, analyse, type PlanRecord } from "@/lib/plan-model";

/** Read-only rendering of a financial plan (print page + coach view). Server-safe. */

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : "₦" + Math.round(n).toLocaleString("en-NG"));
const date = (d: string | null | undefined) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const freq = (f: string) => (f ? f[0].toUpperCase() + f.slice(1) : "—");

function H({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 font-display text-base font-bold">{children}</h3>;
}

function Table({ head, rows, foot }: { head: string[]; rows: (string | number)[][]; foot?: (string | number)[] }) {
  return (
    <table className="mt-2 w-full border-collapse text-sm">
      <thead>
        <tr>{head.map((h, i) => <th key={h} className={`border-b-2 border-ink/20 py-1.5 text-xs uppercase tracking-wider text-muted ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-line">
            {r.map((c, j) => <td key={j} className={`py-1.5 ${j ? "text-right tabular-nums" : ""}`}>{c}</td>)}
          </tr>
        ))}
      </tbody>
      {foot && (
        <tfoot>
          <tr>{foot.map((c, j) => <td key={j} className={`py-1.5 font-bold ${j ? "text-right tabular-nums" : ""}`}>{c}</td>)}</tr>
        </tfoot>
      )}
    </table>
  );
}

export function PlanView({ record, studentName, coachName }: { record: PlanRecord; studentName: string; coachName: string }) {
  const p = record.data;
  const a = analyse(p);
  const inv = p.investPlan;
  return (
    <article className="text-ink">
      <header className="border-b-2 border-ink pb-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-moss">The Money Circle</p>
        <h1 className="font-display text-3xl font-bold">Financial Plan</h1>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-muted">Client</dt><dd className="font-semibold">{studentName}</dd></div>
          <div><dt className="text-muted">Coach</dt><dd className="font-semibold">{coachName}</dd></div>
          <div><dt className="text-muted">Duration</dt><dd className="font-semibold">6 months · {date(p.period.start)} to {date(p.period.end)}</dd></div>
          <div><dt className="text-muted">Status</dt><dd className="font-semibold capitalize">{record.status}</dd></div>
        </dl>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-cream p-4 text-sm sm:grid-cols-4 print:bg-transparent print:ring-1 print:ring-line">
        <div><p className="text-muted">Monthly income</p><p className="font-display text-lg font-bold">{fmt(a.income)}</p></div>
        <div><p className="text-muted">Net worth</p><p className="font-display text-lg font-bold">{fmt(a.netWorth)}</p></div>
        <div><p className="text-muted">Emergency cover</p><p className="font-display text-lg font-bold">{a.efMonths === null ? "—" : `${a.efMonths.toFixed(1)} mo`}</p></div>
        <div><p className="text-muted">Debt-to-income</p><p className="font-display text-lg font-bold">{a.dti === null || !a.debtMonthly ? "—" : `${Math.round(a.dti * 100)}%`}</p></div>
      </section>

      <h2 className="mt-8 font-display text-xl font-bold">Part 1: Where you are now</h2>
      <H>A. Income</H>
      <Table head={["Source", "Monthly amount", "Notes"]} rows={p.income.filter((r) => r.label || r.amount).map((r) => [r.label, fmt(r.amount), r.note || ""])} foot={["Total monthly income", fmt(a.income), ""]} />
      <H>B. Current savings & investments</H>
      <Table head={["Account / type", "Amount", "Purpose / notes"]} rows={p.savings.filter((r) => r.label || r.amount).map((r) => [r.label, fmt(r.amount), r.note || ""])} foot={["Total saved / invested", fmt(a.saved), ""]} />
      <H>C. Liabilities</H>
      {p.debts.some((d) => d.label || d.owed) ? (
        <Table
          head={["Debt type", "Amount owed", "Monthly payment", "Interest"]}
          rows={p.debts.filter((d) => d.label || d.owed).map((d) => [d.label, fmt(d.owed), fmt(d.monthly), d.rate !== null ? `${d.rate}%` : "—"])}
          foot={["Total debt", fmt(a.debt), fmt(a.debtMonthly), ""]}
        />
      ) : (
        <p className="mt-1 text-sm text-muted">No debts recorded.</p>
      )}

      <h2 className="mt-8 font-display text-xl font-bold">Part 2: Where you want to be</h2>
      <H>A. Primary goal</H>
      <p className="mt-1 text-sm"><strong>{p.primaryGoal.goal || "—"}</strong> · target {fmt(p.primaryGoal.target)}</p>
      {p.primaryGoal.why && <p className="mt-1 text-sm italic text-muted">“{p.primaryGoal.why}”</p>}
      <H>B. Supporting goals</H>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        <li>Build an emergency fund of {fmt(p.supporting.emergencyFund)}</li>
        <li>Pay off {fmt(p.supporting.debtPayoff)} of debt</li>
        <li>Build an investment portfolio of {fmt(p.supporting.portfolio)}</li>
        <li>Launch / scale income project: {p.supporting.incomeProject || "—"}</li>
        <li>Improve credit score / financial literacy: {p.supporting.literacy ? "Yes" : "No"}</li>
      </ul>

      <h2 className="mt-8 font-display text-xl font-bold">Part 3: Action plan</h2>
      <H>A. Monthly budget allocation</H>
      <Table
        head={["Category", "Guide", "Your %", "≈ Monthly"]}
        rows={(Object.keys(ALLOCATION_GUIDE) as (keyof typeof ALLOCATION_GUIDE)[]).map((k) => [ALLOCATION_GUIDE[k].label, `${ALLOCATION_GUIDE[k].min}–${ALLOCATION_GUIDE[k].max}%`, `${p.allocation[k] ?? "—"}%`, fmt(a.income * ((p.allocation[k] ?? 0) / 100))])}
        foot={["Total", "", `${a.allocTotal}%`, fmt(a.income * (a.allocTotal / 100))]}
      />
      <H>B. Savings plan</H>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        <li>Emergency fund target: {fmt(p.savingsPlan.efTarget ?? p.supporting.emergencyFund)} by {date(p.savingsPlan.efBy)}</li>
        <li>Goal savings: {fmt(p.savingsPlan.goalAmount)} for {p.savingsPlan.goalFor || "—"} by {date(p.savingsPlan.goalBy)}</li>
        <li>PiggyVest plan: {freq(p.savingsPlan.freq)}, {fmt(p.savingsPlan.perDeposit)} per deposit {a.piggyMonthly ? `(≈ ${fmt(a.piggyMonthly)}/month)` : ""}</li>
      </ul>
      <H>C. Debt payoff plan</H>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        <li>Method: {p.debtPlan.method ? (p.debtPlan.method === "other" ? p.debtPlan.other || "Other" : freq(p.debtPlan.method)) : "—"}</li>
        <li>Monthly extra payment: {fmt(p.debtPlan.extra)}</li>
        <li>Target payoff date: {date(p.debtPlan.payoffBy)}</li>
      </ul>
      <H>D. Investment plan</H>
      <p className="mt-1 text-sm">
        Profile: <strong>{PROFILES.find((x) => x.id === inv.profile)?.label ?? "—"}</strong> · Risk tolerance {inv.riskScore ?? "—"}/10
      </p>
      <Table
        head={["Asset class", "Your allocation", "Amount"]}
        rows={ASSET_CLASSES.map((ac) => [ac.label, inv.mix[ac.key] !== null ? `${inv.mix[ac.key]}%` : "—", inv.target && inv.mix[ac.key] ? fmt((inv.target * (inv.mix[ac.key] ?? 0)) / 100) : "—"])}
        foot={["Total", `${a.mixTotal}%`, fmt(inv.target)]}
      />
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
        <li>Investment target: {fmt(inv.target)} (date: {date(inv.targetBy)})</li>
        <li>Lump sum startup capital: {fmt(inv.lumpSum)}</li>
        <li>Contributions: {freq(inv.freq)}, {fmt(inv.perContribution)} per time {a.investMonthly ? `(≈ ${fmt(a.investMonthly)}/month)` : ""}</li>
      </ul>

      <p className="mt-8 font-display italic">“A goal without a plan is just a wish.” Antoine de Saint-Exupéry</p>
      <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="border-b border-ink pb-1 font-display text-lg italic">{record.client_signature ?? " "}</p>
          <p className="mt-1 text-muted">Client · {date(record.submitted_at)}</p>
        </div>
        <div>
          <p className="border-b border-ink pb-1 font-display text-lg italic">{record.coach_signed_at ? coachName : " "}</p>
          <p className="mt-1 text-muted">{coachName} · {date(record.coach_signed_at)}</p>
        </div>
      </div>
      {record.coach_note && <p className="mt-4 rounded-xl bg-cream p-3 text-sm"><strong>Coach’s note:</strong> {record.coach_note}</p>}
    </article>
  );
}
