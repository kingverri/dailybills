"use client";

import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
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
  const [error, setError] = useState("");
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
