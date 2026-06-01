"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { LoadingScreen } from "@/components/loading-screen";
import { useAuth } from "@/components/auth-provider";
import { t } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (profile && !profile.onboarding_completed && !isOnboarding) {
      router.replace("/onboarding");
    }
  }, [isOnboarding, loading, profile, router, user]);

  if (loading || !user || (!isOnboarding && profile && !profile.onboarding_completed)) {
    return <LoadingScreen label={t(profile?.language, "gettingPlanReady")} />;
  }

  return (
    <div className="min-h-dvh">
      {!isOnboarding || profile?.onboarding_completed ? <AppHeader /> : null}
      <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        {children}
      </main>
      {!isOnboarding || profile?.onboarding_completed ? <BottomNav /> : null}
    </div>
  );
}
