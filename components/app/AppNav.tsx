"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  locked?: boolean;
}

function isActive(path: string, href: string) {
  return href === "/app" ? path === "/app" : path.startsWith(href);
}

export function SideNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="mt-8 space-y-1" aria-label="App">
      {items.map((i) => {
        const active = isActive(path, i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active ? "bg-gold text-ink" : "text-cream/75 hover:bg-white/5 hover:text-cream"
            }`}
          >
            <span className="w-5 text-center" aria-hidden>{i.icon}</span>
            <span className="flex-1">{i.label}</span>
            {i.locked && <span className="text-xs opacity-60" aria-label="locked">🔒</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="App"
    >
      <div className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((i) => {
          const active = isActive(path, i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${active ? "text-forest" : "text-muted"}`}
            >
              <span className={`grid h-7 w-12 place-items-center rounded-full text-base ${active ? "bg-gold/30" : ""}`} aria-hidden>
                {i.icon}
              </span>
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
