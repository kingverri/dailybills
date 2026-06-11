"use client";

import clsx from "clsx";
import { BarChart3, CircleDollarSign, ClipboardList, Home, LogOut, MoreHorizontal, Receipt, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { t, type TranslationKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: TranslationKey; icon: typeof Home }[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: Home },
  { href: "/driver-log", labelKey: "driverLogNav", icon: ClipboardList },
  { href: "/bills", labelKey: "bills", icon: CircleDollarSign },
  { href: "/expenses", labelKey: "expenses", icon: Receipt }
];

const moreItems: { href: string; labelKey: TranslationKey; icon: typeof Home }[] = [
  { href: "/income", labelKey: "income", icon: BarChart3 },
  { href: "/settings", labelKey: "settings", icon: Settings },
  { href: "/pricing", labelKey: "billing", icon: Sparkles }
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [showMore, setShowMore] = useState(false);
  const language = profile?.language ?? "en";

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/92 px-2 py-2 shadow-2xl backdrop-blur-2xl lg:hidden">
      {showMore ? (
        <div className="mx-auto mb-2 max-w-md rounded-3xl border border-line bg-surface p-2 shadow-card">
          <div className="grid gap-1">
            {moreItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-ink"
                  href={item.href}
                  onClick={() => setShowMore(false)}
                >
                  <Icon size={18} aria-hidden="true" />
                  {t(language, item.labelKey)}
                </Link>
              );
            })}
            <button
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-ink"
              type="button"
              onClick={handleLogout}
            >
              <LogOut size={18} aria-hidden="true" />
              {t(language, "logout")}
            </button>
          </div>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1 rounded-3xl border border-line bg-neutral-50/70 p-1 shadow-card">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition",
                active
                  ? "border border-brand-200 bg-brand-50 text-brand-700 shadow-glow"
                  : "text-neutral-500 hover:bg-surface hover:text-ink"
              )}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{t(language, item.labelKey)}</span>
            </Link>
          );
        })}
        <button
          className={clsx(
            "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition",
            showMore || moreItems.some((item) => pathname === item.href)
              ? "border border-brand-200 bg-brand-50 text-brand-700 shadow-glow"
              : "text-neutral-500 hover:bg-surface hover:text-ink"
          )}
          type="button"
          onClick={() => setShowMore((value) => !value)}
        >
          <MoreHorizontal size={22} aria-hidden="true" />
          <span>{t(language, "more")}</span>
        </button>
      </div>
    </nav>
  );
}
