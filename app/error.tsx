"use client";

import { Home, LogOut, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { t } from "@/lib/i18n";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { profile, user, signOut } = useAuth();
  const language = profile?.language ?? "en";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-slate-950 shadow-glow">
          DB
        </div>
        <h1 className="text-2xl font-black text-ink">{t(language, "pageLoadErrorTitle")}</h1>
        <p className="mt-2 text-sm font-medium leading-6 text-neutral-600">{t(language, "pageLoadErrorBody")}</p>
        <div className="mt-5 grid gap-3">
          <button className="btn-primary" type="button" onClick={reset}>
            <RefreshCcw size={17} aria-hidden="true" />
            {t(language, "reload")}
          </button>
          <Link className="btn-secondary" href="/">
            <Home size={17} aria-hidden="true" />
            {t(language, "backToHome")}
          </Link>
          {user ? (
            <button className="btn-secondary" type="button" onClick={() => void signOut()}>
              <LogOut size={17} aria-hidden="true" />
              {t(language, "logout")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
