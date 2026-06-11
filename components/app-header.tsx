"use client";

import clsx from "clsx";
import { BarChart3, CircleDollarSign, ClipboardList, Home, LogOut, Receipt, Settings, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { t, type TranslationKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: TranslationKey; icon: typeof Home }[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: Home },
  { href: "/driver-log", labelKey: "driverLogNav", icon: ClipboardList },
  { href: "/bills", labelKey: "bills", icon: CircleDollarSign },
  { href: "/expenses", labelKey: "expenses", icon: Receipt },
  { href: "/income", labelKey: "income", icon: BarChart3 },
  { href: "/settings", labelKey: "settings", icon: Settings }
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const language = profile?.language ?? "en";

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 hidden border-b border-line bg-surface/82 shadow-sm backdrop-blur-2xl lg:block">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
        <Link className="flex items-center gap-3 text-ink" href="/dashboard">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-slate-950 shadow-glow">
            <Wallet size={24} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-black leading-none">DailyBills</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-brand-700">
              Cash-flow planner
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 rounded-3xl border border-line bg-neutral-50/70 p-1.5 shadow-sm">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={clsx(
                  "inline-flex min-h-11 items-center gap-2 rounded-2xl px-3.5 text-sm font-bold transition",
                  active
                    ? "border border-brand-200 bg-brand-50 text-brand-700 shadow-glow"
                    : "text-neutral-500 hover:bg-surface hover:text-ink"
                )}
                href={item.href}
              >
                <Icon size={20} aria-hidden="true" />
                {t(language, item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <button className="btn-secondary min-h-11" type="button" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" />
          {t(language, "logout")}
        </button>
      </div>
    </header>
  );
}
