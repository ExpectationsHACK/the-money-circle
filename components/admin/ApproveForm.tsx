"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Result = { status?: string; vaultUrl?: string; issues?: string[]; steps?: string[]; error?: string; studentId?: string };

const field = "mt-1 block w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/15";

export function ApproveForm({
  offers,
  prefill,
}: {
  offers: { slug: string; label: string }[];
  prefill: { ref?: string; name?: string; email?: string; phone?: string; offer?: string; amount?: string };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!confirm(`Onboard ${fd.get("fullName")} <${fd.get("email")}>?\n\nThis creates their account and Vault and emails their acceptance letter. Only do this once you've seen the money in your bank.`)) return;
    setBusy(true);
    setResult(null);
    const body = Object.fromEntries(fd.entries());
    const res = await fetch("/api/admin/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, amountNaira: body.amountNaira || undefined, reference: body.reference || undefined }),
    });
    setResult(await res.json().catch(() => ({ error: "Unexpected response" })));
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" key={prefill.ref ?? "new"}>
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
          {offers.map((o) => <option key={o.slug} value={o.slug}>{o.label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">
        Reference <span className="font-normal text-muted">(optional)</span>
        <input name="reference" defaultValue={prefill.ref} className={field} />
      </label>
      <label className="text-sm font-semibold">
        Amount received ₦ <span className="font-normal text-muted">(optional)</span>
        <input name="amountNaira" type="number" min={0} defaultValue={prefill.amount} className={field} />
      </label>
      <button disabled={busy} className="rounded-xl bg-gold px-4 py-3 font-bold text-ink hover:bg-gold-soft disabled:opacity-60 sm:col-span-2">
        {busy ? "Onboarding… (up to 30s)" : "Confirm payment & onboard student"}
      </button>
      {result && (
        <div className={`rounded-2xl p-4 text-sm sm:col-span-2 ${result.error ? "bg-coral/10" : "bg-moss/10"}`} role="status">
          <p className="font-bold">{result.error ? "Needs attention" : result.status === "skipped" ? "Already onboarded" : "Student onboarded 🎉"}</p>
          {result.error && <p className="mt-1 text-coral">{result.error}</p>}
          {result.steps?.length ? <ul className="mt-2 list-disc pl-5">{result.steps.map((x) => <li key={x}>{x}</li>)}</ul> : null}
          {result.issues?.length ? <ul className="mt-2 list-disc pl-5 text-coral">{result.issues.map((x) => <li key={x}>{x}</li>)}</ul> : null}
          {result.studentId && <a href={`/admin/students/${result.studentId}`} className="mt-2 inline-block font-semibold text-moss underline">Open student →</a>}
        </div>
      )}
    </form>
  );
}
