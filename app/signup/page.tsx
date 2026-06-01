"use client";

import { Eye, EyeOff, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { getSupabaseClient } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!fullName.trim() || !email || password.length < 6) {
      setError("Enter your name, email, and a password with at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } }
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: data.user.id,
            full_name: fullName.trim(),
            currency: "USD",
            country: "United States",
            current_balance: 0,
            language: "en",
            onboarding_completed: false
          },
          { onConflict: "user_id" }
        );

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);

    if (data.session) {
      router.replace("/onboarding");
      return;
    }

    setMessage("Check your email to confirm your account, then log in.");
  }

  return (
    <AuthCard
      title="Start planning"
      subtitle="Set up your driver budget in a few minutes."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="field-label">Full name</span>
          <input className="field" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
        </label>

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

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{message}</p> : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          <UserPlus size={18} aria-hidden="true" />
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link className="font-semibold" href="/login">
          Login
        </Link>
      </p>
    </AuthCard>
  );
}
