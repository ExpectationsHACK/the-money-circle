"use client";

import Link from "next/link";
import { useState } from "react";
import { PACKAGES, billingSuffix, formatNaira, type Package } from "@/lib/packages";

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`size-5 shrink-0 ${className}`} aria-hidden>
      <circle cx="10" cy="10" r="9" className="fill-current opacity-15" />
      <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Card({ pkg }: { pkg: Package }) {
  const [i, setI] = useState(0);
  const offer = pkg.offers[i];
  const dark = pkg.vip;
  const featured = pkg.featured;

  return (
    <article
      className={`relative flex flex-col rounded-3xl p-6 sm:p-7 ${
        dark
          ? "bg-ink text-cream ring-1 ring-gold/40"
          : featured
            ? "bg-paper ring-2 ring-forest shadow-[0_30px_60px_-30px_rgba(15,61,46,0.45)]"
            : "bg-paper ring-1 ring-line"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-6 rounded-full bg-forest px-3 py-1 text-xs font-bold tracking-wide text-gold">
          MOST POPULAR
        </span>
      )}
      {dark && (
        <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-1 text-xs font-bold tracking-wide text-ink">
          VIP · ALL ACCESS
        </span>
      )}

      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${dark ? "text-gold" : "text-moss"}`}>
        {pkg.intent} · {pkg.pillars.length === 4 ? "Pillars 1–4" : `Pillar${pkg.pillars.length > 1 ? "s" : ""} ${pkg.pillars.join(" + ")}`}
      </p>
      <h3 className="mt-2 font-display text-2xl font-bold">{pkg.name}</h3>
      <p className={`mt-2 text-sm leading-relaxed ${dark ? "text-cream/70" : "text-muted"}`}>{pkg.positioning}</p>

      {pkg.offers.length > 1 && (
        <div
          role="tablist"
          aria-label={`${pkg.name} options`}
          className={`mt-5 grid grid-cols-2 gap-1 rounded-full p-1 text-xs font-semibold ${dark ? "bg-white/10" : "bg-cream"}`}
        >
          {pkg.offers.map((o, idx) => (
            <button
              key={o.slug}
              role="tab"
              aria-selected={idx === i}
              onClick={() => setI(idx)}
              className={`rounded-full px-2 py-2 transition ${
                idx === i ? (dark ? "bg-gold text-ink" : "bg-forest text-cream") : dark ? "text-cream/70" : "text-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold tracking-tight">{formatNaira(offer.priceNaira)}</span>
        <span className={`text-sm ${dark ? "text-cream/60" : "text-muted"}`}>{billingSuffix(offer.billing)}</span>
      </div>
      <p className={`mt-1 text-xs ${dark ? "text-cream/50" : "text-muted"}`}>
        {pkg.duration}
        {offer.note ? ` · ${offer.note}` : ""}
      </p>

      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {pkg.includes.map((x) => (
          <li key={x} className="flex gap-2.5">
            <Check className={dark ? "text-gold" : "text-moss"} />
            <span className={dark ? "text-cream/85" : ""}>{x}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/enroll/${offer.slug}`}
        className={`mt-7 block rounded-2xl px-5 py-3.5 text-center font-bold transition ${
          dark || featured ? "bg-gold text-ink hover:bg-gold-soft" : "bg-forest text-cream hover:bg-forest-2"
        }`}
      >
        {dark ? "Claim your VIP seat" : featured ? "Secure your spot" : "Enroll now"}
      </Link>
    </article>
  );
}

export function PackageCards() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {PACKAGES.map((p) => (
        <Card key={p.id} pkg={p} />
      ))}
    </div>
  );
}
