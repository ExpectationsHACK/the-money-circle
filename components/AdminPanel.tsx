"use client";

import { useEffect, useState } from "react";

type Check = { area: string; item: string; ok: boolean; optional?: boolean };
type Result = { status?: string; reference?: string; vaultUrl?: string; bookingUrl?: string; issues?: string[]; steps?: string[]; error?: string };

const field =
  "mt-1.5 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";

const KEY = "tmc-admin-secret";

export function AdminPanel({
  offers,
  prefill,
}: {
  offers: { slug: string; label: string }[];
  prefill: { ref?: string; name?: string; email?: string; phone?: string; offer?: string };
}) {
  const [secret, setSecret] = useState("");
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function unlock(s: string) {
    setAuthError("");
    const res = await fetch("/api/admin/status", { headers: { "x-admin-secret": s } });
    if (!res.ok) {
      setAuthError("Wrong admin secret.");
      try { sessionStorage.removeItem(KEY); } catch {}
      return;
    }
    try { sessionStorage.setItem(KEY, s); } catch {}
    setSecret(s);
    setChecks((await res.json()).checks);
  }

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(KEY);
      if (s) void unlock(s);
    } catch {}
  }, []);

  async function approve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!confirm(`Run onboarding for ${fd.get("fullName")} <${fd.get("email")}>? This creates their vault and emails their acceptance letter.`)) return;
    setBusy(true);
    setResult(null);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/admin/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ ...body, amountNaira: body.amountNaira || undefined, reference: body.reference || undefined }),
    });
    setResult(await res.json());
    setBusy(false);
  }

  if (!checks) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void unlock(String(new FormData(e.currentTarget).get("secret") ?? ""));
        }}
        className="mx-auto max-w-sm rounded-3xl bg-paper p-7 ring-1 ring-line"
      >
        <h1 className="font-display text-2xl font-bold">Coach console</h1>
        <label className="mt-5 block text-sm font-semibold">
          Admin secret
          <input name="secret" type="password" required autoFocus className={field} />
        </label>
        {authError && <p className="mt-3 text-sm text-coral">{authError}</p>}
        <button className="mt-5 w-full rounded-xl bg-forest px-4 py-3 font-bold text-cream">Unlock</button>
      </form>
    );
  }

  const missing = checks.filter((c) => !c.ok && !c.optional).length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <section className="rounded-3xl bg-paper p-6 ring-1 ring-line sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Manual approval</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Confirm a bank transfer</h1>
        <p className="mt-1 text-sm text-muted">
          Check your bank app first. Approving runs the full pipeline: Vault, acceptance letter, community links, ledger.
        </p>
        <form onSubmit={approve} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold sm:col-span-2">
            Full name
            <input name="fullName" required defaultValue={prefill.name} className={field} />
          </label>
          <label className="text-sm font-semibold">
            Email
            <input name="email" type="email" required defaultValue={prefill.email} className={field} />
          </label>
          <label className="text-sm font-semibold">
            Phone
            <input name="phone" required defaultValue={prefill.phone} className={field} />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Package
            <select name="offer" required defaultValue={prefill.offer} className={field}>
              {offers.map((o) => (
                <option key={o.slug} value={o.slug}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Reference <span className="font-normal text-muted">(optional)</span>
            <input name="reference" defaultValue={prefill.ref} className={field} />
          </label>
          <label className="text-sm font-semibold">
            Amount received ₦ <span className="font-normal text-muted">(optional)</span>
            <input name="amountNaira" type="number" min={0} className={field} />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Note <span className="font-normal text-muted">(optional)</span>
            <input name="note" className={field} />
          </label>
          <button disabled={busy} className="rounded-xl bg-gold px-4 py-3 font-bold text-ink disabled:opacity-60 sm:col-span-2">
            {busy ? "Onboarding… (can take ~30s)" : "Approve & onboard student"}
          </button>
        </form>

        {result && (
          <div className={`mt-6 rounded-2xl p-5 text-sm ${result.error ? "bg-coral/10" : "bg-forest/5"}`}>
            <p className="font-bold">{result.error ? "Needs attention" : result.status === "skipped" ? "Already done" : "Student onboarded 🎉"}</p>
            {result.error && <p className="mt-1 text-coral">{result.error}</p>}
            {result.steps?.length ? <ul className="mt-2 list-disc pl-5">{result.steps.map((s) => <li key={s}>{s}</li>)}</ul> : null}
            {result.issues?.length ? <ul className="mt-2 list-disc pl-5 text-coral">{result.issues.map((s) => <li key={s}>{s}</li>)}</ul> : null}
            {result.vaultUrl && <a className="mt-3 inline-block font-semibold text-forest underline" href={result.vaultUrl} target="_blank">Open vault</a>}
          </div>
        )}
      </section>

      <section className="h-fit rounded-3xl bg-paper p-6 ring-1 ring-line sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">System check</p>
        <h2 className="mt-2 font-display text-2xl font-bold">{missing === 0 ? "All systems go" : `${missing} item${missing > 1 ? "s" : ""} to configure`}</h2>
        <ul className="mt-5 space-y-2 text-sm">
          {checks.map((c) => (
            <li key={c.area + c.item} className="flex items-start gap-2.5">
              <span className={`mt-1 size-2.5 shrink-0 rounded-full ${c.ok ? "bg-moss" : c.optional ? "bg-line" : "bg-coral"}`} />
              <span>
                <span className="text-muted">{c.area}:</span> {c.item}
                {!c.ok && c.optional && <span className="text-muted"> (optional)</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
