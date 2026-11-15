import type { Metadata } from "next";
import { Logo } from "@/components/Chrome";
import { BottomNav, SideNav, type NavItem } from "@/components/app/AppNav";
import { Toaster } from "@/components/finance/cells";
import { requireStudent } from "@/lib/auth";
import { env } from "@/lib/env";
import { firstName, hasPillar, packageOf, programmeProgress, touchStudent } from "@/lib/students";

export const metadata: Metadata = { title: "My Money Circle", robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requireStudent();
  await touchStudent(s).catch(() => undefined);
  const pkg = packageOf(s);
  const prog = programmeProgress(s);

  const items: NavItem[] = [
    { href: "/app", label: "Home", icon: "◎" },
    { href: "/app/budget", label: "Budget", icon: "📒", locked: !hasPillar(s, 2) },
    { href: "/app/expenses", label: "Expenses", icon: "🧾", locked: !hasPillar(s, 2) },
    { href: "/app/savings", label: "Savings", icon: "🌱", locked: !hasPillar(s, 3) },
    { href: "/app/invest", label: "Invest", icon: "📈", locked: !hasPillar(s, 3) },
    { href: "/app/launchpad", label: "LaunchPad", icon: "🚀", locked: !hasPillar(s, 4) },
    { href: "/app/learn", label: "Learn", icon: "🎓" },
  ];
  // Mobile bar: hide locked tools to keep it to the essentials.
  const mobile = items.filter((i) => !i.locked).slice(0, 5);

  return (
    <div className="min-h-screen bg-cream lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="grain sticky top-0 hidden h-screen flex-col bg-forest p-5 lg:flex">
        <Logo light />
        <SideNav items={items} />
        <div className="mt-auto space-y-3">
          <div className="rounded-2xl bg-white/5 p-4 text-sm text-cream ring-1 ring-white/10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{pkg.name}</p>
            <p className="mt-1 font-semibold">{s.full_name}</p>
            {prog.total && (
              <>
                <p className="mt-2 text-xs text-cream/60">Month {prog.month} of {prog.total}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${(prog.month / prog.total) * 100}%` }} />
                </div>
              </>
            )}
          </div>
          <form action="/auth/logout" method="post">
            <button className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-cream/60 hover:bg-white/5 hover:text-cream">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        {env.paymentMode() === "demo" && (
          <div className="bg-gold/25 px-4 py-1.5 text-center text-xs font-semibold text-ink">Demo mode: payments are simulated</div>
        )}
        <header className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
          <Logo />
          <div className="flex items-center gap-1">
          {!mobile.some((i) => i.href === "/app/learn") && (
            <a href="/app/learn" className="rounded-full px-3 py-1.5 text-xs font-semibold text-forest">🎓 Learn</a>
          )}
          <form action="/auth/logout" method="post">
            <button className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted" aria-label={`Sign out ${firstName(s)}`}>
              Sign out
            </button>
          </form>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-6 lg:pb-16 lg:pt-10">{children}</main>
      </div>
      <BottomNav items={mobile} />
      <Toaster />
    </div>
  );
}
