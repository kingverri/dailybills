"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLanguage } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import type { AppTheme, Language, Profile, UserPlan, WeeklySettlementDay } from "@/types/app";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  retryAuth: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const AUTH_LOAD_TIMEOUT_MS = 8000;

const defaultProfileValues = {
  currency: "USD",
  country: "United States",
  current_balance: 0,
  language: "en" as Language,
  theme: "dark" as AppTheme,
  plan: "free" as UserPlan,
  weekly_settlement_day: "friday" as WeeklySettlementDay,
  onboarding_completed: false
};

function applyTheme(theme: AppTheme) {
  document.documentElement.classList.remove("theme-dark", "theme-soft-light", "theme-light");
  document.documentElement.classList.add(`theme-${theme.replace("_", "-")}`);
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.classList.toggle("theme-soft-light", theme === "soft_light");
  document.documentElement.classList.toggle("theme-dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
}

function normalizeTheme(theme?: string | null): AppTheme {
  if (theme === "light" || theme === "soft_light") {
    return theme;
  }

  return "dark";
}

function normalizePlan(plan?: string | null): UserPlan {
  if (plan === "pro_monthly" || plan === "pro_yearly") {
    return plan;
  }

  return "free";
}

function normalizeSettlementDay(day?: string | null): WeeklySettlementDay {
  if (
    day === "monday" ||
    day === "tuesday" ||
    day === "wednesday" ||
    day === "thursday" ||
    day === "saturday" ||
    day === "sunday"
  ) {
    return day;
  }

  return "friday";
}

function buildProfileDefaults(currentUser: User) {
  return {
    user_id: currentUser.id,
    full_name:
      typeof currentUser.user_metadata?.full_name === "string"
        ? currentUser.user_metadata.full_name
        : currentUser.email?.split("@")[0] ?? null,
    ...defaultProfileValues
  };
}

function buildRuntimeFallbackProfile(currentUser: User) {
  return {
    ...buildProfileDefaults(currentUser),
    onboarding_completed: true
  };
}

function normalizeProfile(profile: Partial<Profile> & { user_id: string }, currentUser: User): Profile {
  return {
    id: profile.id ?? `fallback-${currentUser.id}`,
    user_id: profile.user_id,
    full_name: profile.full_name ?? buildProfileDefaults(currentUser).full_name,
    currency: profile.currency ?? defaultProfileValues.currency,
    country: profile.country ?? defaultProfileValues.country,
    state: profile.state ?? null,
    city: profile.city ?? null,
    current_balance: Number(profile.current_balance ?? defaultProfileValues.current_balance),
    income_type: profile.income_type ?? null,
    work_type: profile.work_type ?? null,
    language: normalizeLanguage(profile.language) as Language,
    theme: normalizeTheme(profile.theme),
    plan: normalizePlan(profile.plan),
    stripe_customer_id: profile.stripe_customer_id ?? null,
    stripe_subscription_id: profile.stripe_subscription_id ?? null,
    subscription_status: profile.subscription_status ?? null,
    weekly_settlement_day: normalizeSettlementDay(profile.weekly_settlement_day),
    onboarding_completed: Boolean(profile.onboarding_completed ?? defaultProfileValues.onboarding_completed),
    created_at: profile.created_at ?? new Date().toISOString(),
    updated_at: profile.updated_at ?? new Date().toISOString()
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("auth_load_timeout"));
    }, timeoutMs);

    promise
      .then((value) => resolve(value))
      .catch((error: unknown) => reject(error))
      .finally(() => window.clearTimeout(timeoutId));
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("dailybills-theme");
    applyTheme(normalizeTheme(storedTheme));
  }, []);

  useEffect(() => {
    if (!profile?.theme) {
      return;
    }

    const nextTheme = normalizeTheme(profile.theme);
    applyTheme(nextTheme);
    window.localStorage.setItem("dailybills-theme", nextTheme);
  }, [profile?.theme]);

  const loadProfile = useCallback(async (currentUser: User) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const defaults = buildProfileDefaults(currentUser);

    if (!data) {
      const { data: createdProfile, error: upsertError } = await supabase
        .from("profiles")
        .upsert(defaults, { onConflict: "user_id" })
        .select("*")
        .maybeSingle();

      if (upsertError) {
        throw upsertError;
      }

      return normalizeProfile(createdProfile ?? defaults, currentUser);
    }

    const needsDefaults =
      !data.currency ||
      !data.country ||
      !data.language ||
      !data.theme ||
      !data.plan ||
      !data.weekly_settlement_day;

    if (needsDefaults) {
      const normalized = normalizeProfile(data, currentUser);
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: currentUser.id,
            currency: normalized.currency,
            country: normalized.country,
            current_balance: normalized.current_balance,
            language: normalized.language,
            theme: normalized.theme,
            plan: normalized.plan,
            weekly_settlement_day: normalized.weekly_settlement_day,
            onboarding_completed: normalized.onboarding_completed
          },
          { onConflict: "user_id" }
        )
        .select("*")
        .maybeSingle();

      return normalizeProfile(updatedProfile ?? normalized, currentUser);
    }

    return normalizeProfile(data, currentUser);
  }, []);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabaseClient();
    const {
      data: { user: currentUser }
    } = await supabase.auth.getUser();

    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      setProfile(await loadProfile(currentUser));
      setError(null);
    } catch (profileError) {
      console.error(profileError);
      setProfile(normalizeProfile(buildRuntimeFallbackProfile(currentUser), currentUser));
    }
  }, [loadProfile]);

  const loadAuthState = useCallback(async () => {
    const supabase = getSupabaseClient();
    setLoading(true);
    setError(null);

    try {
      await withTimeout(
        (async () => {
          const { data, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            throw sessionError;
          }

          setSession(data.session);
          setUser(data.session?.user ?? null);

          if (data.session?.user) {
            try {
              setProfile(await loadProfile(data.session.user));
            } catch (profileError) {
              console.error(profileError);
              setProfile(normalizeProfile(buildRuntimeFallbackProfile(data.session.user), data.session.user));
            }
          } else {
            setProfile(null);
          }
        })(),
        AUTH_LOAD_TIMEOUT_MS
      );
    } catch (authError) {
      console.error(authError);
      setError("plan_load_failed");
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  const retryAuth = useCallback(async () => {
    await loadAuthState();
  }, [loadAuthState]);

  const handleAuthSession = useCallback(
    async (nextSession: Session | null) => {
      setLoading(true);
      setError(null);

      try {
        await withTimeout(
          (async () => {
            setSession(nextSession);
            setUser(nextSession?.user ?? null);

            if (nextSession?.user) {
              try {
                setProfile(await loadProfile(nextSession.user));
              } catch (profileError) {
                console.error(profileError);
                setProfile(normalizeProfile(buildRuntimeFallbackProfile(nextSession.user), nextSession.user));
              }
            } else {
              setProfile(null);
            }
          })(),
          AUTH_LOAD_TIMEOUT_MS
        );
      } catch (authError) {
        console.error(authError);
        setError("plan_load_failed");
      } finally {
        setLoading(false);
      }
    },
    [loadProfile]
  );

  useEffect(() => {
    loadAuthState().catch(console.error);
  }, [loadAuthState]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      handleAuthSession(nextSession).catch(console.error);
    });

    return () => listener.subscription.unsubscribe();
  }, [handleAuthSession]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setError("plan_load_failed");
      setLoading(false);
    }, AUTH_LOAD_TIMEOUT_MS + 500);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ user, session, profile, loading, error, refreshProfile, retryAuth, signOut }),
    [user, session, profile, loading, error, refreshProfile, retryAuth, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
