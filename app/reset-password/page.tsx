"use client";

import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { normalizeLanguage, t } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import type { Language } from "@/types/app";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError(t(language, "passwordLengthError"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t(language, "passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(t(language, "passwordUpdatedSuccessfully"));
    window.setTimeout(() => router.replace("/login"), 1200);
  }

  return (
    <AuthCard title={t(language, "resetPassword")} subtitle={t(language, "resetPasswordEmailHelper")}>
      <Link className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-brand-700" href="/">
        <ArrowLeft size={16} aria-hidden="true" />
        {t(language, "backToHome")}
      </Link>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="field-label">{t(language, "newPassword")}</span>
          <div className="relative">
            <input
              className="field pr-12"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

        <label className="block space-y-2">
          <span className="field-label">{t(language, "confirmNewPassword")}</span>
          <div className="relative">
            <input
              className="field pr-12"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            <button
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-neutral-500"
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p> : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          <KeyRound size={18} aria-hidden="true" />
          {loading ? t(language, "loading") : t(language, "resetPassword")}
        </button>
      </form>
    </AuthCard>
  );
}
