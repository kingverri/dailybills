"use client";

import { CalendarDays, LogOut, Pencil, Plus, Sparkles, Trash2, UserRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppSectionCard } from "@/components/app-ui";
import { useAuth } from "@/components/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { currencies, daysOfWeek, incomeTypes, paymentScheduleTypes, workTypes } from "@/lib/constants";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { dayOfWeekLabel, languages, scheduleTypeLabel, subscriptionStatusLabel, t } from "@/lib/i18n";
import { getCurrentPlan } from "@/lib/planLimits";
import { plans } from "@/lib/plans";
import { getSupabaseClient } from "@/lib/supabase";
import type { AppTheme, DayOfWeek, IncomeType, Language, PaySchedule, PaymentScheduleType, WorkType } from "@/types/app";

type ProfileForm = {
  full_name: string;
  current_balance: string;
  income_type: IncomeType;
  currency: string;
  country: string;
  state: string;
  city: string;
  work_type: WorkType;
  language: Language;
  theme: AppTheme;
};

type ScheduleForm = {
  schedule_type: PaymentScheduleType;
  day_of_week: DayOfWeek;
  first_day_of_month: string;
  second_day_of_month: string;
  next_payment_date: string;
  estimated_amount: string;
  is_variable: boolean;
};

const initialScheduleForm: ScheduleForm = {
  schedule_type: "weekly",
  day_of_week: "Friday",
  first_day_of_month: "10",
  second_day_of_month: "25",
  next_payment_date: toDateInputValue(),
  estimated_amount: "",
  is_variable: true
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: "",
    current_balance: "0",
    income_type: "Gig work / driver",
    currency: "USD",
    country: "United States",
    state: "",
    city: "",
    work_type: "DoorDash",
    language: "en",
    theme: "dark"
  });
  const [schedules, setSchedules] = useState<PaySchedule[]>([]);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(initialScheduleForm);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const language = profileForm.language;
  const currentPlan = getCurrentPlan(profile);
  const currentPlanConfig = plans.find((plan) => plan.id === currentPlan) ?? plans[0];
  const isPaidPlan = currentPlan === "pro_monthly" || currentPlan === "pro_yearly";
  const rawSubscriptionStatus = profile?.subscription_status ?? "free";
  const displaySubscriptionStatus =
    isPaidPlan && (!profile?.subscription_status || profile.subscription_status === "free")
      ? "active"
      : rawSubscriptionStatus;
  const hasBillingPortal = Boolean(profile?.stripe_customer_id);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name ?? "",
        current_balance: String(profile.current_balance ?? 0),
        income_type: profile.income_type ?? "Gig work / driver",
        currency: profile.currency ?? "USD",
        country: profile.country ?? "United States",
        state: profile.state ?? "",
        city: profile.city ?? "",
        work_type: profile.work_type ?? "DoorDash",
        language: profile.language ?? "en",
        theme: profile.theme ?? "dark"
      });
    }
  }, [profile]);

  async function loadSchedules() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const { data, error: loadError } = await supabase
      .from("pay_schedules")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (loadError) {
      setError(loadError.message);
    } else {
      setSchedules(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSchedules().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    const balance = Number(profileForm.current_balance);
    if (!Number.isFinite(balance) || balance < 0) {
      setError(t(language, "profileSaveError"));
      return;
    }

    setSavingProfile(true);
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: profileForm.full_name.trim() || null,
          current_balance: balance,
          income_type: profileForm.income_type,
          currency: profileForm.currency,
          country: profileForm.country.trim() || "United States",
          state: profileForm.state.trim() || null,
          city: profileForm.city.trim() || null,
          work_type: profileForm.work_type,
          language: profileForm.language,
          theme: profileForm.theme,
          onboarding_completed: true
        },
        { onConflict: "user_id" }
      );
    setSavingProfile(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    setMessage(t(language, "profileUpdated"));
  }

  async function changeLanguage(nextLanguage: Language) {
    setProfileForm((current) => ({ ...current, language: nextLanguage }));
    setError("");
    setMessage("");

    if (!user) {
      setError(t(nextLanguage, "loginAgain"));
      return;
    }

    const currentBalance = Number(profileForm.current_balance);
    const safeBalance =
      Number.isFinite(currentBalance) && currentBalance >= 0 ? currentBalance : profile?.current_balance ?? 0;
    const supabase = getSupabaseClient();
    const { error: languageError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          language: nextLanguage,
          theme: profileForm.theme,
          currency: profileForm.currency || profile?.currency || "USD",
          country: profileForm.country.trim() || profile?.country || "United States",
          current_balance: safeBalance,
          onboarding_completed: profile?.onboarding_completed ?? true
        },
        { onConflict: "user_id" }
      );

    if (languageError) {
      setError(languageError.message);
      return;
    }

    await refreshProfile();
    setMessage(t(nextLanguage, "profileUpdated"));
  }

  async function changeTheme(nextTheme: AppTheme) {
    setProfileForm((current) => ({ ...current, theme: nextTheme }));
    setError("");
    setMessage("");
    document.documentElement.classList.remove("theme-dark", "theme-soft-light", "theme-light");
    document.documentElement.classList.add(`theme-${nextTheme.replace("_", "-")}`);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("dailybills-theme", nextTheme);

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    const currentBalance = Number(profileForm.current_balance);
    const safeBalance =
      Number.isFinite(currentBalance) && currentBalance >= 0 ? currentBalance : profile?.current_balance ?? 0;
    const supabase = getSupabaseClient();
    const { error: themeError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          theme: nextTheme,
          language: profileForm.language,
          currency: profileForm.currency || profile?.currency || "USD",
          country: profileForm.country.trim() || profile?.country || "United States",
          current_balance: safeBalance,
          onboarding_completed: profile?.onboarding_completed ?? true
        },
        { onConflict: "user_id" }
      );

    if (themeError) {
      setError(themeError.message);
      return;
    }

    await refreshProfile();
    setMessage(t(language, "profileUpdated"));
  }

  function editSchedule(schedule: PaySchedule) {
    setEditingScheduleId(schedule.id);
    setScheduleForm({
      schedule_type: schedule.schedule_type,
      day_of_week: schedule.day_of_week ?? "Friday",
      first_day_of_month: String(schedule.first_day_of_month ?? 10),
      second_day_of_month: String(schedule.second_day_of_month ?? 25),
      next_payment_date: schedule.next_payment_date ?? toDateInputValue(),
      estimated_amount: String(schedule.estimated_amount ?? ""),
      is_variable: schedule.is_variable
    });
  }

  function resetScheduleForm() {
    setScheduleForm(initialScheduleForm);
    setEditingScheduleId(null);
  }

  async function saveSchedule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    const amount = Number(scheduleForm.estimated_amount || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setError(t(language, "scheduleAmountError"));
      return;
    }

    setSavingSchedule(true);
    const supabase = getSupabaseClient();
    const payload = {
      schedule_type: scheduleForm.schedule_type,
      day_of_week: scheduleForm.schedule_type === "weekly" ? scheduleForm.day_of_week : null,
      first_day_of_month:
        scheduleForm.schedule_type === "monthly" || scheduleForm.schedule_type === "twice_per_month"
          ? Number(scheduleForm.first_day_of_month)
          : null,
      second_day_of_month:
        scheduleForm.schedule_type === "twice_per_month" ? Number(scheduleForm.second_day_of_month) : null,
      next_payment_date:
        scheduleForm.schedule_type === "biweekly" || scheduleForm.schedule_type === "custom"
          ? scheduleForm.next_payment_date
          : null,
      estimated_amount: amount,
      is_variable: scheduleForm.is_variable
    };

    const result = editingScheduleId
      ? await supabase.from("pay_schedules").update(payload).eq("id", editingScheduleId)
      : await supabase.from("pay_schedules").insert({ ...payload, user_id: user.id });

    setSavingSchedule(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    resetScheduleForm();
    await loadSchedules();
    setMessage(t(language, "payScheduleSaved"));
  }

  async function deleteSchedule(id: string) {
    const supabase = getSupabaseClient();
    const { error: deleteError } = await supabase.from("pay_schedules").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setSchedules((items) => items.filter((item) => item.id !== id));
  }

  async function handleLogout() {
    await signOut();
    router.replace("/login");
  }

  async function openBillingPortal() {
    setError("");
    setMessage("");
    setBillingLoading(true);

    try {
      const response = await fetch("/api/stripe/create-portal-session", { method: "POST" });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? t(language, "somethingWentWrong"));
      }

      window.location.assign(data.url);
    } catch (portalError) {
      setError(portalError instanceof Error ? portalError.message : t(language, "somethingWentWrong"));
      setBillingLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "settings")}
        title={t(language, "profileAndPaySchedule")}
        subtitle={t(language, "settingsSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      >
        <button className="btn-secondary" type="button" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" />
          {t(language, "logout")}
        </button>
      </PageHeader>

      {(error || message) ? (
        <p className={`mb-4 rounded-md px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"}`}>
          {error || message}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form className="card app-section-card space-y-5 p-5" onSubmit={saveProfile}>
          <div className="flex items-start gap-3">
            <span className="icon-chip-sm">
              <UserRound size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-black text-ink">{t(language, "userProfile")}</h2>
              <p className="mt-1 text-sm font-medium text-neutral-600">{t(language, "settingsSubtitle")}</p>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-line bg-neutral-50/60 p-4">
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "personalInfo")}</p>
          <label className="block space-y-2">
            <span className="field-label">{t(language, "fullName")}</span>
            <input className="field" value={profileForm.full_name} onChange={(event) => setProfileForm({ ...profileForm, full_name: event.target.value })} />
          </label>

          <label className="mt-3 block space-y-2">
            <span className="field-label">{t(language, "currentCashBalance")}</span>
            <input className="field" inputMode="decimal" value={profileForm.current_balance} onChange={(event) => setProfileForm({ ...profileForm, current_balance: event.target.value })} />
          </label>
          </div>

          <div className="rounded-[1.35rem] border border-line bg-neutral-50/60 p-4">
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "workProfile")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "mainIncomeType")}</span>
              <select className="field" value={profileForm.income_type} onChange={(event) => setProfileForm({ ...profileForm, income_type: event.target.value as IncomeType })}>
                {incomeTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "workType")}</span>
              <select className="field" value={profileForm.work_type} onChange={(event) => setProfileForm({ ...profileForm, work_type: event.target.value as WorkType })}>
                {workTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>
          </div>

          <div className="rounded-[1.35rem] border border-line bg-neutral-50/60 p-4">
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "location")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "currency")}</span>
              <select className="field" value={profileForm.currency} onChange={(event) => setProfileForm({ ...profileForm, currency: event.target.value })}>
                {currencies.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "country")}</span>
              <input className="field" value={profileForm.country} onChange={(event) => setProfileForm({ ...profileForm, country: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "state")}</span>
              <input className="field" value={profileForm.state} onChange={(event) => setProfileForm({ ...profileForm, state: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "city")}</span>
              <input className="field" value={profileForm.city} onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })} />
            </label>
          </div>
          </div>

          <div className="rounded-[1.35rem] border border-line bg-neutral-50/60 p-4">
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "appPreferences")}</p>
          <label className="block space-y-2">
            <span className="field-label">{t(language, "language")}</span>
            <select
              className="field"
              value={profileForm.language}
              onChange={(event) => changeLanguage(event.target.value as Language)}
            >
              {languages.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(language, option.labelKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "theme")}</span>
            <select
              className="field"
              value={profileForm.theme}
              onChange={(event) => changeTheme(event.target.value as AppTheme)}
            >
              <option value="dark">{t(language, "darkTheme")}</option>
              <option value="soft_light">{t(language, "softLightTheme")}</option>
              <option value="light">{t(language, "lightTheme")}</option>
            </select>
          </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" type="submit" disabled={savingProfile}>
              <UserRound size={18} aria-hidden="true" />
              {savingProfile ? t(language, "savingProfile") : t(language, "saveProfile")}
            </button>
            <Link className="btn-secondary flex-1" href="/dashboard">
              {t(language, "backToDashboard")}
            </Link>
          </div>
        </form>

        <section className="space-y-5">
          <AppSectionCard icon={Sparkles} title={t(language, "billing")} subtitle={t(language, "pricingSubtitle")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="icon-chip">
                  <Sparkles size={25} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-neutral-600">{t(language, "billing")}</p>
                  <p className="text-2xl font-black text-ink">
                    {t(language, "currentPlan")}: {t(language, currentPlanConfig.nameKey)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-neutral-600">
                    {t(language, "subscriptionStatus")}: {subscriptionStatusLabel(language, displaySubscriptionStatus)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isPaidPlan && hasBillingPortal ? (
                  <button className="btn-secondary" type="button" disabled={billingLoading} onClick={openBillingPortal}>
                    {billingLoading ? t(language, "loading") : t(language, "manageBilling")}
                  </button>
                ) : null}
                {isPaidPlan && !hasBillingPortal ? (
                  <p className="max-w-sm rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700">
                    {t(language, "billingDataIncomplete")}
                  </p>
                ) : null}
                {!isPaidPlan ? (
                  <Link className="btn-primary" href="/pricing">
                    {t(language, "upgrade")}
                  </Link>
                ) : null}
              </div>
            </div>
          </AppSectionCard>

          <form className="card space-y-4 p-5" onSubmit={saveSchedule}>
            <div className="flex items-start gap-3">
              <span className="icon-chip-sm">
                <CalendarDays size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-ink">
                  {editingScheduleId ? t(language, "editPaySchedule") : t(language, "addPaySchedule")}
                </h2>
                <p className="mt-1 text-sm font-medium text-neutral-600">{t(language, "paymentPattern")}</p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="field-label">{t(language, "paymentPattern")}</span>
              <select className="field" value={scheduleForm.schedule_type} onChange={(event) => setScheduleForm({ ...scheduleForm, schedule_type: event.target.value as PaymentScheduleType })}>
                {paymentScheduleTypes.map((type) => (
                  <option key={type} value={type}>
                    {scheduleTypeLabel(language, type)}
                  </option>
                ))}
              </select>
            </label>

            {scheduleForm.schedule_type === "weekly" ? (
              <label className="block space-y-2">
                <span className="field-label">{t(language, "dayOfWeek")}</span>
                <select className="field" value={scheduleForm.day_of_week} onChange={(event) => setScheduleForm({ ...scheduleForm, day_of_week: event.target.value as DayOfWeek })}>
                  {daysOfWeek.map((day) => (
                    <option key={day} value={day}>
                      {dayOfWeekLabel(language, day)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {scheduleForm.schedule_type === "biweekly" || scheduleForm.schedule_type === "custom" ? (
              <label className="block space-y-2">
                <span className="field-label">{t(language, "nextPaymentDate")}</span>
                <input className="field" type="date" value={scheduleForm.next_payment_date} onChange={(event) => setScheduleForm({ ...scheduleForm, next_payment_date: event.target.value })} />
              </label>
            ) : null}

            {scheduleForm.schedule_type === "monthly" || scheduleForm.schedule_type === "twice_per_month" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="field-label">
                    {scheduleForm.schedule_type === "monthly" ? t(language, "payDayOfMonth") : t(language, "firstPayDay")}
                  </span>
                  <input className="field" inputMode="numeric" value={scheduleForm.first_day_of_month} onChange={(event) => setScheduleForm({ ...scheduleForm, first_day_of_month: event.target.value })} />
                </label>
                {scheduleForm.schedule_type === "twice_per_month" ? (
                  <label className="block space-y-2">
                    <span className="field-label">{t(language, "secondPayDay")}</span>
                    <input className="field" inputMode="numeric" value={scheduleForm.second_day_of_month} onChange={(event) => setScheduleForm({ ...scheduleForm, second_day_of_month: event.target.value })} />
                  </label>
                ) : null}
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="field-label">{t(language, "estimatedPaymentAmount")}</span>
              <input className="field" inputMode="decimal" value={scheduleForm.estimated_amount} onChange={(event) => setScheduleForm({ ...scheduleForm, estimated_amount: event.target.value })} />
            </label>

            <label className="flex items-start gap-3 rounded-md border border-line bg-neutral-50 p-3">
              <input
                className="mt-1 h-4 w-4 accent-brand-600"
                type="checkbox"
                checked={scheduleForm.is_variable}
                onChange={(event) => setScheduleForm({ ...scheduleForm, is_variable: event.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium text-ink">{t(language, "paymentVaries")}</span>
                <span className="block text-sm text-neutral-600">{t(language, "paymentVariesHelper")}</span>
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button className="btn-primary flex-1" type="submit" disabled={savingSchedule}>
                <Plus size={18} aria-hidden="true" />
                {savingSchedule ? t(language, "saving") : editingScheduleId ? t(language, "saveSchedule") : t(language, "addSchedule")}
              </button>
              {editingScheduleId ? (
                <button className="btn-secondary" type="button" onClick={resetScheduleForm}>
                  {t(language, "cancel")}
                </button>
              ) : null}
              <Link className="btn-secondary flex-1" href="/dashboard">
                {t(language, "backToDashboard")}
              </Link>
            </div>
          </form>

          <div className="space-y-3">
            {loading ? (
              <div className="card p-5 text-sm text-neutral-600">{t(language, "loadingSchedules")}</div>
            ) : schedules.length === 0 ? (
              <EmptyState icon={Plus} title={t(language, "noPaySchedulesYet")} body={t(language, "noPayScheduleHelper")}>
                <button className="btn-primary" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  <Plus size={17} aria-hidden="true" />
                  {t(language, "addSchedule")}
                </button>
              </EmptyState>
            ) : (
              schedules.map((schedule) => (
                <article key={schedule.id} className="card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="icon-chip-sm">
                        <WalletCards size={20} aria-hidden="true" />
                      </span>
                      <div>
                      <p className="font-black capitalize text-ink">
                        {scheduleTypeLabel(language, schedule.schedule_type)}
                      </p>
                      <p className="text-sm font-medium text-neutral-600">{describeSchedule(schedule, language)}</p>
                      </div>
                    </div>
                    <p className="text-lg font-black text-ink">{formatCurrency(schedule.estimated_amount, profileForm.currency)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-secondary" type="button" onClick={() => editSchedule(schedule)}>
                      <Pencil size={17} aria-hidden="true" />
                      {t(language, "edit")}
                    </button>
                    <button className="btn-danger" type="button" onClick={() => deleteSchedule(schedule.id)}>
                      <Trash2 size={17} aria-hidden="true" />
                      {t(language, "delete")}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function describeSchedule(schedule: PaySchedule, language: Language) {
  if (schedule.schedule_type === "weekly") {
    return `${t(language, "every")} ${dayOfWeekLabel(language, schedule.day_of_week ?? "Friday")}`;
  }

  if (schedule.schedule_type === "biweekly") {
    return t(language, "everyTwoWeeksStarting", {
      date: schedule.next_payment_date ? formatDate(schedule.next_payment_date, language) : t(language, "nextPayDate")
    });
  }

  if (schedule.schedule_type === "twice_per_month") {
    return t(language, "onTheDays", {
      first: schedule.first_day_of_month ?? "",
      second: schedule.second_day_of_month ?? ""
    });
  }

  if (schedule.schedule_type === "monthly") {
    return t(language, "onDayEachMonth", { day: schedule.first_day_of_month ?? "" });
  }

  return schedule.next_payment_date
    ? t(language, "customPaymentOn", { date: formatDate(schedule.next_payment_date, language) })
    : t(language, "customSchedule");
}
