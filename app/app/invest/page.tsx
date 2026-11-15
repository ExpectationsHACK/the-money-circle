import { requireStudent } from "@/lib/auth";
import { all } from "@/lib/db";
import { INVESTMENT_KINDS, kindLabel, naira } from "@/lib/money";
import { PILLARS } from "@/lib/packages";
import { hasPillar } from "@/lib/students";
import { ActionForm, ConfirmButton, Locked, SubmitButton } from "@/components/app/ui";
import { input } from "@/lib/styles";
import { addHolding, deleteHolding, updateHoldingValue } from "../actions";

export const dynamic = "force-dynamic";

interface Holding {
  id: string;
  name: string;
  kind: string;
  invested: number;
  current_value: number;
  updated_at: string;
}

export default async function InvestPage() {
  const s = await requireStudent();
  if (!hasPillar(s, 3))
    return <Locked title="Your portfolio" pillarName={PILLARS[3].name} body="Track your money market funds, treasury bills, mutual funds and stocks in one place: allocation, returns and growth." />;

  const rows = await all<Holding>("SELECT * FROM holdings WHERE student_id = ? ORDER BY current_value DESC", [s.id]);
  const invested = rows.reduce((a, h) => a + Number(h.invested), 0);
  const value = rows.reduce((a, h) => a + Number(h.current_value), 0);
  const gain = value - invested;
  const byKind = INVESTMENT_KINDS.map((k) => ({ ...k, v: rows.filter((h) => h.kind === k.id).reduce((a, h) => a + Number(h.current_value), 0) })).filter((k) => k.v > 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-moss">Wealth Builder</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Portfolio</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-3xl bg-forest p-5 text-cream">
          <p className="text-sm text-cream/70">Total value</p>
          <p className="mt-1 font-display text-3xl font-bold">{naira(value)}</p>
        </section>
        <section className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Total invested</p>
          <p className="mt-1 font-display text-3xl font-bold">{naira(invested)}</p>
        </section>
        <section className="rounded-3xl bg-paper p-5 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Gain / loss</p>
          <p className={`mt-1 font-display text-3xl font-bold ${gain >= 0 ? "text-moss" : "text-coral"}`}>
            {gain >= 0 ? "+" : "−"}{naira(Math.abs(gain))}
          </p>
          <p className="text-xs font-semibold text-muted">{invested ? `${((gain / invested) * 100).toFixed(1)}% overall` : "—"}</p>
        </section>
      </div>

      {byKind.length > 0 && (
        <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
          <h2 className="font-display text-lg font-bold">Allocation</h2>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full" role="img" aria-label={byKind.map((k) => `${k.label} ${Math.round((k.v / value) * 100)}%`).join(", ")}>
            {byKind.map((k) => (
              <div key={k.id} style={{ width: `${(k.v / value) * 100}%`, background: k.color }} />
            ))}
          </div>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            {byKind.map((k) => (
              <li key={k.id} className="flex items-center gap-2">
                <span className="size-3 rounded-sm" style={{ background: k.color }} />
                <span className="flex-1">{k.label}</span>
                <span className="font-semibold tabular-nums">{Math.round((k.v / value) * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-3xl bg-paper ring-1 ring-line">
        <h2 className="p-5 pb-0 font-display text-lg font-bold sm:p-6 sm:pb-0">Holdings</h2>
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-muted sm:p-6">No investments yet. Add your first one below; your coach will help you pick it on your next Money Date.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {rows.map((h) => {
              const g = Number(h.current_value) - Number(h.invested);
              return (
                <li key={h.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                  <div>
                    <p className="font-semibold">{h.name}</p>
                    <p className="text-xs text-muted">
                      {kindLabel(h.kind)} · invested {naira(Number(h.invested))} ·{" "}
                      <span className={g >= 0 ? "font-semibold text-moss" : "font-semibold text-coral"}>
                        {g >= 0 ? "+" : "−"}{naira(Math.abs(g))} ({Number(h.invested) ? ((g / Number(h.invested)) * 100).toFixed(1) : 0}%)
                      </span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ActionForm action={updateHoldingValue} resetOnSuccess={false}>
                      <input type="hidden" name="id" value={h.id} />
                      <div className="flex gap-2">
                        <input
                          name="current"
                          inputMode="decimal"
                          defaultValue={Number(h.current_value).toLocaleString("en-NG")}
                          aria-label={`Current value of ${h.name}`}
                          className={`${input} w-36 py-2 text-right text-sm tabular-nums`}
                        />
                        <SubmitButton variant="dark" pendingText="…">Update</SubmitButton>
                      </div>
                    </ActionForm>
                    <form action={deleteHolding}>
                      <input type="hidden" name="id" value={h.id} />
                      <ConfirmButton message={`Remove ${h.name}?`} className="rounded-lg px-2 py-2 text-muted hover:bg-coral/10 hover:text-coral">
                        <span aria-label="Remove">✕</span>
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6">
        <h2 className="font-display text-xl font-bold">Add an investment</h2>
        <ActionForm action={addHolding} className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold sm:col-span-2 lg:col-span-1">
              Name
              <input name="name" required maxLength={80} placeholder="FGN 364-day T-bill" className={`mt-1 ${input}`} />
            </label>
            <label className="text-sm font-semibold">
              Type
              <select name="kind" required defaultValue="" className={`mt-1 ${input}`}>
                <option value="" disabled>Choose…</option>
                {INVESTMENT_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Amount invested
              <input name="invested" inputMode="decimal" required placeholder="₦ 100k" className={`mt-1 ${input}`} />
            </label>
            <label className="text-sm font-semibold">
              Current value <span className="font-normal text-muted">(optional)</span>
              <input name="current" inputMode="decimal" placeholder="same as invested" className={`mt-1 ${input}`} />
            </label>
          </div>
          <SubmitButton className="mt-4">Add investment</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-xs text-muted">Tracking only. The Money Circle provides coaching and education, not regulated investment advice.</p>
      </section>
    </div>
  );
}
