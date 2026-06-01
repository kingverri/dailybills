"use client";

import clsx from "clsx";
import { BarChart3, CircleDollarSign, ClipboardList, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { t, type TranslationKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: TranslationKey; icon: typeof Home }[] = [
  { href: "/dashboard", labelKey: "dashboard", icon: Home },
  { href: "/bills", labelKey: "bills", icon: CircleDollarSign },
  { href: "/income", labelKey: "income", icon: BarChart3 },
  { href: "/driver-log", labelKey: "driverLogNav", icon: ClipboardList },
  { href: "/settings", labelKey: "settings", icon: Settings }
];

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const language = profile?.language ?? "en";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition",
                active
                  ? "border border-brand-200 bg-brand-50 text-brand-700 shadow-glow"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-ink"
              )}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{t(language, item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
