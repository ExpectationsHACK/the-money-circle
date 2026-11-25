import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { getKit, markStudent, sessionAgenda } from "@/lib/onboarding-kit";
import { site, whatsappLink } from "@/lib/site";
import { firstName, packageOf } from "@/lib/students";
import { SubmitButton } from "@/components/app/ui";
import { markSessionBooked } from "../kit-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your onboarding kit" };

export default async function WelcomePage() {
  const s = await requireStudent();
  await markStudent(s.id, "welcome_seen_at");
  const pkg = packageOf(s);
  const kit = await getKit(s);
  const agenda = sessionAgenda(s);
  const book = kit.steps.find((x) => x.key === "book");
  const wa = whatsappLink(`Hi ${site.coachFirstName}! I have a question about my onboarding.`);
  const allDone = kit.done === kit.total;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* The welcome letter */}
      <article className="overflow-hidden rounded-3xl bg-paper ring-1 ring-line">
        <div className="grain bg-forest px-6 py-8 text-cream sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Official welcome · {pkg.name}</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">Welcome to The Money Circle, {firstName(s)} 🎉</h1>
        </div>
        <div className="space-y-4 px-6 py-7 text-[1.05rem] leading-relaxed sm:px-10">
          <p>Dear billionaire,</p>
          <p>
            It is with pleasure that I write to officially welcome you into The Money Circle. A huge congratulations on taking this massive step toward
            financial freedom. I am genuinely excited to walk this journey with you.
          </p>
          <p>Below is everything you need to get started. Everything lives right here in your app, so you can come back any time.</p>
          <p className="pt-2">
            With all my love,
            <br />
            <span className="font-display text-xl font-bold italic">{site.coachFirstName}</span> <span className="text-muted">({site.coachName})</span>
            <br />
            <span className="text-sm text-muted">{site.coachTitle}, {site.name}</span>
          </p>
        </div>
      </article>

      {/* The onboarding kit */}
      <section className="rounded-3xl bg-paper p-6 ring-1 ring-line sm:p-8" aria-labelledby="kit-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-moss">Your onboarding kit</p>
            <h2 id="kit-h" className="font-display text-2xl font-bold">{allDone ? "You’re all set ✨" : "Let’s get you set up"}</h2>
          </div>
          <p className="text-sm font-semibold text-muted">{kit.done} of {kit.total} done</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream" role="progressbar" aria-valuenow={kit.done} aria-valuemin={0} aria-valuemax={kit.total} aria-label="Onboarding progress">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(kit.done / Math.max(1, kit.total)) * 100}%` }} />
        </div>

        <ol className="mt-6 space-y-3">
          {kit.steps.map((step, i) => (
            <li
              key={step.key}
              id={step.key === "book" ? "book" : undefined}
              className={`scroll-mt-6 rounded-2xl p-4 ring-1 sm:p-5 ${step.done ? "bg-moss/5 ring-moss/20" : step.locked ? "bg-cream/50 ring-line" : "bg-paper ring-forest/25"}`}
            >
              <div className="flex items-start gap-4">
                <span className={`grid size-9 shrink-0 place-items-center rounded-full font-display font-bold ${step.done ? "bg-moss text-cream" : step.locked ? "bg-line text-muted" : "bg-gold text-ink"}`}>
                  {step.done ? "✓" : step.locked ? "🔒" : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg font-bold">{step.title}</h3>
                  <p className="mt-0.5 text-sm text-muted">{step.body}</p>
                  {step.key === "plan" && !step.done && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-cream">
                        <div className="h-full rounded-full bg-moss" style={{ width: `${step.progress ?? 0}%` }} />
                      </div>
                      {step.progress ?? 0}% filled
                    </div>
                  )}
                  {step.locked && <p className="mt-2 text-sm font-semibold text-coral">{step.locked}</p>}

                  {step.key === "book" && !step.locked && (
                    <div className="mt-3 rounded-xl bg-cream/70 p-3 text-sm">
                      <p className="font-semibold">In this session we’ll:</p>
                      <ul className="mt-1 list-disc pl-5 text-muted">
                        {agenda.map((a) => (
                          <li key={a}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {!step.locked &&
                      (step.external ? (
                        <a
                          href={step.href}
                          target="_blank"
                          rel="noreferrer"
                          className={`rounded-xl px-4 py-2 text-sm font-bold ${step.done ? "ring-1 ring-line hover:bg-cream" : "bg-forest text-cream hover:bg-forest-2"}`}
                        >
                          {step.key === "book" ? (step.done ? "Reschedule ↗" : "📅 Book on Calendly ↗") : "Open ↗"}
                        </a>
                      ) : (
                        <Link href={step.href} className={`rounded-xl px-4 py-2 text-sm font-bold ${step.done ? "ring-1 ring-line hover:bg-cream" : "bg-forest text-cream hover:bg-forest-2"}`}>
                          {step.key === "plan"
                            ? step.done
                              ? "View my plan"
                              : (step.progress ?? 0) > 0
                                ? "Continue my plan →"
                                : "Start my plan →"
                            : step.done
                              ? "Open vault"
                              : "Open my vault →"}
                        </Link>
                      ))}
                    {step.locked && (
                      <Link href="/app/plan" className="rounded-xl bg-gold px-4 py-2 text-sm font-bold text-ink">
                        Fill my plan first →
                      </Link>
                    )}
                    {step.key === "book" && !step.locked && (
                      <form action={markSessionBooked.bind(null, !step.done)}>
                        <SubmitButton variant={step.done ? "ghost" : "dark"} pendingText="…">
                          {step.done ? "Undo: not booked yet" : "✓ I’ve booked my session"}
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {!book && kit.planRequired && <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-sm text-muted">Your coach will share your session booking link shortly.</p>}
      </section>

      <p className="text-center text-sm text-muted">
        Questions?{" "}
        {wa ? (
          <a href={wa} className="font-semibold text-moss underline">
            Send {site.coachFirstName} a WhatsApp message
          </a>
        ) : (
          "Reply to your welcome email"
        )}
        {site.contactEmail ? (
          <>
            {" "}or email{" "}
            <a href={`mailto:${site.contactEmail}`} className="font-semibold text-moss underline">
              {site.contactEmail}
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  );
}
