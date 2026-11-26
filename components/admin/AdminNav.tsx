"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: "◎" },
  { href: "/admin/students", label: "Students", icon: "👥" },
  { href: "/admin/enrollments", label: "Enrollments", icon: "₦" },
  { href: "/admin/courses", label: "Courses", icon: "🎓" },
  { href: "/admin/testimonials", label: "Testimonials", icon: "💬" },
  { href: "/admin/system", label: "System", icon: "⚙" },
];

function active(path: string, href: string) {
  return href === "/admin" ? path === "/admin" : path.startsWith(href);
}

export function AdminSideNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="mt-8 space-y-1" aria-label="Admin">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(path, i.href) ? "page" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            active(path, i.href) ? "bg-gold text-ink" : "text-cream/70 hover:bg-white/5 hover:text-cream"
          }`}
        >
          <span className="w-5 text-center" aria-hidden>{i.icon}</span>
          <span className="flex-1">{i.label}</span>
          {badges[i.href] ? <span className="rounded-full bg-coral px-2 py-0.5 text-xs font-bold text-white">{badges[i.href]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function AdminTopNav({ badges }: { badges: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-4 pb-3" aria-label="Admin">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={active(path, i.href) ? "page" : undefined}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold ${active(path, i.href) ? "bg-gold text-ink" : "text-cream/70"}`}
        >
          {i.label}
          {badges[i.href] ? <span className="ml-1.5 rounded-full bg-coral px-1.5 text-xs text-white">{badges[i.href]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
