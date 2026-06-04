"use client";

import { Plus } from "lucide-react";
import { TimePicker12Hour } from "@/components/TimePicker12Hour";
import { AppMetricCard } from "@/components/app-ui";
import { workLogSourceOptionsByType, workLogTypes } from "@/lib/constants";
import { calculateDriverLogMetrics } from "@/lib/financeCalculations";
import { formatCurrency, formatDurationFromDecimalHours, formatHourlyRate, toDateInputValue } from "@/lib/format";
import { t, workLogTypeLabel } from "@/lib/i18n";
import type { DriverLog, Profile, WorkLogType } from "@/types/app";

export type WorkRecordFormValues = {
  date: string;
  work_type: WorkLogType;
  platform: string;
  start_time: string;
  end_time: string;
  miles_driven: string;
  gross_earnings: string;
  tips_received: string;
  gas_spent: string;
  gas_price_per_gallon: string;
  extra_expenses: string;
  stops_completed: string;
  hourly_rate: string;
  extra_expense_notes: string;
  notes: string;
};

const driverLikeTypes: WorkLogType[] = ["driver", "delivery_courier"];
const hourlyRateTypes: WorkLogType[] = [
  "restaurant_worker",
  "server_waiter",
  "warehouse",
  "construction",
  "landscaping",
  "other"
];

function isWorkLogType(value?: string | null): value is WorkLogType {
  return workLogTypes.includes(value as WorkLogType);
}

function getSourceOptions(workType: WorkLogType, preferredPlatforms: string[] = []) {
  const baseOptions: string[] = [...workLogSourceOptionsByType[workType]];
  const extraOptions = preferredPlatforms.filter((platform) => platform && !baseOptions.includes(platform));
  return [...baseOptions, ...extraOptions];
}

function uniqueValues(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function getProfilePreferredWorkTypes(profile?: Profile | null) {
  const savedTypes = Array.isArray(profile?.preferred_work_types) ? profile.preferred_work_types : [];
  const defaultType = isWorkLogType(profile?.default_work_type) ? profile?.default_work_type : null;
  const types = uniqueValues([defaultType, ...savedTypes]).filter(isWorkLogType);
  return types.length > 0 ? types : (["driver"] as WorkLogType[]);
}

export function getProfilePreferredPlatforms(profile?: Profile | null) {
  const savedPlatforms = Array.isArray(profile?.preferred_platforms) ? profile.preferred_platforms : [];
  return uniqueValues([
    profile?.default_platform,
    ...savedPlatforms,
    typeof profile?.work_type === "string" && profile.work_type !== "Other" ? profile.work_type : null
  ]);
}

export function createWorkRecordForm(profile?: Profile | null, overrides: Partial<WorkRecordFormValues> = {}): WorkRecordFormValues {
  const preferredWorkTypes = getProfilePreferredWorkTypes(profile);
  const workType = overrides.work_type ?? (isWorkLogType(profile?.default_work_type) ? profile.default_work_type : preferredWorkTypes[0]);
  const preferredPlatforms = getProfilePreferredPlatforms(profile);
  const options = getSourceOptions(workType, preferredPlatforms);
  const defaultPlatform =
    overrides.platform ??
    (profile?.default_platform && options.includes(profile.default_platform) ? profile.default_platform : null) ??
    preferredPlatforms.find((platform) => options.includes(platform)) ??
    options[0] ??
    "Other";

  return {
    date: toDateInputValue(),
    work_type: workType,
    platform: defaultPlatform,
    start_time: "",
    end_time: "",
    miles_driven: "",
    gross_earnings: "",
    tips_received: "",
    gas_spent: "",
    gas_price_per_gallon: "",
    extra_expenses: "",
    stops_completed: "",
    hourly_rate: "",
    extra_expense_notes: "",
    notes: "",
    ...overrides
  };
}

export function timeForWorkRecordInput(time?: string | null) {
  return time ? time.slice(0, 5) : "";
}

export function workRecordFromLog(log: DriverLog): WorkRecordFormValues {
  return createWorkRecordForm(null, {
    date: log.date,
    work_type: log.work_type ?? "driver",
    platform: log.platform,
    start_time: timeForWorkRecordInput(log.start_time),
    end_time: timeForWorkRecordInput(log.end_time),
    miles_driven: String(log.miles_driven),
    gross_earnings: String(log.gross_earnings),
    tips_received: log.tips_received ? String(log.tips_received) : "",
    gas_spent: String(log.gas_spent),
    gas_price_per_gallon: String(log.gas_price_per_gallon),
    extra_expenses: String(log.extra_expenses),
    stops_completed: log.stops_completed ? String(log.stops_completed) : "",
    hourly_rate: log.hourly_rate ? String(log.hourly_rate) : "",
    extra_expense_notes: log.extra_expense_notes ?? "",
    notes: log.notes ?? ""
  });
}

export function getWorkRecordNumbers(form: WorkRecordFormValues) {
  return {
    gross: Number(form.gross_earnings || 0),
    tipsReceived: Number(form.tips_received || 0),
    miles: Number(form.miles_driven || 0),
    gasSpent: Number(form.gas_spent || 0),
    gasPrice: Number(form.gas_price_per_gallon || 0),
    extraExpenses: Number(form.extra_expenses || 0),
    stopsCompleted: Number(form.stops_completed || 0),
    hourlyRate: Number(form.hourly_rate || 0)
  };
}

export function shouldShowStopsField(form: WorkRecordFormValues) {
  return driverLikeTypes.includes(form.work_type) && form.platform === "OnTrac";
}

export function buildWorkRecordPayload(form: WorkRecordFormValues) {
  const numbers = getWorkRecordNumbers(form);
  const showDriverFields = driverLikeTypes.includes(form.work_type);
  const showStopsField = shouldShowStopsField(form);

  return {
    date: form.date,
    work_type: form.work_type,
    platform: form.platform,
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    miles_driven: showDriverFields ? numbers.miles : 0,
    gross_earnings: numbers.gross,
    tips_received: numbers.tipsReceived,
    gas_spent: showDriverFields ? numbers.gasSpent : 0,
    gas_price_per_gallon: showDriverFields ? numbers.gasPrice : 0,
    extra_expenses: numbers.extraExpenses,
    stops_completed: showStopsField ? numbers.stopsCompleted : 0,
    hourly_rate: hourlyRateTypes.includes(form.work_type) ? numbers.hourlyRate : 0,
    extra_expense_notes: form.extra_expense_notes.trim() || null,
    notes: form.notes.trim() || null
  };
}

export function validateWorkRecordForm(form: WorkRecordFormValues) {
  const numbers = getWorkRecordNumbers(form);
  const numericValues = Object.values(numbers);

  return Boolean(
    form.date &&
      form.platform &&
      form.start_time &&
      form.end_time &&
      numericValues.every((value) => Number.isFinite(value) && value >= 0)
  );
}

export function WorkRecordForm({
  form,
  setForm,
  currency,
  language,
  profile,
  saving,
  submitLabel,
  onSubmit,
  onCancel,
  footer
}: {
  form: WorkRecordFormValues;
  setForm: (form: WorkRecordFormValues) => void;
  currency: string;
  language: string;
  profile?: Profile | null;
  saving?: boolean;
  submitLabel: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  footer?: React.ReactNode;
}) {
  const preferredWorkTypes = getProfilePreferredWorkTypes(profile);
  const preferredPlatforms = getProfilePreferredPlatforms(profile);
  const jobSourceOptions = getSourceOptions(form.work_type, preferredPlatforms);
  const showDriverFields = driverLikeTypes.includes(form.work_type);
  const showTipsField = !showDriverFields || !["OnTrac", "Amazon Flex"].includes(form.platform);
  const showHourlyRateField = hourlyRateTypes.includes(form.work_type);
  const showStopsField = shouldShowStopsField(form);
  const numbers = getWorkRecordNumbers(form);
  const preview = calculateDriverLogMetrics({
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    miles_driven: showDriverFields ? numbers.miles : 0,
    gross_earnings: numbers.gross,
    tips_received: numbers.tipsReceived,
    gas_spent: showDriverFields ? numbers.gasSpent : 0,
    gas_price_per_gallon: showDriverFields ? numbers.gasPrice : 0,
    extra_expenses: numbers.extraExpenses,
    stops_completed: showStopsField ? numbers.stopsCompleted : 0
  });

  function setWorkType(nextWorkType: WorkLogType) {
    const nextOptions = getSourceOptions(nextWorkType, preferredPlatforms);
    setForm({
      ...form,
      work_type: nextWorkType,
      platform: nextOptions.includes(form.platform) ? form.platform : nextOptions[0] ?? "Other",
      miles_driven: driverLikeTypes.includes(nextWorkType) ? form.miles_driven : "",
      gas_spent: driverLikeTypes.includes(nextWorkType) ? form.gas_spent : "",
      gas_price_per_gallon: driverLikeTypes.includes(nextWorkType) ? form.gas_price_per_gallon : "",
      stops_completed: "",
      hourly_rate: hourlyRateTypes.includes(nextWorkType) ? form.hourly_rate : ""
    });
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="rounded-[1.35rem] border border-line bg-neutral-50/70 p-4">
        <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "dayAndWorkType")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="field-label">{t(language, "date")}</span>
            <input className="field" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="field-label">{t(language, "mainWorkType")}</span>
            <select className="field" value={form.work_type} onChange={(event) => setWorkType(event.target.value as WorkLogType)}>
              {workLogTypes.map((type) => (
                <option key={type} value={type}>
                  {workLogTypeLabel(language, type)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {preferredWorkTypes.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {preferredWorkTypes.map((type) => (
              <button
                key={type}
                className={form.work_type === type ? "btn-primary min-h-10 px-3" : "btn-secondary min-h-10 px-3"}
                type="button"
                onClick={() => setWorkType(type)}
              >
                {workLogTypeLabel(language, type)}
              </button>
            ))}
          </div>
        ) : null}

        {preferredPlatforms.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {preferredPlatforms.map((platform) => (
              <button
                key={platform}
                className={form.platform === platform ? "btn-primary min-h-10 px-3" : "btn-secondary min-h-10 px-3"}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    platform,
                    stops_completed: platform === "OnTrac" ? form.stops_completed : ""
                  })
                }
              >
                {platform}
              </button>
            ))}
          </div>
        ) : null}

        <label className="mt-3 block space-y-2">
          <span className="field-label">{t(language, "jobsPlatforms")}</span>
          <select
            className="field"
            value={form.platform}
            onChange={(event) =>
              setForm({
                ...form,
                platform: event.target.value,
                stops_completed: event.target.value === "OnTrac" ? form.stops_completed : ""
              })
            }
          >
            {jobSourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-[1.35rem] border border-line bg-neutral-50/70 p-4">
        <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "scheduleSection")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <TimePicker12Hour label={t(language, "startTime")} value={form.start_time} onChange={(value) => setForm({ ...form, start_time: value })} />
          <TimePicker12Hour label={t(language, "endTime")} value={form.end_time} onChange={(value) => setForm({ ...form, end_time: value })} />
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-line bg-neutral-50/70 p-4">
        <p className="mb-3 text-sm font-black uppercase tracking-wide text-neutral-500">{t(language, "earningsAndExpenses")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="field-label">{showDriverFields ? t(language, "grossEarnings") : t(language, "grossPay")}</span>
            <input className="field" inputMode="decimal" value={form.gross_earnings} onChange={(event) => setForm({ ...form, gross_earnings: event.target.value })} />
          </label>
          {showTipsField ? (
            <label className="block space-y-2">
              <span className="field-label">{t(language, "tipsReceived")}</span>
              <input className="field" inputMode="decimal" value={form.tips_received} onChange={(event) => setForm({ ...form, tips_received: event.target.value })} />
            </label>
          ) : null}
          {showHourlyRateField ? (
            <label className="block space-y-2">
              <span className="field-label">{t(language, "hourlyRate")}</span>
              <input className="field" inputMode="decimal" value={form.hourly_rate} onChange={(event) => setForm({ ...form, hourly_rate: event.target.value })} />
            </label>
          ) : null}
          {showDriverFields ? (
            <>
              <label className="block space-y-2">
                <span className="field-label">{t(language, "milesDriven")}</span>
                <input className="field" inputMode="decimal" value={form.miles_driven} onChange={(event) => setForm({ ...form, miles_driven: event.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="field-label">{t(language, "gasSpent")}</span>
                <input className="field" inputMode="decimal" value={form.gas_spent} onChange={(event) => setForm({ ...form, gas_spent: event.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="field-label">{t(language, "gasPricePerGallon")}</span>
                <input className="field" inputMode="decimal" value={form.gas_price_per_gallon} onChange={(event) => setForm({ ...form, gas_price_per_gallon: event.target.value })} />
              </label>
            </>
          ) : null}
          {showStopsField ? (
            <label className="block space-y-2">
              <span className="field-label">{t(language, "stopsCompleted")}</span>
              <input className="field" inputMode="numeric" value={form.stops_completed} onChange={(event) => setForm({ ...form, stops_completed: event.target.value })} />
            </label>
          ) : null}
          <label className="block space-y-2">
            <span className="field-label">{t(language, "extraExpenses")}</span>
            <input className="field" inputMode="decimal" value={form.extra_expenses} onChange={(event) => setForm({ ...form, extra_expenses: event.target.value })} />
          </label>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-line bg-neutral-50/70 p-4">
        <p className="text-sm font-semibold text-ink">{t(language, "tripMath")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <AppMetricCard compact label={t(language, "hoursWorkedCalculated")} value={formatDurationFromDecimalHours(preview.hoursWorked)} />
          <AppMetricCard compact label={t(language, "totalEarnings")} value={formatCurrency(preview.totalEarnings, currency)} />
          <AppMetricCard compact label={t(language, "netProfit")} value={formatCurrency(preview.netProfit, currency)} />
          <AppMetricCard compact label={t(language, "netPerHour")} value={formatHourlyRate(preview.netProfitPerHour, currency, language)} />
          {showStopsField && numbers.stopsCompleted > 0 ? (
            <>
              <AppMetricCard compact label={t(language, "grossPerStop")} value={formatCurrency(preview.grossPerStop, currency)} />
              <AppMetricCard compact label={t(language, "netPerStop")} value={formatCurrency(preview.netPerStop, currency)} />
            </>
          ) : showDriverFields ? (
            <AppMetricCard compact label={t(language, "gallonsBought")} value={preview.gallonsBought.toFixed(2)} />
          ) : null}
        </div>
      </div>

      <label className="block space-y-2">
        <span className="field-label">{t(language, "extraExpenseNotes")}</span>
        <textarea className="field min-h-20" value={form.extra_expense_notes} onChange={(event) => setForm({ ...form, extra_expense_notes: event.target.value })} />
      </label>

      <label className="block space-y-2">
        <span className="field-label">{t(language, "generalNotes")}</span>
        <textarea className="field min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>

      {footer}

      <div className="flex flex-wrap gap-2">
        <button className="btn-primary flex-1" type="submit" disabled={saving}>
          <Plus size={18} aria-hidden="true" />
          {saving ? t(language, "saving") : submitLabel}
        </button>
        {onCancel ? (
          <button className="btn-secondary flex-1" type="button" onClick={onCancel}>
            {t(language, "cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
