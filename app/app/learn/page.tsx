import { requireStudent } from "@/lib/auth";
import { env } from "@/lib/env";
import { packageOf } from "@/lib/students";

export const dynamic = "force-dynamic";

const CLASSES = [
  { title: "Budgeting 101", length: "38 min", tag: "Start here", body: "Give every naira a job using the 50/30/20 rule, adapted for Nigerian realities." },
  { title: "Money Mindset Rewiring", length: "45 min", tag: "Mindset", body: "Unlearn the scarcity scripts, black-tax guilt and ‘I’m just bad with money’ stories." },
  { title: "Debt Relief Roadmap", length: "32 min", tag: "Debt", body: "Snowball vs avalanche, negotiating with lenders, and getting off loan apps for good." },
  { title: "Investing in Nigeria 101", length: "52 min", tag: "Wealth", body: "Money market funds, T-bills, mutual funds and stocks: what they are and how to start." },
  { title: "Emergency Fund Blueprint", length: "24 min", tag: "Saving", body: "How much you really need, where to keep it, and how to build it without feeling broke." },
  { title: "From Skill to Side Income", length: "41 min", tag: "Earn", body: "Package what you already know into an offer people will pay for this month." },
];

export default async function LearnPage() {
  const s = await requireStudent();
  const pkg = packageOf(s);
  const portal = env.get("ACADEMY_PORTAL_URL");
  const calls = env.get("ACADEMY_CALLS_URL");
  const communities = pkg.automation.communities.map((c) => ({ label: c.label, url: env.get(c.urlEnv) })).filter((c) => c.url);
  const hasAcademy = pkg.pillars.includes(1);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-moss">TMC Academy</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Learn &amp; heal</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="grain rounded-3xl bg-forest p-6 text-cream">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">Live every month</p>
          <h2 className="mt-2 font-display text-2xl font-bold">Money Therapy &amp; Q&amp;A</h2>
          <p className="mt-2 text-sm text-cream/75">Bring your real questions. Leave lighter. Group calls with your coach and the Circle.</p>
          {hasAcademy && calls ? (
            <a href={calls} target="_blank" className="mt-5 inline-block rounded-xl bg-gold px-4 py-2.5 text-sm font-bold text-ink">See the schedule</a>
          ) : (
            <p className="mt-5 text-sm text-cream/60">{hasAcademy ? "Schedule coming soon." : "Included with the Academy, Foundation & Wealth and Billionaire Circle."}</p>
          )}
        </section>
        <section className="rounded-3xl bg-paper p-6 ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-moss">Your circles</p>
          <h2 className="mt-2 font-display text-2xl font-bold">Community</h2>
          {communities.length ? (
            <ul className="mt-4 space-y-2">
              {communities.map((c) => (
                <li key={c.label}>
                  <a href={c.url} target="_blank" className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 text-sm font-semibold hover:bg-gold/25">
                    {c.label} <span aria-hidden>→</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">Your community invite links are in your acceptance letter.</p>
          )}
        </section>
      </div>

      <section>
        <h2 className="font-display text-xl font-bold">Masterclasses</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLASSES.map((c) => (
            <article key={c.title} className="flex flex-col rounded-3xl bg-paper p-5 ring-1 ring-line">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="rounded-full bg-cream px-2.5 py-1">{c.tag}</span>
                <span className="text-muted">{c.length}</span>
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{c.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{c.body}</p>
              {hasAcademy && portal ? (
                <a href={portal} target="_blank" className="mt-4 rounded-xl bg-forest px-4 py-2.5 text-center text-sm font-bold text-cream">Watch</a>
              ) : (
                <span className="mt-4 rounded-xl bg-cream px-4 py-2.5 text-center text-sm font-semibold text-muted">
                  {hasAcademy ? "Coming soon" : "🔒 Academy access"}
                </span>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
