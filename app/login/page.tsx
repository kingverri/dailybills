"use client";

import { ArrowLeft, Eye, EyeOff, KeyRound, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { useAuth } from "@/components/auth-provider";
import { normalizeLanguage, t } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import type { Language } from "@/types/app";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");
  const [resetError, setResetError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem("dailybills-public-language");
    const browserLanguage = navigator.language?.toLowerCase().startsWith("pt")
      ? "pt"
      : navigator.language?.toLowerCase().startsWith("es")
        ? "es"
        : "en";

    setLanguage(normalizeLanguage(storedLanguage ?? browserLanguage));
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, router, user]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/dashboard");
  }

  async function handlePasswordReset() {
    setResetError("");
    setResetMessage("");

    if (!resetEmail) {
      setResetError(t(language, "pleaseFillRequiredFields"));
      return;
    }

    setResetLoading(true);
    const supabase = getSupabaseClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const { error: resetPasswordError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${appUrl}/reset-password`
    });
    setResetLoading(false);

    if (resetPasswordError) {
      setResetError(resetPasswordError.message);
      return;
    }

    setResetMessage(t(language, "resetEmailSent"));
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Check today’s safe spending number before you hit the road."
    >
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-brand-700" href="/">
        <ArrowLeft size={16} aria-hidden="true" />
        {t(language, "backToHome")}
      </Link>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="field-label">Email</span>
          <input className="field" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label className="block space-y-2">
          <span className="field-label">Password</span>
          <div className="relative">
            <input
              className="field pr-12"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-500"
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        <button
          className="text-sm font-semibold text-brand-700 hover:text-brand-600"
          type="button"
          onClick={() => {
            setShowForgotPassword((value) => !value);
            setResetEmail(email);
            setResetError("");
            setResetMessage("");
          }}
        >
          {t(language, "forgotPassword")}
        </button>

        {showForgotPassword ? (
          <div className="rounded-[1.25rem] border border-line bg-neutral-50/70 p-4">
            <p className="text-sm font-black text-ink">{t(language, "resetPassword")}</p>
            <p className="mt-1 text-sm text-neutral-600">{t(language, "resetPasswordEmailHelper")}</p>
            <div className="mt-3 space-y-3">
              <label className="block space-y-2">
                <span className="field-label">Email</span>
                <input className="field" type="email" autoComplete="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} />
              </label>
              {resetError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</p> : null}
              {resetMessage ? <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{resetMessage}</p> : null}
              <button className="btn-secondary w-full" type="button" disabled={resetLoading} onClick={() => handlePasswordReset()}>
                <KeyRound size={17} aria-hidden="true" />
                {resetLoading ? t(language, "loading") : t(language, "sendResetLink")}
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          <LogIn size={18} aria-hidden="true" />
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-neutral-600">
        New to DailyBills?{" "}
        <Link className="font-semibold" href="/signup">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
