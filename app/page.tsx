import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { PackageCards } from "@/components/PackageCards";
import { COMPARISON, PACKAGES, PILLARS, type Pillar } from "@/lib/packages";
import { site } from "@/lib/site";

const BIG4 = [
  { n: "01", title: "Budgeting", body: "A plan for every naira before the month starts, built around your real life, not a spreadsheet fantasy." },
  { n: "02", title: "Expense Tracking", body: "See exactly where the leaks are. Your Money Tracker turns ‘where did it go?’ into ‘I know’." },
  { n: "03", title: "Saving", body: "Automated PiggyVest targets for emergencies, rent and big goals, so saving happens without willpower." },
  { n: "04", title: "Wealth Building", body: "Mutual funds, stocks, treasury bills and money market, set up hands-on with you, for the long game." },
];

const PAINS = [
  "Salary lands, and by the 15th you’re asking where it went",
  "You’ve said ‘I’ll start saving next month’ for a year",
  "Black tax, owambe and ‘emergencies’ keep emptying the account",
  "You want to invest but don’t know where to start or who to trust",
];

const WINS = [
  "A personal Money Vault with your budget, tracker and plan in one place",
  "Monthly 1-on-1 Money Dates that keep you accountable",
  "Savings targets that grow on autopilot",
  "A real portfolio, and a plan to add new income",
];

const STEPS = [
  { t: "Pick your package", b: "Choose the tier that matches your goal: learn, organise and build, earn, or everything." },
  { t: "Pay securely", b: "Checkout with Paystack (card, transfer, USSD) in seconds, right here on the site." },
  { t: "Your Vault is built", b: "Within seconds your private Money Vault is created in Google Drive with your name on every tracker." },
  { t: "Acceptance letter lands", b: "Your official welcome from Your Money Buddy arrives with your Vault link and community access." },
  { t: "Book your Money Date", b: "Pick a time on the live calendar. The invite, video link and reminders are sent automatically." },
];

const FAQ = [
  {
    q: "Which package is right for me?",
    a: "If money stresses you out and you need to rebuild habits, start with the Academy. If you earn but it disappears, Foundation & Wealth is built for you. If you need more income, pick LaunchPad. If you want all of it, the Billionaire Circle.",
  },
  {
    q: "What happens right after I pay?",
    a: "Within a minute you’ll receive your official acceptance letter by email, with a link to your personal Money Vault, your community invite, and a link to book your first 1-on-1 session.",
  },
  {
    q: "Can I pay by bank transfer?",
    a: "Yes. Paystack checkout supports bank transfer and USSD. You can also pay into our account directly; once we confirm the transfer, your onboarding runs automatically.",
  },
  {
    q: "Is this investment advice?",
    a: "This is coaching and financial education. We teach you how the instruments work and help you set up accounts and a plan that fits your goals. You make every investment decision.",
  },
  {
    q: "Can I upgrade later?",
    a: "Absolutely. Many students start in the Academy and upgrade to Foundation & Wealth or LaunchPad once their mindset is right. Just message us.",
  },
];

function CircleVisual() {
  const items: { p: Pillar; pos: string }[] = [
    { p: 1, pos: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2" },
    { p: 2, pos: "right-0 top-1/2 -translate-y-1/2" },
    { p: 3, pos: "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2" },
    { p: 4, pos: "left-0 top-1/2 -translate-y-1/2" },
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[22rem] sm:max-w-[26rem]" aria-hidden>
      <div className="absolute inset-6 rounded-full border border-dashed border-gold/40 animate-spin-slow" />
      <div className="absolute inset-[18%] rounded-full border border-cream/15" />
      <div className="absolute inset-[30%] grid place-items-center rounded-full bg-gold text-center text-ink shadow-[0_0_80px_-10px_rgba(232,181,71,0.7)]">
        <div>
          <p className="font-display text-3xl font-bold leading-none sm:text-4xl">6</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em]">months</p>
        </div>
      </div>
      {items.map(({ p, pos }) => (
        <div key={p} className={`absolute ${pos} w-32 rounded-2xl bg-forest-2/90 p-3 text-center ring-1 ring-cream/15 backdrop-blur max-sm:w-28 max-sm:p-2`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold">Pillar {p}</p>
          <p className="mt-0.5 font-display text-sm font-semibold text-cream">{PILLARS[p].name}</p>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* HERO */}
        <section className="grain relative overflow-hidden bg-forest pb-24 pt-32 text-cream sm:pt-40">
          <div className="pointer-events-none absolute -right-40 -top-40 size-[36rem] rounded-full bg-moss/30 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                <span className="size-1.5 rounded-full bg-gold" /> Money coaching for Nigerians who are done guessing
              </p>
              <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Stop leaking money.
                <br />
                <span className="text-gold">Start building wealth</span> on purpose.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/75">
                The Money Circle is a 6-month, hands-on coaching programme that gives you a plan for every naira, a savings
                system on autopilot, a real investment portfolio, and the accountability to actually stick with it.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <a href="#packages" className="rounded-2xl bg-gold px-7 py-4 text-center font-bold text-ink transition hover:bg-gold-soft">
                  Find my package
                </a>
                {site.freeCommunityUrl ? (
                  <a href={site.freeCommunityUrl} className="rounded-2xl border border-cream/25 px-7 py-4 text-center font-semibold transition hover:bg-white/5">
                    Join the free community
                  </a>
                ) : (
                  <a href="#system" className="rounded-2xl border border-cream/25 px-7 py-4 text-center font-semibold transition hover:bg-white/5">
                    See the Big 4 System
                  </a>
                )}
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-cream/15 pt-6">
                {[
                  ["4", "pillars of money mastery"],
                  ["1-on-1", "monthly Money Dates"],
                  ["Your", "own private Money Vault"],
                ].map(([k, v]) => (
                  <div key={v}>
                    <dt className="font-display text-2xl font-bold text-gold">{k}</dt>
                    <dd className="mt-1 text-xs leading-snug text-cream/60">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="py-10">
              <CircleVisual />
            </div>
          </div>
        </section>

        {/* BEFORE / AFTER */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-paper p-8 ring-1 ring-line">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">Sound familiar?</p>
              <ul className="mt-5 space-y-4">
                {PAINS.map((p) => (
                  <li key={p} className="flex gap-3 text-lg leading-snug">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-coral" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-forest p-8 text-cream">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Inside the Circle</p>
              <ul className="mt-5 space-y-4">
                {WINS.map((p) => (
                  <li key={p} className="flex gap-3 text-lg leading-snug">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-gold" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* BIG 4 */}
        <section id="system" className="scroll-mt-10 bg-paper py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">The Big 4 System</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                Four habits. One system. A completely different bank balance.
              </h2>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-line ring-1 ring-line sm:grid-cols-2 lg:grid-cols-4">
              {BIG4.map((b) => (
                <div key={b.n} className="bg-paper p-7">
                  <p className="font-display text-5xl font-bold text-gold">{b.n}</p>
                  <h3 className="mt-6 font-display text-xl font-bold">{b.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{b.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ECOSYSTEM */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">The ecosystem</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Learn. Organise. Build. Earn.</h2>
            </div>
            <p className="text-lg leading-relaxed text-muted">
              Every package is built from four pillars. Pick the one that solves today’s problem, then upgrade into the next
              when you’re ready. Nobody pays for what they don’t need.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as Pillar[]).map((p) => (
              <div key={p} className="rounded-3xl bg-paper p-6 ring-1 ring-line">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-full bg-forest font-display font-bold text-gold">{p}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{PILLARS[p].short}</span>
                </div>
                <h3 className="mt-5 font-display text-xl font-bold">{PILLARS[p].name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{PILLARS[p].blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PACKAGES */}
        <section id="packages" className="scroll-mt-10 bg-cream pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Packages</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Which one is you?</h2>
              <p className="mt-4 text-lg text-muted">
                “I just need to earn more” → LaunchPad. “I make money but spend it all” → Foundation &amp; Wealth.
              </p>
            </div>
            <div className="mt-14">
              <PackageCards />
            </div>

            {/* Comparison */}
            <div className="mt-20 overflow-x-auto rounded-3xl bg-paper ring-1 ring-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <caption className="sr-only">Package comparison</caption>
                <thead>
                  <tr className="border-b border-line">
                    <th className="p-5 font-display text-base font-bold">Compare</th>
                    {PACKAGES.map((p) => (
                      <th key={p.id} className={`p-5 font-display text-base font-bold ${p.vip ? "text-forest" : ""}`}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((row) => (
                    <tr key={row.feature} className="border-b border-line last:border-0">
                      <th scope="row" className="p-5 font-medium text-muted">{row.feature}</th>
                      {PACKAGES.map((p) => {
                        const v = row.values[p.id];
                        return (
                          <td key={p.id} className="p-5">
                            {v === "yes" ? (
                              <span className="inline-grid size-6 place-items-center rounded-full bg-forest text-gold" aria-label="Included">✓</span>
                            ) : v === "—" ? (
                              <span className="text-line" aria-label="Not included">—</span>
                            ) : (
                              <span className="font-medium">{v}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="scroll-mt-10 bg-forest py-24 text-cream">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">How enrollment works</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Pay at breakfast. Fully onboarded before your coffee cools.
            </h2>
            <ol className="mt-14 grid gap-4 md:grid-cols-5">
              {STEPS.map((s, i) => (
                <li key={s.t} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                  <span className="font-display text-sm font-bold text-gold">Step {i + 1}</span>
                  <h3 className="mt-3 font-display text-lg font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cream/65">{s.b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-10 mx-auto max-w-3xl px-4 py-24 sm:px-6">
          <h2 className="text-center font-display text-4xl font-bold tracking-tight">Questions, answered</h2>
          <div className="mt-10 divide-y divide-line rounded-3xl bg-paper ring-1 ring-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold">
                  {f.q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream text-forest transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="grain mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-ink px-6 py-16 text-center text-cream sm:px-16">
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Six months from now, you’ll wish you started today.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-cream/70">
              Your Vault, your plan and your first Money Date are one checkout away.
            </p>
            <Link href="/enroll/foundation-wealth" className="mt-9 inline-block rounded-2xl bg-gold px-8 py-4 font-bold text-ink transition hover:bg-gold-soft">
              Secure your spot
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
