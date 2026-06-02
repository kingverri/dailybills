"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, RefreshCcw } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { LoadingScreen } from "@/components/loading-screen";
import { useAuth } from "@/components/auth-provider";
import { t } from "@/lib/i18n";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, error, retryAuth, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isOnboarding = pathname === "/onboarding";

  useEffect(() => {
    if (loading || error) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (profile && !profile.onboarding_completed && !isOnboarding) {
      router.replace("/onboarding");
    }
  }, [error, isOnboarding, loading, profile, router, user]);

  if (error) {
    return <PlanLoadError language={profile?.language} onRetry={retryAuth} onLogout={signOut} />;
  }

  if (loading || !user || (!isOnboarding && profile && !profile.onboarding_completed)) {
    return <LoadingScreen label={t(profile?.language, "gettingPlanReady")} />;
  }

  return (
    <div className="min-h-dvh">
      {!isOnboarding || profile?.onboarding_completed ? <AppHeader /> : null}
      <main className="mx-auto min-h-dvh w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
        {children}
      </main>
      {!isOnboarding || profile?.onboarding_completed ? <BottomNav /> : null}
    </div>
  );
}

function PlanLoadError({
  language,
  onRetry,
  onLogout
}: {
  language?: string | null;
  onRetry: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-slate-950 shadow-glow">
          DB
        </div>
        <h1 className="text-2xl font-black text-ink">{t(language, "planLoadErrorTitle")}</h1>
        <p className="mt-2 whitespace-pre-line text-sm font-medium text-neutral-600">{t(language, "planLoadErrorBody")}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button className="btn-primary" type="button" onClick={() => onRetry()}>
            <RefreshCcw size={17} aria-hidden="true" />
            {t(language, "retry")}
          </button>
          <button className="btn-secondary" type="button" onClick={() => onLogout()}>
            <LogOut size={17} aria-hidden="true" />
            {t(language, "logout")}
          </button>
        </div>
      </div>
    </div>
  );
}
