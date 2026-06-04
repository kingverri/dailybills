"use client";

import { ArrowLeft, ArrowRight, WalletCards } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { currencies, daysOfWeek, incomeTypes, paymentScheduleTypes, workLogSourceOptionsByType, workLogTypes, workTypes } from "@/lib/constants";
import { dayOfWeekLabel, scheduleTypeLabel, t, workLogTypeLabel } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import type { DayOfWeek, IncomeType, PaymentScheduleType, WorkLogType, WorkType } from "@/types/app";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? user?.user_metadata?.full_name ?? "");
  const [currentBalance, setCurrentBalance] = useState(String(profile?.current_balance ?? ""));
  const [incomeType, setIncomeType] = useState<IncomeType>(profile?.income_type ?? "Gig work / driver");
  const [currency, setCurrency] = useState(profile?.currency ?? "USD");
  const [country, setCountry] = useState(profile?.country ?? "United States");
  const [state, setState] = useState(profile?.state ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [preferredWorkTypes, setPreferredWorkTypes] = useState<WorkLogType[]>(
    profile?.preferred_work_types?.length ? profile.preferred_work_types : [profile?.default_work_type ?? "driver"]
  );
  const [defaultWorkType, setDefaultWorkType] = useState<WorkLogType>(profile?.default_work_type ?? "driver");
  const [preferredPlatforms, setPreferredPlatforms] = useState<string[]>(
    profile?.preferred_platforms?.length ? profile.preferred_platforms : [profile?.default_platform ?? profile?.work_type ?? "DoorDash"]
  );
  const [defaultPlatform, setDefaultPlatform] = useState(profile?.default_platform ?? profile?.work_type ?? "DoorDash");
  const [scheduleType, setScheduleType] = useState<PaymentScheduleType>("weekly");
  const [dayOfWeek, setDayOfWeek] = useState<DayOfWeek>("Friday");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [firstDay, setFirstDay] = useState("10");
  const [secondDay, setSecondDay] = useState("25");
  const [nextPaymentDate, setNextPaymentDate] = useState("");
  const [isVariable, setIsVariable] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const language = profile?.language ?? "en";
  const selectedWorkTypes = preferredWorkTypes.length > 0 ? preferredWorkTypes : [defaultWorkType];
  const platformOptions: string[] = Array.from(
    new Set([...selectedWorkTypes.flatMap((type) => [...workLogSourceOptionsByType[type]]), ...preferredPlatforms])
  );

  function legacyWorkTypeFromPlatform(platform: string): WorkType {
    return workTypes.includes(platform as WorkType) ? (platform as WorkType) : "Other";
  }

  function togglePreferredWorkType(type: WorkLogType) {
    const exists = preferredWorkTypes.includes(type);
    const nextTypes = exists ? preferredWorkTypes.filter((item) => item !== type) : [...preferredWorkTypes, type];
    const safeTypes = nextTypes.length > 0 ? nextTypes : [type];
    const nextDefaultWorkType = safeTypes.includes(defaultWorkType) ? defaultWorkType : safeTypes[0];
    const nextPlatformOptions: string[] = Array.from(new Set(safeTypes.flatMap((item) => [...workLogSourceOptionsByType[item]])));
    const nextDefaultPlatform = nextPlatformOptions.includes(defaultPlatform) ? defaultPlatform : nextPlatformOptions[0] ?? "Other";

    setPreferredWorkTypes(safeTypes);
    setDefaultWorkType(nextDefaultWorkType);
    setDefaultPlatform(nextDefaultPlatform);
    setPreferredPlatforms(preferredPlatforms.filter((platform) => nextPlatformOptions.includes(platform)));
  }

  function togglePreferredPlatform(platform: string) {
    const exists = preferredPlatforms.includes(platform);
    const nextPlatforms = exists ? preferredPlatforms.filter((item) => item !== platform) : [...preferredPlatforms, platform];
    const safePlatforms = nextPlatforms.length > 0 ? nextPlatforms : [platform];

    setPreferredPlatforms(safePlatforms);
    setDefaultPlatform(safePlatforms.includes(defaultPlatform) ? defaultPlatform : safePlatforms[0]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    const balance = Number(currentBalance);
    const amount = Number(estimatedAmount || 0);

    if (!Number.isFinite(balance) || balance < 0) {
      setError(t(language, "balanceError"));
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      setError(t(language, "amountError"));
      return;
    }

    if ((scheduleType === "biweekly" || scheduleType === "custom") && !nextPaymentDate) {
      setError(t(language, "nextPaymentDateError"));
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          full_name: fullName.trim() || null,
          current_balance: balance,
          income_type: incomeType,
          currency,
          country: country.trim() || "United States",
          state: state.trim() || null,
          city: city.trim() || null,
          work_type: legacyWorkTypeFromPlatform(defaultPlatform),
          preferred_work_types: selectedWorkTypes,
          preferred_platforms: preferredPlatforms,
          default_work_type: defaultWorkType,
          default_platform: defaultPlatform,
          language,
          onboarding_completed: true
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const { error: scheduleError } = await supabase.from("pay_schedules").insert({
      user_id: user.id,
      schedule_type: scheduleType,
      day_of_week: scheduleType === "weekly" ? dayOfWeek : null,
      first_day_of_month:
        scheduleType === "monthly" || scheduleType === "twice_per_month" ? Number(firstDay) : null,
      second_day_of_month: scheduleType === "twice_per_month" ? Number(secondDay) : null,
      next_payment_date: scheduleType === "biweekly" || scheduleType === "custom" ? nextPaymentDate : null,
      estimated_amount: amount,
      is_variable: isVariable
    });

    setLoading(false);

    if (scheduleError) {
      setError(scheduleError.message);
      return;
    }

    await refreshProfile();
    router.replace("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl">
      {profile?.onboarding_completed ? (
        <Link className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700" href="/dashboard">
          <ArrowLeft size={16} aria-hidden="true" />
          {t(language, "backToDashboard")}
        </Link>
      ) : null}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-400 text-slate-950 shadow-glow">
          <WalletCards size={26} aria-hidden="true" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{t(language, "dashboardSetup")}</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{t(language, "buildFirstPlan")}</h1>
        <p className="mt-2 text-sm text-neutral-600">
          {t(language, "onboardingHelper")}
        </p>
      </div>

      <form className="card space-y-6 p-5 sm:p-6" onSubmit={handleSubmit}>
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">{t(language, "yourBasics")}</h2>
          <label className="block space-y-2">
            <span className="field-label">{t(language, "fullName")}</span>
            <input className="field" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "currentCashBalance")}</span>
            <input className="field" inputMode="decimal" placeholder="350.00" value={currentBalance} onChange={(event) => setCurrentBalance(event.target.value)} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "mainIncomeType")}</span>
              <select className="field" value={incomeType} onChange={(event) => setIncomeType(event.target.value as IncomeType)}>
                {incomeTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="space-y-3 rounded-[1.35rem] border border-line bg-neutral-50/70 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "workSetup")}</p>
            <p className="field-label">{t(language, "mainWorkType")}</p>
            <div className="flex flex-wrap gap-2">
              {workLogTypes.map((type) => (
                <button
                  key={type}
                  className={preferredWorkTypes.includes(type) ? "btn-primary min-h-10 px-3" : "btn-secondary min-h-10 px-3"}
                  type="button"
                  onClick={() => togglePreferredWorkType(type)}
                >
                  {workLogTypeLabel(language, type)}
                </button>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="field-label">{t(language, "mainWork")}</span>
              <select className="field" value={defaultWorkType} onChange={(event) => setDefaultWorkType(event.target.value as WorkLogType)}>
                {selectedWorkTypes.map((type) => (
                  <option key={type} value={type}>
                    {workLogTypeLabel(language, type)}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <p className="field-label">{t(language, "jobsPlatforms")}</p>
              <div className="flex flex-wrap gap-2">
                {platformOptions.map((platform) => (
                  <button
                    key={platform}
                    className={preferredPlatforms.includes(platform) ? "btn-primary min-h-10 px-3" : "btn-secondary min-h-10 px-3"}
                    type="button"
                    onClick={() => togglePreferredPlatform(platform)}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>

            <label className="block space-y-2">
              <span className="field-label">{t(language, "defaultPlatform")}</span>
              <select
                className="field"
                value={defaultPlatform}
                onChange={(event) => {
                  setDefaultPlatform(event.target.value);
                  if (!preferredPlatforms.includes(event.target.value)) {
                    setPreferredPlatforms([...preferredPlatforms, event.target.value]);
                  }
                }}
              >
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "currency")}</span>
              <select className="field" value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {currencies.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "country")}</span>
              <input className="field" value={country} onChange={(event) => setCountry(event.target.value)} />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "state")}</span>
              <input className="field" value={state} onChange={(event) => setState(event.target.value)} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "city")}</span>
              <input className="field" value={city} onChange={(event) => setCity(event.target.value)} />
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-line pt-6">
          <h2 className="text-lg font-semibold text-ink">{t(language, "paySchedule")}</h2>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "paymentPattern")}</span>
            <select className="field" value={scheduleType} onChange={(event) => setScheduleType(event.target.value as PaymentScheduleType)}>
              {paymentScheduleTypes.map((type) => (
                <option key={type} value={type}>
                  {scheduleTypeLabel(language, type)}
                </option>
              ))}
            </select>
          </label>

          {scheduleType === "weekly" ? (
            <label className="block space-y-2">
              <span className="field-label">{t(language, "dayOfWeek")}</span>
              <select className="field" value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value as DayOfWeek)}>
                {daysOfWeek.map((day) => (
                  <option key={day} value={day}>
                    {dayOfWeekLabel(language, day)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {scheduleType === "biweekly" || scheduleType === "custom" ? (
            <label className="block space-y-2">
              <span className="field-label">{t(language, "nextPaymentDate")}</span>
              <input className="field" type="date" value={nextPaymentDate} onChange={(event) => setNextPaymentDate(event.target.value)} />
            </label>
          ) : null}

          {scheduleType === "monthly" || scheduleType === "twice_per_month" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="field-label">
                  {scheduleType === "monthly" ? t(language, "payDayOfMonth") : t(language, "firstPayDay")}
                </span>
                <input className="field" inputMode="numeric" value={firstDay} onChange={(event) => setFirstDay(event.target.value)} />
              </label>
              {scheduleType === "twice_per_month" ? (
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "secondPayDay")}</span>
                  <input className="field" inputMode="numeric" value={secondDay} onChange={(event) => setSecondDay(event.target.value)} />
                </label>
              ) : null}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="field-label">{t(language, "estimatedPaymentAmount")}</span>
            <input className="field" inputMode="decimal" placeholder="600.00" value={estimatedAmount} onChange={(event) => setEstimatedAmount(event.target.value)} />
          </label>

          <label className="flex items-start gap-3 rounded-md border border-line bg-neutral-50 p-3">
            <input
              className="mt-1 h-4 w-4 accent-brand-600"
              type="checkbox"
              checked={isVariable}
              onChange={(event) => setIsVariable(event.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-ink">{t(language, "myPaymentVaries")}</span>
              <span className="block text-sm text-neutral-600">{t(language, "myPaymentVariesHelper")}</span>
            </span>
          </label>
        </section>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary flex-1" type="submit" disabled={loading}>
            {loading ? t(language, "savingPlan") : t(language, "goToDashboard")}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          {profile?.onboarding_completed ? (
            <Link className="btn-secondary flex-1" href="/dashboard">
              {t(language, "backToDashboard")}
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
