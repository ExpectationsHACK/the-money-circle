import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/Chrome";
import { EnrollForm, type BankDetails } from "@/components/EnrollForm";
import { allOfferSlugs, billingSuffix, findOffer, formatNaira } from "@/lib/packages";
import { site, whatsappLink } from "@/lib/site";

export function generateStaticParams() {
  return allOfferSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const found = findOffer((await params).slug);
  return { title: found ? `Enroll: ${found.pkg.name}` : "Enroll" };
}

function bankDetails(): BankDetails | null {
  const bankName = process.env.BANK_NAME;
  const accountName = process.env.BANK_ACCOUNT_NAME;
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER;
  return bankName && accountName && accountNumber ? { bankName, accountName, accountNumber } : null;
}

export default async function EnrollPage({ params }: { params: Promise<{ slug: string }> }) {
  const found = findOffer((await params).slug);
  if (!found) notFound();
  const { pkg, offer } = found;
  const price = `${formatNaira(offer.priceNaira)}${billingSuffix(offer.billing)}`;
  const hasPlan = pkg.pillars.includes(2);
  const afterPay = [
    `A personal welcome letter from ${site.coachFirstName}, your Money Buddy, lands in your inbox with your onboarding kit.`,
    pkg.route === "academy"
      ? "One tap signs you in to your classes, lessons and the community."
      : `One tap opens your private vault${hasPlan ? ", where you fill out your 6-month financial plan" : ""}.`,
    ...(pkg.route === "academy" ? [] : [`You book your first one-on-one session${hasPlan ? " once your plan is in" : ""}.`]),
  ];

  return (
    <div className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link href="/#packages" className="text-sm font-medium text-muted hover:text-ink">
          ← All packages
        </Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-12">
        <section className={`h-fit rounded-3xl p-7 sm:p-9 ${pkg.vip ? "bg-ink text-cream" : "bg-forest text-cream"}`}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">You’re enrolling in</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">{pkg.name}</h1>
          <p className="mt-1 text-cream/70">{offer.label}</p>
          <p className="mt-5 leading-relaxed text-cream/80">{pkg.positioning}</p>

          <div className="mt-7 flex items-baseline gap-2 border-y border-white/10 py-5">
            <span className="font-display text-5xl font-bold">{formatNaira(offer.priceNaira)}</span>
            <span className="text-cream/60">{billingSuffix(offer.billing) || "one-time"}</span>
          </div>

          <ul className="mt-6 space-y-3 text-sm">
            {pkg.includes.map((x) => (
              <li key={x} className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
                <span className="text-cream/85">{x}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl bg-white/5 p-5 text-sm ring-1 ring-white/10">
            <p className="font-semibold text-gold">What happens after you pay</p>
            <ol className="mt-3 space-y-2 text-cream/75">
              {afterPay.map((x, i) => (
                <li key={x}>{i + 1}. {x}</li>
              ))}
            </ol>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-cream/70">
            <span className="font-semibold text-gold">Heads up:</span> this requires work (tracking, budgeting, showing up), but evidence go show. If you’re
            ready for Choice B, welcome home. 💛
          </p>
        </section>

        <section>
          <EnrollForm
            offer={offer.slug}
            priceLabel={price}
            bank={bankDetails()}
            whatsappHref={whatsappLink(`Hi Money Buddy! I just paid for ${pkg.name} (${offer.label}) by bank transfer.`)}
          />
        </section>
      </main>
    </div>
  );
}
