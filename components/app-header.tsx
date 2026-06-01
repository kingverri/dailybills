"use client";

import clsx from "clsx";
import { BarChart3, CircleDollarSign, ClipboardList, Home, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { t, type TranslationKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: TranslationKey; icon: typeof Home }[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: Home },
  { href: "/bills", labelKey: "bills", icon: CircleDollarSign },
  { href: "/income", labelKey: "income", icon: BarChart3 },
  { href: "/driver-log", labelKey: "driverLogNav", icon: ClipboardList },
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
    <header className="sticky top-0 z-20 hidden border-b border-line bg-surface/85 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link className="flex items-center gap-3 text-ink" href="/dashboard">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-400 text-sm font-black text-slate-950 shadow-glow">
            DB
          </span>
          <span className="text-lg font-bold">DailyBills</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={clsx(
                  "inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition",
                  active
                    ? "border border-brand-200 bg-brand-50 text-brand-700 shadow-glow"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-ink"
                )}
                href={item.href}
              >
                <Icon size={17} aria-hidden="true" />
                {t(language, item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <button className="btn-secondary min-h-10" type="button" onClick={handleLogout}>
          <LogOut size={17} aria-hidden="true" />
          {t(language, "logout")}
        </button>
      </div>
    </header>
  );
}
