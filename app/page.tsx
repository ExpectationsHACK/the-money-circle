import Link from "next/link";
import { Footer, Header } from "@/components/Chrome";
import { PackageCards } from "@/components/PackageCards";
import { COMPARISON, PACKAGES, PILLARS, type Pillar } from "@/lib/packages";
import { site } from "@/lib/site";
import { publishedTestimonials } from "@/lib/testimonials";

// Testimonials are edited in the coach console; refresh the page at least every minute.
export const revalidate = 60;

type Big4Item = { n: string; title: string; hook: string; rows: { k: string; v: string }[] };

const BIG4: Big4Item[] = [
  {
    n: "01",
    title: "Budgeting",
    hook: "Tell your money where to go instead of wondering where it went!",
    rows: [
      { k: "What it is", v: "A monthly, one-on-one “Money Date” with your coach." },
      { k: "What we do", v: "We plan your next month’s spending. Every naira gets a job (bills, fun, savings, investments) in order of priority." },
      { k: "The result", v: "You spend with intention, not guilt. No more financial surprises." },
    ],
  },
  {
    n: "02",
    title: "Expense Tracking",
    hook: "You can’t fix what you don’t track! We keep you in charge of your money.",
    rows: [
      { k: "What it is", v: "Daily or weekly expense logging in your Billionaire Money Tracker." },
      { k: "What we do", v: "You record every kobo spent, and we compare it to your budget every week." },
      { k: "The result", v: "You see your spending patterns clearly, stop leaking money and stay 100% in control." },
    ],
  },
  {
    n: "03",
    title: "Saving",
    hook: "Save for the sunny days first, then the rainy days!",
    rows: [
      { k: "What it is", v: "A locked, individual target savings plan on PiggyVest, a secure and trusted savings platform." },
      { k: "How it works", v: "You choose the frequency (daily, weekly or monthly) and the amount, and we hold you to it. We set up a savings target group for your goal (a trip, a gadget, freedom) that only you and your coach can see." },
      { k: "Emergency savings", v: "Optional: a flexible pot for unexpected expenses that you can reach whenever you need it." },
    ],
  },
  {
    n: "04",
    title: "Wealth Building",
    hook: "Make your money work while you sleep. Your paycheck is just the starting line.",
    rows: [
      { k: "Part 1: The Investment Lab", v: "Get trained on the stock market, money market, treasury bills, mutual funds and the other tools the rich use. Then we help you set up your first (or next) portfolio around your goals and risk appetite." },
      { k: "Part 2: The LaunchPad Project", v: "A hands-on, guided project to launch your own income stream. We turn your idea or skill into a step-by-step action plan and stay with you until your first sale, first client or first profit." },
    ],
  },
];

const PAINS = [
  "Your money disappears and you don’t know where it went",
  "You don’t spend with a plan, and you spend recklessly",
  "You only think of spending money, never of multiplying it",
  "Your savings are always ‘saving you’, so they never grow",
  "You have no long-term plan to build wealth",
  "You’re constantly stressed about money, and secretly tired of your money life",
];

const FOR_YOU = [
  "You’re ready to put in the work",
  "You want a clear, structured plan",
  "You need a financial accountability partner",
  "You’re committed to showing up: checking DMs, tracking expenses, joining calls",
];

const NOT_FOR_YOU = [
  "You want a get-rich-quick scheme",
  "You won’t track your spending or follow a budget",
  "You ghost accountability partners",
  "You expect magic without action",
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
  { t: "Your welcome letter lands", b: "A personal welcome from your Money Buddy arrives with your onboarding kit and a one-tap sign-in." },
  { t: "Open your vault, fill your plan", b: "Your private vault holds your financial plan, money tracker, savings goals and LaunchPad tracker." },
  { t: "Book your Money Date", b: "Once your plan is in, pick a time for your first one-on-one session to review it together." },
];

const FAQ = [
  {
    q: "Is The Money Circle a course?",
    a: "No. Knowledge alone doesn’t change your money game. We are a hands-on finance coaching community: we sit with you, work through your numbers, build your systems and execute your money plans together.",
  },
  {
    q: "Which package is right for me?",
    a: "If money stresses you out and you need to rebuild habits, start with the Academy. If you earn but it disappears, Foundation & Wealth is built for you. If you need more income, pick LaunchPad. If you want all of it, the Billionaire Circle.",
  },
  {
    q: "What happens right after I pay?",
    a: "Within a minute you’ll receive a personal welcome letter by email with your onboarding kit: a one-tap sign-in to your vault, your financial plan to fill out, and a link to book your first one-on-one session.",
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

export default async function Home() {
  const testimonials = await publishedTestimonials();
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
                <span className="size-1.5 rounded-full bg-gold" /> Hey future billionaire, it’s about to be a fun ride
              </p>
              <h1 className="mt-6 font-display text-[2.4rem] font-bold leading-[1.04] tracking-tight sm:text-5xl lg:text-6xl">
                Tell your money where to go,
                <br />
                <span className="text-gold">instead of wondering</span> where it went.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/75">
                We’re not a course. The Money Circle is a hands-on finance coaching community: for 6 months we sit with you,
                work through your numbers, build your systems and execute your money plans, together.
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

        {/* TWO CHOICES */}
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-lg leading-relaxed text-muted">
              If you’re reading this, you’re sick of the cycle: get money, spend, wonder where it all went, repeat.
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Well, you have two choices…</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-paper p-8 ring-1 ring-line">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Choice A</p>
              <p className="mt-3 font-display text-2xl font-semibold leading-snug text-muted">
                Keep doing what you’re doing. Watch another year pass while your finances stay stuck.
              </p>
            </div>
            <div className="rounded-3xl bg-gold p-8 text-ink">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">Choice B</p>
              <p className="mt-3 font-display text-2xl font-bold leading-snug">
                Invest in the one system that will finally fix your finances for good.
              </p>
              <p className="mt-4 font-semibold">Ready for Choice B? Welcome home. 🏡</p>
            </div>
          </div>
        </section>

        {/* MEET SHARON */}
        <section id="coach" className="scroll-mt-10 mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <div className="grid gap-10 rounded-[2rem] bg-forest p-8 text-cream sm:p-12 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="grid size-28 place-items-center rounded-full bg-gold font-display text-5xl font-bold text-ink sm:size-36" aria-hidden>
              {site.coachFirstName.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">But chill!! Meet me first</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                I’m {site.coachFirstName}, your Money Buddy.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-cream/80">
                Think of me as your hype-woman and drill sergeant, rolled into one. My mission? To give you the tools, the
                plan and the relentless accountability to build the financial future you actually want.
              </p>
              <p className="mt-4 max-w-2xl leading-relaxed text-cream/70">
                I’m a Gen-Z who is crazy about money. I love making, managing, saving and investing it, because why not?
                No fluff here: just a proven system and a squad that won’t let you fail.
              </p>
            </div>
          </div>
        </section>

        {/* BEFORE / AFTER */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl bg-paper p-8 ring-1 ring-line">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral">Is this you?</p>
              <ul className="mt-5 space-y-4">
                {PAINS.map((p) => (
                  <li key={p} className="flex gap-3 text-lg leading-snug">
                    <span className="mt-2 size-2 shrink-0 rounded-full bg-coral" />
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-t border-line pt-5 leading-relaxed text-muted">
                If you nodded to any of these, take a deep breath. You’re not bad with money. You just never had the right
                system and support.
              </p>
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
                We don’t just talk. We build habits.
              </h2>
              <p className="mt-4 text-lg text-muted">Four non-negotiable pillars, worked on with you every month.</p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-line ring-1 ring-line md:grid-cols-2">
              {BIG4.map((b) => (
                <div key={b.n} className="bg-paper p-7 sm:p-9">
                  <div className="flex items-baseline gap-4">
                    <p className="font-display text-5xl font-bold text-gold">{b.n}</p>
                    <h3 className="font-display text-2xl font-bold">{b.title}</h3>
                  </div>
                  <p className="mt-4 font-display text-lg font-semibold leading-snug text-forest">{b.hook}</p>
                  <dl className="mt-5 space-y-3">
                    {b.rows.map((r) => (
                      <div key={r.k}>
                        <dt className="text-xs font-bold uppercase tracking-[0.14em] text-moss">{r.k}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-muted">{r.v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <figure className="mx-auto mt-14 max-w-2xl text-center">
              <blockquote className="font-display text-2xl font-semibold leading-snug sm:text-3xl">
                “Take control of your finances today, else you will be a victim of them tomorrow.”
              </blockquote>
              <figcaption className="mt-3 text-sm font-semibold text-muted">{site.coachName}</figcaption>
            </figure>
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

        {/* IS THIS FOR YOU */}
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <h2 className="text-center font-display text-4xl font-bold tracking-tight sm:text-5xl">Is this for you?</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-paper p-8 ring-1 ring-line">
              <p className="font-display text-2xl font-bold text-moss">YES, if…</p>
              <ul className="mt-5 space-y-3">
                {FOR_YOU.map((x) => (
                  <li key={x} className="flex gap-3 leading-snug">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-forest text-xs text-gold" aria-hidden>✓</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-paper p-8 ring-1 ring-line">
              <p className="font-display text-2xl font-bold text-coral">NO, if…</p>
              <ul className="mt-5 space-y-3">
                {NOT_FOR_YOU.map((x) => (
                  <li key={x} className="flex gap-3 leading-snug">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-coral/15 text-xs font-bold text-coral" aria-hidden>✕</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-6 text-center font-semibold">⚠️ Warning: it requires work, but evidence go show.</p>
        </section>

        {/* TESTIMONIALS */}
        {testimonials.length > 0 && (
          <section id="testimonials" className="scroll-mt-10 mx-auto max-w-6xl px-4 pt-24 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Still not convinced?</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Hear from our billionaires!</h2>
            </div>
            <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="mb-4 break-inside-avoid rounded-3xl bg-paper p-7 ring-1 ring-line">
                  {t.highlight && <p className="font-display text-xl font-bold leading-snug text-forest">{t.highlight}</p>}
                  <blockquote className={`whitespace-pre-line leading-relaxed text-muted ${t.highlight ? "mt-3" : ""}`}>“{t.quote}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gold font-display font-bold text-ink" aria-hidden>
                      {t.name.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <span className="block font-semibold">{t.name}</span>
                      {t.detail && <span className="block text-xs text-muted">{t.detail}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">A love letter to you</p>
            <h2 className="mx-auto mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to make big money moves?
            </h2>
            <div className="mx-auto mt-6 max-w-2xl space-y-4 text-left leading-relaxed text-cream/75 sm:text-center">
              <p>
                Hey future billionaire, I’m super glad you’re considering this journey. This is beyond budgets or
                investments. It’s about financial freedom!
              </p>
              <p>
                Every naira you save, every expense you track, every goal you crush? That’s you rewriting your future. And
                I’ll be here cheering, nudging, and sometimes dragging you across the finish line.
              </p>
              <p>One day, you’ll look back and realise: this was where it all changed.</p>
              <p className="font-display text-lg italic text-cream">
                With all my love, {site.coachFirstName} ({site.coachName})
              </p>
            </div>
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
