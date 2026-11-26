import Link from "next/link";
import { site, whatsappLink } from "@/lib/site";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${site.name} home`}>
      <span className="relative grid size-9 place-items-center rounded-full bg-gold">
        <span className={`size-5 rounded-full border-[3px] ${light ? "border-forest" : "border-forest"}`} />
      </span>
      <span className={`font-display text-lg font-bold tracking-tight ${light ? "text-cream" : "text-ink"}`}>
        The Money Circle
      </span>
    </Link>
  );
}

export function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo light />
        <nav className="hidden items-center gap-6 text-sm font-medium text-cream/80 lg:gap-8 md:flex">
          <a href="#coach" className="hover:text-cream">Meet {site.coachFirstName}</a>
          <a href="#system" className="hover:text-cream">The Big 4</a>
          <a href="#packages" className="hover:text-cream">Packages</a>
          <a href="#how" className="hover:text-cream">How it works</a>
          <a href="#faq" className="hover:text-cream">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold text-cream/85 hover:text-cream">
          Sign in
        </Link>
        <a
          href="#packages"
          className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-ink transition hover:bg-gold-soft"
        >
          Enroll now
        </a>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const wa = whatsappLink("Hi Money Buddy! I have a question about The Money Circle.");
  return (
    <footer className="bg-ink text-cream/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{site.tagline} Coaching for Nigerians ready to take control.</p>
        </div>
        <div className="text-sm">
          <p className="font-display font-semibold text-cream">Explore</p>
          <ul className="mt-3 space-y-2">
            <li><a href="#packages" className="hover:text-cream">Packages & pricing</a></li>
            <li><a href="#how" className="hover:text-cream">How enrollment works</a></li>
            {site.freeCommunityUrl && (
              <li><a href={site.freeCommunityUrl} className="hover:text-cream">Free community</a></li>
            )}
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-display font-semibold text-cream">Talk to us</p>
          <ul className="mt-3 space-y-2">
            {wa && <li><a href={wa} className="hover:text-cream">WhatsApp</a></li>}
            {site.instagram && <li><a href={site.instagram} className="hover:text-cream">Instagram</a></li>}
          </ul>
          <p className="mt-6 text-xs text-cream/40">
            Coaching and education only. Nothing here is a solicitation to buy any specific security.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-cream/40">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </div>
    </footer>
  );
}
