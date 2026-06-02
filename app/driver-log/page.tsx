"use client";

import {
  BriefcaseBusiness,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronUp,
  Clock3,
  ClipboardList,
  DollarSign,
  Hammer,
  HandCoins,
  Leaf,
  MapPin,
  Package,
  Pencil,
  Plus,
  Receipt,
  Route,
  Sparkles,
  Trash2,
  Truck,
  Utensils
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { TimePicker12Hour } from "@/components/TimePicker12Hour";
import { weeklySettlementDays, workLogSourceOptionsByType, workLogTypes } from "@/lib/constants";
import {
  calculateDriverLogMetrics,
  calculateWeeklyDriverSummaryForRange,
  getWeekRangeBySettlementDay
} from "@/lib/financeCalculations";
import {
  buildDriverLogExportRows,
  exportToCSV,
  exportToXLSX
} from "@/lib/exportUtils";
import {
  formatCurrency,
  formatDate,
  formatDurationFromDecimalHours,
  formatHourlyRate,
  formatTime12Hour,
  toDateInputValue
} from "@/lib/format";
import { settlementDayLabel, t, workLogTypeLabel } from "@/lib/i18n";
import {
  canAddDriverLog,
  canUseWeeklyHistory,
  canUseWeeklySettlement,
  getCurrentMonthDriverLogCount,
  getCurrentPlan
} from "@/lib/planLimits";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import type { DriverLog, PaySchedule, WeeklySettlementDay, WorkLogType } from "@/types/app";

type DriverLogForm = {
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
  extra_expense_notes: string;
  notes: string;
};

type ExportFormat = "csv" | "xlsx" | "google";

const initialForm: DriverLogForm = {
  date: toDateInputValue(),
  work_type: "driver",
  platform: "DoorDash",
  start_time: "",
  end_time: "",
  miles_driven: "",
  gross_earnings: "",
  tips_received: "",
  gas_spent: "",
  gas_price_per_gallon: "",
  extra_expenses: "",
  stops_completed: "",
  extra_expense_notes: "",
  notes: ""
};

function dayOfWeekToSettlementDay(day?: string | null): WeeklySettlementDay | null {
  const value = day?.toLowerCase();
  return weeklySettlementDays.find((item) => item === value) ?? null;
}

function timeForInput(time?: string | null) {
  return time ? time.slice(0, 5) : "";
}

function workLogTypeIcon(type: WorkLogType | string | null | undefined) {
  const icons = {
    driver: Car,
    cleaner: Sparkles,
    restaurant_worker: Utensils,
    server_waiter: HandCoins,
    warehouse: Package,
    construction: Hammer,
    landscaping: Leaf,
    delivery_courier: Truck,
    other: BriefcaseBusiness
  };

  return icons[String(type ?? "other") as keyof typeof icons] ?? BriefcaseBusiness;
}

export default function DriverLogPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [logs, setLogs] = useState<DriverLog[]>([]);
  const [paySchedules, setPaySchedules] = useState<PaySchedule[]>([]);
  const [form, setForm] = useState<DriverLogForm>(initialForm);
  const [settlementDay, setSettlementDay] = useState<WeeklySettlementDay>("friday");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showCurrentFullSummary, setShowCurrentFullSummary] = useState(false);
  const [showPreviousFullSummary, setShowPreviousFullSummary] = useState(false);
  const [detailWeek, setDetailWeek] = useState<"current" | "previous" | null>(null);
  const [exportStartDate, setExportStartDate] = useState(toDateInputValue());
  const [exportEndDate, setExportEndDate] = useState(toDateInputValue());
  const [exportError, setExportError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettlement, setSavingSettlement] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const language = profile?.language ?? "en";
  const currency = profile?.currency ?? "USD";
  const currentPlan = getCurrentPlan(profile);
  const monthlyDriverLogCount = useMemo(() => getCurrentMonthDriverLogCount(logs), [logs]);
  const canCreateDriverLog = canAddDriverLog(currentPlan, monthlyDriverLogCount);
  const canChangeSettlementDay = canUseWeeklySettlement(currentPlan);
  const canViewWeeklyHistory = canUseWeeklyHistory(currentPlan);
  const gross = Number(form.gross_earnings || 0);
  const tipsReceived = Number(form.tips_received || 0);
  const miles = Number(form.miles_driven || 0);
  const gasSpent = Number(form.gas_spent || 0);
  const gasPrice = Number(form.gas_price_per_gallon || 0);
  const extraExpenses = Number(form.extra_expenses || 0);
  const stopsCompleted = Number(form.stops_completed || 0);
  const jobSourceOptions = useMemo(() => {
    const options: string[] = [...workLogSourceOptionsByType[form.work_type]];
    return form.platform && !options.includes(form.platform) ? [...options, form.platform] : options;
  }, [form.platform, form.work_type]);
  const showStopsField =
    (form.work_type === "driver" || form.work_type === "delivery_courier") && form.platform === "OnTrac";
  const preview = useMemo(
    () =>
      calculateDriverLogMetrics({
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        miles_driven: miles,
        gross_earnings: gross,
        tips_received: tipsReceived,
        gas_spent: gasSpent,
        gas_price_per_gallon: gasPrice,
        extra_expenses: extraExpenses,
        stops_completed: stopsCompleted
      }),
    [extraExpenses, form.end_time, form.start_time, gasPrice, gasSpent, gross, miles, stopsCompleted, tipsReceived]
  );
  const currentWeekRange = useMemo(() => getWeekRangeBySettlementDay(new Date(), settlementDay), [settlementDay]);
  const previousWeekRange = useMemo(() => {
    const previousAnchor = new Date(currentWeekRange.start);
    previousAnchor.setDate(previousAnchor.getDate() - 1);
    return getWeekRangeBySettlementDay(previousAnchor, settlementDay);
  }, [currentWeekRange.start, settlementDay]);
  const currentWeekSummary = useMemo(
    () => calculateWeeklyDriverSummaryForRange(logs, currentWeekRange),
    [currentWeekRange, logs]
  );
  const previousWeekSummary = useMemo(
    () => calculateWeeklyDriverSummaryForRange(logs, previousWeekRange),
    [logs, previousWeekRange]
  );
  const currentWeekLogs = useMemo(
    () =>
      logs.filter((log) => log.date >= currentWeekRange.startDate && log.date <= currentWeekRange.endDate),
    [currentWeekRange.endDate, currentWeekRange.startDate, logs]
  );
  const previousWeekLogs = useMemo(
    () =>
      logs.filter((log) => log.date >= previousWeekRange.startDate && log.date <= previousWeekRange.endDate),
    [previousWeekRange.endDate, previousWeekRange.startDate, logs]
  );
  const selectedWeekLogs = detailWeek === "previous" ? previousWeekLogs : currentWeekLogs;

  async function loadData() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const [logResult, scheduleResult] = await Promise.all([
      supabase.from("driver_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("pay_schedules").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    if (logResult.error || scheduleResult.error) {
      setError(logResult.error?.message ?? scheduleResult.error?.message ?? "");
    } else {
      setLogs(logResult.data ?? []);
      setPaySchedules(scheduleResult.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const weeklyScheduleDay = dayOfWeekToSettlementDay(
      paySchedules.find((schedule) => schedule.schedule_type === "weekly")?.day_of_week
    );
    setSettlementDay(profile?.weekly_settlement_day ?? weeklyScheduleDay ?? "friday");
  }, [paySchedules, profile?.weekly_settlement_day]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  }

  function editLog(log: DriverLog) {
    setEditingId(log.id);
    setShowForm(true);
    setForm({
      date: log.date,
      work_type: log.work_type ?? "driver",
      platform: log.platform,
      start_time: timeForInput(log.start_time),
      end_time: timeForInput(log.end_time),
      miles_driven: String(log.miles_driven),
      gross_earnings: String(log.gross_earnings),
      tips_received: log.tips_received ? String(log.tips_received) : "",
      gas_spent: String(log.gas_spent),
      gas_price_per_gallon: String(log.gas_price_per_gallon),
      extra_expenses: String(log.extra_expenses),
      stops_completed: log.stops_completed ? String(log.stops_completed) : "",
      extra_expense_notes: log.extra_expense_notes ?? "",
      notes: log.notes ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSettlementDay(nextDay: WeeklySettlementDay) {
    setSettlementDay(nextDay);
    setError("");
    setMessage("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    setSavingSettlement(true);
    const supabase = getSupabaseClient();
    const { error: saveError } = await supabase
      .from("profiles")
      .upsert({ user_id: user.id, weekly_settlement_day: nextDay }, { onConflict: "user_id" });
    setSavingSettlement(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    await refreshProfile();
    setMessage(t(language, "settlementSaved"));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    if (!editingId && !canCreateDriverLog) {
      setError(t(language, "freeDriverLogLimitMessage"));
      return;
    }

    if (
      !form.date ||
      !form.platform ||
      !form.start_time ||
      !form.end_time ||
      !Number.isFinite(miles) ||
      miles < 0 ||
      !Number.isFinite(gross) ||
      gross < 0 ||
      !Number.isFinite(tipsReceived) ||
      tipsReceived < 0 ||
      !Number.isFinite(gasSpent) ||
      gasSpent < 0 ||
      !Number.isFinite(gasPrice) ||
      gasPrice < 0 ||
      !Number.isFinite(extraExpenses) ||
      extraExpenses < 0 ||
      !Number.isFinite(stopsCompleted) ||
      stopsCompleted < 0
    ) {
      setError(t(language, "logRequiredError"));
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    const payload = {
      date: form.date,
      work_type: form.work_type,
      platform: form.platform,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      miles_driven: miles,
      gross_earnings: gross,
      tips_received: tipsReceived,
      gas_spent: gasSpent,
      gas_price_per_gallon: gasPrice,
      extra_expenses: extraExpenses,
      stops_completed: showStopsField ? stopsCompleted : 0,
      extra_expense_notes: form.extra_expense_notes.trim() || null,
      notes: form.notes.trim() || null
    };
    const result = editingId
      ? await supabase.from("driver_logs").update(payload).eq("id", editingId)
      : await supabase.from("driver_logs").insert({ ...payload, user_id: user.id });
    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    resetForm();
    setShowForm(false);
    await loadData();
    setMessage(t(language, "logSaved"));
  }

  async function deleteLog(id: string) {
    const supabase = getSupabaseClient();
    const { error: deleteError } = await supabase.from("driver_logs").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setLogs((items) => items.filter((item) => item.id !== id));
  }

  function handleExport(format: ExportFormat) {
    setExportError("");

    if (!exportStartDate || !exportEndDate || exportStartDate > exportEndDate) {
      setExportError(t(language, "noRecordsFoundForPeriod"));
      return;
    }

    const selectedLogs = logs
      .filter((log) => log.date >= exportStartDate && log.date <= exportEndDate)
      .sort((first, second) => first.date.localeCompare(second.date));

    if (selectedLogs.length === 0) {
      setExportError(t(language, "noRecordsFoundForPeriod"));
      return;
    }

    const rows = buildDriverLogExportRows(selectedLogs, language);
    const baseFilename = `dailybills-driver-log-${exportStartDate}-to-${exportEndDate}`;

    if (format === "xlsx") {
      exportToXLSX(`${baseFilename}.xlsx`, rows, t(language, "driverLog"));
      return;
    }

    exportToCSV(`${baseFilename}.csv`, rows);
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "driverLog")}
        title={t(language, "driverLog")}
        subtitle={t(language, "driverLogSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      />

      {message ? <p className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">{message}</p> : null}
      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {loading ? <div className="card mb-4 p-4 text-sm text-neutral-600">{t(language, "loading")}</div> : null}

      <div className="space-y-5">
        <section className="card p-5">
          <label className="block space-y-2">
            <span className="field-label">{t(language, "weeklySettlementDay")}</span>
            <select
              className="field"
              value={settlementDay}
              disabled={savingSettlement || !canChangeSettlementDay}
              onChange={(event) => saveSettlementDay(event.target.value as WeeklySettlementDay).catch(console.error)}
            >
              {weeklySettlementDays.map((day) => (
                <option key={day} value={day}>
                  {settlementDayLabel(language, day)}
                </option>
              ))}
            </select>
            {!canChangeSettlementDay ? (
              <span className="block text-sm text-neutral-600">
                {t(language, "weeklySettlementProMessage")}{" "}
                <Link className="font-semibold text-brand-700" href="/pricing">
                  {t(language, "upgrade")}
                </Link>
              </span>
            ) : null}
          </label>
        </section>

        <section className="card p-5">
          <div className="mb-4 flex items-start gap-3">
            <span className="icon-chip-sm">
              <ClipboardList size={20} aria-hidden="true" />
            </span>
            <div>
            <h2 className="text-lg font-black text-ink">{t(language, "exportDriverLogs")}</h2>
            <p className="mt-1 text-sm font-medium text-neutral-600">{t(language, "driverLogSubtitle")}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "startDate")}</span>
              <input
                className="field"
                type="date"
                value={exportStartDate}
                onChange={(event) => setExportStartDate(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "endDate")}</span>
              <input
                className="field"
                type="date"
                value={exportEndDate}
                onChange={(event) => setExportEndDate(event.target.value)}
              />
            </label>
          </div>
          {exportError ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{exportError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={() => handleExport("csv")}>
              {t(language, "exportCsv")}
            </button>
            <button className="btn-secondary" type="button" onClick={() => handleExport("xlsx")}>
              {t(language, "exportExcel")}
            </button>
            <button className="btn-secondary" type="button" onClick={() => handleExport("google")}>
              {t(language, "exportGoogleSheets")}
            </button>
          </div>
        </section>

        <WeeklySummaryCard
          title={t(language, "currentWeekSummary")}
          summary={currentWeekSummary}
          currency={currency}
          language={language}
          showFull={showCurrentFullSummary}
          onToggleFull={() => setShowCurrentFullSummary((value) => !value)}
          onViewDetails={() => setDetailWeek((value) => (value === "current" ? null : "current"))}
          viewDetailsLabel={t(language, "viewWeekDetails")}
        />

        {canViewWeeklyHistory ? (
          <WeeklySummaryCard
            title={t(language, "previousWeekSummary")}
            summary={previousWeekSummary}
            currency={currency}
            language={language}
            showFull={showPreviousFullSummary}
            onToggleFull={() => setShowPreviousFullSummary((value) => !value)}
            onViewDetails={() => setDetailWeek((value) => (value === "previous" ? null : "previous"))}
            viewDetailsLabel={t(language, "viewPreviousWeekDetails")}
            secondary
          />
        ) : (
          <section className="card p-4">
            <div className="mb-3 flex items-center gap-2 text-brand-700">
              <ClipboardList size={20} aria-hidden="true" />
              <h2 className="text-lg font-semibold text-ink">{t(language, "previousWeekSummary")}</h2>
            </div>
            <p className="text-sm text-neutral-600">{t(language, "weeklyHistoryProMessage")}</p>
            <Link className="btn-primary mt-4" href="/pricing">
              {t(language, "upgrade")}
            </Link>
          </section>
        )}

        {detailWeek ? (
          <WeekDetailsCard
            title={detailWeek === "current" ? t(language, "viewWeekDetails") : t(language, "viewPreviousWeekDetails")}
            logs={selectedWeekLogs}
            currency={currency}
            language={language}
            onEdit={editLog}
            onDelete={deleteLog}
          />
        ) : null}

        <section className="card p-5">
          <button
            className="flex w-full items-center justify-between gap-3 text-left"
            type="button"
            onClick={() => setShowForm((value) => !value)}
          >
            <span className="flex items-center gap-3 text-lg font-black text-ink">
              <span className="icon-chip-sm">
                <Plus size={20} aria-hidden="true" />
              </span>
              {editingId ? t(language, "editDailyLog") : t(language, "addDailyLog")}
            </span>
            {showForm ? <ChevronUp className="text-brand-700" size={20} aria-hidden="true" /> : <ChevronDown className="text-brand-700" size={20} aria-hidden="true" />}
          </button>

          {showForm ? (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "date")}</span>
                  <input className="field" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </label>
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "workType")}</span>
                  <select
                    className="field"
                    value={form.work_type}
                    onChange={(event) => {
                      const nextWorkType = event.target.value as WorkLogType;
                      setForm({
                        ...form,
                        work_type: nextWorkType,
                        platform: workLogSourceOptionsByType[nextWorkType][0],
                        stops_completed: ""
                      });
                    }}
                  >
                    {workLogTypes.map((type) => (
                      <option key={type} value={type}>
                        {workLogTypeLabel(language, type)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="field-label">{t(language, "jobPlatform")}</span>
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

              <div className="grid gap-3 sm:grid-cols-2">
                <TimePicker12Hour
                  label={t(language, "startTime")}
                  value={form.start_time}
                  onChange={(value) => setForm({ ...form, start_time: value })}
                />
                <TimePicker12Hour
                  label={t(language, "endTime")}
                  value={form.end_time}
                  onChange={(value) => setForm({ ...form, end_time: value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "milesDriven")}</span>
                  <input className="field" inputMode="decimal" value={form.miles_driven} onChange={(event) => setForm({ ...form, miles_driven: event.target.value })} />
                </label>
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "grossEarnings")}</span>
                  <input className="field" inputMode="decimal" value={form.gross_earnings} onChange={(event) => setForm({ ...form, gross_earnings: event.target.value })} />
                </label>
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "tipsReceived")}</span>
                  <input className="field" inputMode="decimal" value={form.tips_received} onChange={(event) => setForm({ ...form, tips_received: event.target.value })} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "gasSpent")}</span>
                  <input className="field" inputMode="decimal" value={form.gas_spent} onChange={(event) => setForm({ ...form, gas_spent: event.target.value })} />
                </label>
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "gasPricePerGallon")}</span>
                  <input className="field" inputMode="decimal" value={form.gas_price_per_gallon} onChange={(event) => setForm({ ...form, gas_price_per_gallon: event.target.value })} />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="field-label">{t(language, "extraExpenses")}</span>
                <input className="field" inputMode="decimal" value={form.extra_expenses} onChange={(event) => setForm({ ...form, extra_expenses: event.target.value })} />
              </label>

              {showStopsField ? (
                <label className="block space-y-2">
                  <span className="field-label">{t(language, "stopsCompleted")}</span>
                  <input className="field" inputMode="numeric" value={form.stops_completed} onChange={(event) => setForm({ ...form, stops_completed: event.target.value })} />
                </label>
              ) : null}

              <div className="rounded-lg border border-line bg-neutral-50 p-3">
                <p className="text-sm font-semibold text-ink">{t(language, "tripMath")}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Metric label={t(language, "hoursWorkedCalculated")} value={formatDurationFromDecimalHours(preview.hoursWorked)} />
                  <Metric label={t(language, "totalEarnings")} value={formatCurrency(preview.totalEarnings, currency)} />
                  <Metric label={t(language, "netProfit")} value={formatCurrency(preview.netProfit, currency)} />
                  <Metric label={t(language, "netPerHour")} value={formatHourlyRate(preview.netProfitPerHour, currency, language)} />
                  {showStopsField && stopsCompleted > 0 ? (
                    <>
                      <Metric label={t(language, "grossPerStop")} value={formatCurrency(preview.grossPerStop, currency)} />
                      <Metric label={t(language, "netPerStop")} value={formatCurrency(preview.netPerStop, currency)} />
                    </>
                  ) : (
                    <Metric label={t(language, "gallonsBought")} value={preview.gallonsBought.toFixed(2)} />
                  )}
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

              {!editingId && !canCreateDriverLog ? (
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
                  <p>{t(language, "freeDriverLogLimitMessage")}</p>
                  <Link className="btn-primary mt-3" href="/pricing">
                    {t(language, "upgrade")}
                  </Link>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button className="btn-primary flex-1" type="submit" disabled={saving || (!editingId && !canCreateDriverLog)}>
                  <Plus size={18} aria-hidden="true" />
                  {saving ? t(language, "saving") : t(language, "saveLog")}
                </button>
                {editingId ? (
                  <button className="btn-secondary" type="button" onClick={resetForm}>
                    {t(language, "cancel")}
                  </button>
                ) : null}
                <Link className="btn-secondary flex-1" href="/dashboard">
                  {t(language, "backToDashboard")}
                </Link>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </>
  );
}

function WeeklySummaryCard({
  title,
  summary,
  currency,
  language,
  showFull,
  onToggleFull,
  onViewDetails,
  viewDetailsLabel,
  secondary = false
}: {
  title: string;
  summary: ReturnType<typeof calculateWeeklyDriverSummaryForRange>;
  currency: string;
  language: string;
  showFull: boolean;
  onToggleFull: () => void;
  onViewDetails: () => void;
  viewDetailsLabel: string;
  secondary?: boolean;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${secondary ? "opacity-90" : ""}`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-700">
            <span className="icon-chip-sm">
              <ClipboardList size={20} aria-hidden="true" />
            </span>
            <h2 className="text-xl font-black text-ink">{title}</h2>
          </div>
          <p className="mt-2 text-sm font-medium text-neutral-600">
            {t(language, "weekPeriod")}: {formatDate(summary.startDate, language)} - {formatDate(summary.endDate, language)}
          </p>
        </div>
        <button className="btn-secondary min-h-10" type="button" onClick={onViewDetails}>
          <CalendarDays size={17} aria-hidden="true" />
          {viewDetailsLabel}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-6">
        <Metric icon={DollarSign} label={t(language, "totalGrossEarnings")} value={formatCurrency(summary.totalGrossEarnings, currency)} />
        <Metric icon={HandCoins} label={t(language, "totalTips")} value={formatCurrency(summary.totalTipsReceived, currency)} />
        <Metric icon={DollarSign} label={t(language, "totalEarnings")} value={formatCurrency(summary.totalEarnings, currency)} />
        <Metric icon={Clock3} label={t(language, "totalHoursWorked")} value={formatDurationFromDecimalHours(summary.totalHoursWorked)} />
        <Metric icon={Receipt} label={t(language, "netProfit")} value={formatCurrency(summary.netProfit, currency)} />
        <Metric icon={ClipboardList} label={t(language, "workDaysLogged")} value={String(summary.workDaysLogged)} />
      </div>
      <div className="mt-4 border-t border-line pt-3">
        <button className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-brand-700" type="button" onClick={onToggleFull}>
          <span>{showFull ? t(language, "hideFullSummary") : t(language, "showFullSummary")}</span>
          {showFull ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
        </button>
        {showFull ? (
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <Metric icon={Route} label={t(language, "totalMiles")} value={summary.totalMiles.toFixed(1)} />
            <Metric icon={Receipt} label={t(language, "totalGasSpent")} value={formatCurrency(summary.totalGasSpent, currency)} />
            <Metric icon={DollarSign} label={t(language, "averageGasPrice")} value={formatCurrency(summary.averageGasPricePaid, currency)} />
            <Metric icon={Route} label={t(language, "gallonsBought")} value={summary.totalGallonsBought.toFixed(2)} />
            <Metric icon={Clock3} label={t(language, "grossPerHour")} value={formatHourlyRate(summary.grossPerHour, currency, language)} />
            <Metric icon={Clock3} label={t(language, "netPerHour")} value={formatHourlyRate(summary.netPerHour, currency, language)} />
            <Metric icon={Route} label={t(language, "grossPerMile")} value={formatCurrency(summary.grossPerMile, currency)} />
            <Metric icon={Route} label={t(language, "netPerMile")} value={formatCurrency(summary.netPerMile, currency)} />
            <Metric icon={Receipt} label={t(language, "extraExpenses")} value={formatCurrency(summary.totalExtraExpenses, currency)} />
            {summary.totalStopsCompleted > 0 ? (
              <>
                <Metric icon={MapPin} label={t(language, "totalStops")} value={summary.totalStopsCompleted.toFixed(0)} />
                <Metric icon={MapPin} label={t(language, "grossPerStop")} value={formatCurrency(summary.grossPerStop, currency)} />
                <Metric icon={MapPin} label={t(language, "netPerStop")} value={formatCurrency(summary.netPerStop, currency)} />
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function WeekDetailsCard({
  title,
  logs,
  currency,
  language,
  onEdit,
  onDelete
}: {
  title: string;
  logs: DriverLog[];
  currency: string;
  language: string;
  onEdit: (log: DriverLog) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center gap-2 text-brand-700">
        <span className="icon-chip-sm">
          <CalendarDays size={20} aria-hidden="true" />
        </span>
        <h2 className="text-xl font-black text-ink">{title}</h2>
      </div>
      {logs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line bg-neutral-50 p-4 text-sm text-neutral-600">
          {t(language, "noDailyRecordsThisWeek")}
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const metrics = calculateDriverLogMetrics(log);
            const WorkIcon = workLogTypeIcon(log.work_type);

            return (
              <article key={log.id} className="rounded-[1.35rem] border border-line bg-neutral-50 p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="icon-chip">
                      <WorkIcon size={24} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-lg font-black text-ink">{formatDate(log.date, language)}</p>
                      <p className="text-sm font-medium text-neutral-600">
                        {workLogTypeLabel(language, log.work_type ?? "driver")} - {log.platform}
                      </p>
                      <p className="text-sm font-medium text-neutral-600">
                        {formatTime12Hour(log.start_time)} - {formatTime12Hour(log.end_time)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-black text-ink">{formatCurrency(metrics.netProfit, currency)}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <Metric icon={Route} label={t(language, "miles")} value={log.miles_driven.toFixed(1)} />
                  <Metric icon={Clock3} label={t(language, "hoursWorkedCalculated")} value={formatDurationFromDecimalHours(metrics.hoursWorked)} />
                  <Metric icon={DollarSign} label={t(language, "gross")} value={formatCurrency(log.gross_earnings, currency)} />
                  <Metric icon={HandCoins} label={t(language, "tipsReceived")} value={formatCurrency(log.tips_received ?? 0, currency)} />
                  <Metric icon={DollarSign} label={t(language, "totalEarnings")} value={formatCurrency(metrics.totalEarnings, currency)} />
                  <Metric icon={Receipt} label={t(language, "gasSpent")} value={formatCurrency(log.gas_spent, currency)} />
                  <Metric icon={Receipt} label={t(language, "extraExpenses")} value={formatCurrency(log.extra_expenses, currency)} />
                  {(log.stops_completed ?? 0) > 0 ? (
                    <>
                      <Metric icon={MapPin} label={t(language, "stopsCompleted")} value={String(log.stops_completed)} />
                      <Metric icon={MapPin} label={t(language, "grossPerStop")} value={formatCurrency(metrics.grossPerStop, currency)} />
                      <Metric icon={MapPin} label={t(language, "netPerStop")} value={formatCurrency(metrics.netPerStop, currency)} />
                    </>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => onEdit(log)}>
                    <Pencil size={17} aria-hidden="true" />
                    {t(language, "edit")}
                  </button>
                  <button className="btn-danger" type="button" onClick={() => onDelete(log.id)}>
                    <Trash2 size={17} aria-hidden="true" />
                    {t(language, "delete")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <p className="metric-card p-3">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-neutral-500">
        {Icon ? <Icon size={16} aria-hidden="true" /> : null}
        {label}
      </span>
      <span className="mt-1 block text-base font-black text-ink">{value}</span>
    </p>
  );
}
