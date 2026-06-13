"use client";

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  DollarSign,
  Pencil,
  Plus,
  Trash2,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppActionPanel, AppFilterBar, AppListCard, AppMetricCard, AppSectionCard } from "@/components/app-ui";
import { useAuth } from "@/components/auth-provider";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { incomeEntryTypes, platforms } from "@/lib/constants";
import {
  calculateEarningsPerHour,
  calculateEarningsPerMile,
  calculateNetProfit
} from "@/lib/financeCalculations";
import { buildIncomeExportRows, exportToCSV, exportToXLSX } from "@/lib/exportUtils";
import { formatCurrency, formatDate, formatDurationFromDecimalHours, toDateInputValue } from "@/lib/format";
import { incomeEntryTypeLabel, t } from "@/lib/i18n";
import { calculatePaymentSummaryForPeriod, getPaymentDisplayType, isReceivedPayment } from "@/lib/paymentCalculations";
import { getSupabaseClient } from "@/lib/supabase";
import type { DailyIncomeEntry, IncomeEntryType, Platform, Vehicle } from "@/types/app";

type IncomeForm = {
  date: string;
  income_entry_type: IncomeEntryType;
  platform: Platform;
  gross_earnings: string;
  miles_driven: string;
  hours_worked: string;
  gas_spent: string;
  notes: string;
};

type IncomeFilter = "all" | "actual" | "confirmed" | "extra_gig";
type ExportFormat = "csv" | "xlsx" | "google";
type WeeklyReceivedTotal = {
  label: string;
  startDate: string;
  endDate: string;
  total: number;
};

type MonthRange = {
  startDate: string;
  endExclusive: string;
};

const initialForm: IncomeForm = {
  date: toDateInputValue(),
  income_entry_type: "actual",
  platform: "DoorDash",
  gross_earnings: "",
  miles_driven: "",
  hours_worked: "",
  gas_spent: "",
  notes: ""
};

function getMonthRange(monthValue: string): MonthRange {
  const [year, month] = monthValue.split("-").map(Number);
  const startDate = `${monthValue}-01`;
  const nextMonthDate = new Date(year, month, 1);

  return {
    startDate,
    endExclusive: toDateInputValue(nextMonthDate)
  };
}

function addMonthsToMonthValue(monthValue: string, offset: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthEndDate(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  return toDateInputValue(new Date(year, month, 0));
}

function formatSelectedMonth(monthValue: string, language: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const locale = language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

function incomeTypeBadgeClass(type: IncomeEntryType) {
  if (type === "confirmed") {
    return "badge-blue";
  }

  if (type === "extra_gig") {
    return "badge-purple";
  }

  return "badge-good";
}

function paymentStatusLabel(language: string, type: IncomeEntryType) {
  if (type === "confirmed") {
    return t(language, "futurePaymentConfirmed");
  }

  if (type === "extra_gig") {
    return incomeEntryTypeLabel(language, type);
  }

  return t(language, "receivedPayment");
}

function buildWeeklyReceivedTotals(monthValue: string, entries: DailyIncomeEntry[], todayValue: string): WeeklyReceivedTotal[] {
  const [year, month] = monthValue.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const weeks: WeeklyReceivedTotal[] = [];
  let cursor = new Date(monthStart);
  let index = 1;

  while (cursor <= monthEnd) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (weekEnd > monthEnd) {
      weekEnd.setTime(monthEnd.getTime());
    }

    const startDate = toDateInputValue(weekStart);
    const endDate = toDateInputValue(weekEnd);
    const total = entries
      .filter((entry) => entry.date >= startDate && entry.date <= endDate && isReceivedPayment(entry, todayValue))
      .reduce((sum, entry) => sum + Number(entry.gross_earnings ?? 0), 0);

    weeks.push({
      label: String(index),
      startDate,
      endDate,
      total
    });

    cursor = new Date(weekEnd);
    cursor.setDate(cursor.getDate() + 1);
    index += 1;
  }

  return weeks;
}

export default function IncomePage() {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<DailyIncomeEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<IncomeForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(toDateInputValue().slice(0, 7));
  const [filter, setFilter] = useState<IncomeFilter>("all");
  const [expandedEntries, setExpandedEntries] = useState<string[]>([]);
  const [exportError, setExportError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currency = profile?.currency ?? "USD";
  const language = profile?.language ?? "en";
  const primaryVehicle = vehicles[0];
  const gross = Number(form.gross_earnings || 0);
  const miles = Number(form.miles_driven || 0);
  const hours = Number(form.hours_worked || 0);
  const gasSpent = Number(form.gas_spent || 0);
  const estimatedGasCost = 0;
  const gasCostForProfit = gasSpent > 0 ? gasSpent : estimatedGasCost;
  const netProfit = calculateNetProfit(gross, gasCostForProfit);

  const preview = useMemo(
    () => ({
      earningsPerHour: calculateEarningsPerHour(gross, hours),
      earningsPerMile: calculateEarningsPerMile(gross, miles),
      netPerHour: calculateEarningsPerHour(netProfit, hours),
      netPerMile: calculateEarningsPerMile(netProfit, miles)
    }),
    [gross, hours, miles, netProfit]
  );
  const currentMonthValue = toDateInputValue().slice(0, 7);
  const todayValue = toDateInputValue();
  const selectedMonthRange = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const monthlyEntries = useMemo(
    () =>
      entries.filter(
        (entry) => entry.date >= selectedMonthRange.startDate && entry.date < selectedMonthRange.endExclusive
      ),
    [entries, selectedMonthRange.endExclusive, selectedMonthRange.startDate]
  );
  const filteredEntries = useMemo(
    () => monthlyEntries.filter((entry) => filter === "all" || getPaymentDisplayType(entry, todayValue) === filter),
    [filter, monthlyEntries, todayValue]
  );
  const paymentSummary = useMemo(() => {
    const endDate = getMonthEndDate(selectedMonth);
    return calculatePaymentSummaryForPeriod(monthlyEntries, selectedMonthRange.startDate, endDate, todayValue);
  }, [monthlyEntries, selectedMonth, selectedMonthRange.startDate, todayValue]);
  const weeklyReceivedTotals = useMemo(
    () => buildWeeklyReceivedTotals(selectedMonth, monthlyEntries, todayValue),
    [monthlyEntries, selectedMonth, todayValue]
  );

  async function loadData() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const [entryResult, vehicleResult] = await Promise.all([
      supabase
        .from("daily_income_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase.from("vehicles").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    if (entryResult.error || vehicleResult.error) {
      setError(entryResult.error?.message ?? vehicleResult.error?.message ?? "");
    } else {
      setEntries(entryResult.data ?? []);
      setVehicles(vehicleResult.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadData().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  }

  function editEntry(entry: DailyIncomeEntry) {
    setEditingId(entry.id);
    setShowForm(true);
    setForm({
      date: entry.date,
      income_entry_type: entry.income_entry_type ?? "actual",
      platform: entry.platform,
      gross_earnings: String(entry.gross_earnings),
      miles_driven: String(entry.miles_driven),
      hours_worked: String(entry.hours_worked),
      gas_spent: entry.gas_spent ? String(entry.gas_spent) : "",
      notes: entry.notes ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleEntryDetails(id: string) {
    setExpandedEntries((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    if (!form.date || !Number.isFinite(gross) || gross < 0 || !Number.isFinite(miles) || !Number.isFinite(hours)) {
      setError(t(language, "incomeRequiredError"));
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    const payload = {
      date: form.date,
      income_entry_type: form.income_entry_type,
      platform: form.platform,
      gross_earnings: gross,
      miles_driven: miles,
      hours_worked: hours,
      gas_spent: Number.isFinite(gasSpent) ? gasSpent : 0,
      estimated_gas_cost: estimatedGasCost,
      net_profit: netProfit,
      notes: form.notes.trim() || null
    };

    const result = editingId
      ? await supabase.from("daily_income_entries").update(payload).eq("id", editingId)
      : await supabase.from("daily_income_entries").insert({ ...payload, user_id: user.id });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setSelectedMonth(form.date.slice(0, 7));
    resetForm();
    setShowForm(false);
    await loadData();
  }

  async function deleteEntry(id: string) {
    const supabase = getSupabaseClient();
    const { error: deleteError } = await supabase.from("daily_income_entries").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setEntries((items) => items.filter((item) => item.id !== id));
  }

  function handleExport(format: ExportFormat) {
    setExportError("");

    if (!selectedMonth) {
      setExportError(t(language, "noRecordsFoundForPeriod"));
      return;
    }

    const selectedEntries = entries
      .filter((entry) => entry.date >= selectedMonthRange.startDate && entry.date < selectedMonthRange.endExclusive)
      .sort((first, second) => first.date.localeCompare(second.date));

    if (selectedEntries.length === 0) {
      setExportError(t(language, "noRecordsFoundForPeriod"));
      return;
    }

    const rows = buildIncomeExportRows(selectedEntries, language);
    const baseFilename = `dailybills-income-${selectedMonth}`;

    if (format === "xlsx") {
      exportToXLSX(`${baseFilename}.xlsx`, rows, t(language, "income"));
      return;
    }

    exportToCSV(`${baseFilename}.csv`, rows);
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "paymentsEyebrow")}
        title={t(language, "paymentsTitle")}
        subtitle={t(language, "paymentsSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      >
        <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
          <Plus size={18} aria-hidden="true" />
          {t(language, "addPayment")}
        </button>
      </PageHeader>

      <div className="space-y-5">
        <section className="card space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-black text-ink">{t(language, "monthlySummary")}</h2>
              <p className="field-label">{t(language, "selectedMonth")}</p>
              <p className="text-2xl font-black text-ink">{formatSelectedMonth(selectedMonth, language)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setSelectedMonth((value) => addMonthsToMonthValue(value, -1))}
              >
                <ChevronLeft size={17} aria-hidden="true" />
                {t(language, "previousMonth")}
              </button>
              <button className="btn-secondary" type="button" onClick={() => setSelectedMonth(currentMonthValue)}>
                {t(language, "thisMonth")}
              </button>
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setSelectedMonth((value) => addMonthsToMonthValue(value, 1))}
              >
                {t(language, "nextMonth")}
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
          <label className="block space-y-2 sm:max-w-xs">
            <span className="field-label">{t(language, "selectedMonth")}</span>
            <input
              className="field"
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedMonth(event.target.value);
                }
              }}
            />
          </label>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3 xl:grid-cols-5">
            <AppMetricCard compact icon={DollarSign} label={t(language, "receivedThisMonth")} value={formatCurrency(paymentSummary.received, currency)} tone="green" />
            <AppMetricCard compact icon={Clock3} label={t(language, "pendingFuturePayments")} value={formatCurrency(paymentSummary.pending, currency)} tone="amber" />
            <AppMetricCard
              compact
              icon={BarChart3}
              label={t(language, "nextPayment")}
              value={paymentSummary.nextPayment ? `${paymentSummary.nextPayment.platform} ${formatDate(paymentSummary.nextPayment.date, language)}` : "-"}
              tone="cyan"
            />
            <AppMetricCard compact icon={TrendingUp} label={t(language, "extraIncomeFilter")} value={formatCurrency(paymentSummary.extras, currency)} tone="purple" />
            <AppMetricCard compact icon={BarChart3} label={t(language, "paymentCount")} value={String(paymentSummary.count)} />
          </div>
        </section>

        <AppSectionCard icon={CalendarDays} title={t(language, "receivedByWeek")} subtitle={formatSelectedMonth(selectedMonth, language)}>
          <div className="space-y-2">
            {weeklyReceivedTotals.map((week) => (
              <div
                key={`${week.startDate}-${week.endDate}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-neutral-50 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-black text-ink">{t(language, "weekNumber", { number: week.label })}</p>
                  <p className="text-xs font-semibold text-neutral-500">
                    {formatDate(week.startDate, language)} - {formatDate(week.endDate, language)}
                  </p>
                </div>
                <p className="text-base font-black text-ink">{formatCurrency(week.total, currency)}</p>
              </div>
            ))}
          </div>
        </AppSectionCard>

        <AppSectionCard
          icon={BarChart3}
          title={t(language, "exportPayments")}
          subtitle={`${t(language, "selectedMonth")}: ${formatSelectedMonth(selectedMonth, language)}`}
        >
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
        </AppSectionCard>

        <AppActionPanel
          icon={Plus}
          title={editingId ? t(language, "editIncome") : t(language, "addPayment")}
          subtitle={t(language, "noIncomeHelper")}
          expanded={showForm}
          onToggle={() => setShowForm((value) => !value)}
        >
            <form className="space-y-4" onSubmit={handleSubmit}>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "date")}</span>
              <input className="field" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "appPlatform")}</span>
              <select className="field" value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value as Platform })}>
                {platforms.map((platform) => (
                  <option key={platform}>{platform}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "incomeType")}</span>
            <select
              className="field"
              value={form.income_entry_type}
              onChange={(event) => setForm({ ...form, income_entry_type: event.target.value as IncomeEntryType })}
            >
              {incomeEntryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {incomeEntryTypeLabel(language, type.value)}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "grossEarnings")}</span>
              <input className="field" inputMode="decimal" value={form.gross_earnings} onChange={(event) => setForm({ ...form, gross_earnings: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "milesDriven")}</span>
              <input className="field" inputMode="decimal" value={form.miles_driven} onChange={(event) => setForm({ ...form, miles_driven: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "hoursWorked")}</span>
              <input className="field" inputMode="decimal" value={form.hours_worked} onChange={(event) => setForm({ ...form, hours_worked: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "gasSpent")}</span>
              <input className="field" inputMode="decimal" value={form.gas_spent} onChange={(event) => setForm({ ...form, gas_spent: event.target.value })} />
            </label>
          </div>

          <div className="rounded-lg border border-line bg-neutral-50 p-3">
            <p className="text-sm font-semibold text-ink">{t(language, "tripMath")}</p>
            {!primaryVehicle ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">{t(language, "addVehicleForMpg")}</p>
                <Link className="mt-2 inline-flex font-semibold text-amber-900" href="/vehicle">
                  {t(language, "addVehicle")}
                </Link>
              </div>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <p>
                <span className="block text-neutral-500">{t(language, "estimatedGasCost")}</span>
                <span className="font-semibold text-ink">{formatCurrency(estimatedGasCost, currency)}</span>
              </p>
              <p>
                <span className="block text-neutral-500">{t(language, "netProfit")}</span>
                <span className="font-semibold text-ink">{formatCurrency(netProfit, currency)}</span>
              </p>
              <p>
                <span className="block text-neutral-500">{t(language, "earningsHour")}</span>
                <span className="font-semibold text-ink">{formatCurrency(preview.earningsPerHour, currency)}</span>
              </p>
              <p>
                <span className="block text-neutral-500">{t(language, "netMile")}</span>
                <span className="font-semibold text-ink">{formatCurrency(preview.netPerMile, currency)}</span>
              </p>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "notes")}</span>
            <textarea className="field min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" type="submit" disabled={saving}>
              <Plus size={18} aria-hidden="true" />
              {saving ? t(language, "saving") : editingId ? t(language, "saveIncome") : t(language, "addPayment")}
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
        </AppActionPanel>

        <section className="space-y-3">
          <AppFilterBar>
            <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "actual", "confirmed", "extra_gig"] as IncomeFilter[]).map((value) => (
              <button
                key={value}
                className={`filter-pill ${filter === value ? "filter-pill-active" : ""}`}
                type="button"
                onClick={() => setFilter(value)}
              >
                {value === "all"
                  ? t(language, "allIncome")
                  : value === "actual"
                    ? t(language, "actualIncomeFilter")
                    : value === "confirmed"
                      ? t(language, "confirmedIncomeFilter")
                      : t(language, "extraIncomeFilter")}
              </button>
            ))}
            </div>
          </AppFilterBar>
          {loading ? (
            <div className="card p-5 text-sm text-neutral-600">{t(language, "loadingIncome")}</div>
          ) : filteredEntries.length === 0 ? (
            <EmptyState icon={BarChart3} title={t(language, "noIncomeEntriesFoundForMonth")} body={t(language, "noIncomeHelper")}>
              <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
                <Plus size={17} aria-hidden="true" />
                {t(language, "addPayment")}
              </button>
            </EmptyState>
          ) : (
            filteredEntries.map((entry) => {
              const expanded = expandedEntries.includes(entry.id);
              const displayType = getPaymentDisplayType(entry, todayValue);

              return (
              <AppListCard key={entry.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`icon-chip-sm ${incomeTypeBadgeClass(displayType)}`}>
                      <DollarSign size={18} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                    <p className="text-base font-black text-ink">{entry.platform}</p>
                    <p className="text-sm font-medium text-neutral-600">
                      {formatDate(entry.date, language)}
                    </p>
                    <span className={`badge mt-2 ${incomeTypeBadgeClass(displayType)}`}>
                      {paymentStatusLabel(language, displayType)}
                    </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="text-xl font-black text-ink">{formatCurrency(entry.gross_earnings, currency)}</p>
                    <div className="flex gap-1.5">
                      <button className="btn-secondary min-h-9 px-2.5" type="button" onClick={() => editEntry(entry)}>
                        <Pencil size={15} aria-hidden="true" />
                        {t(language, "edit")}
                      </button>
                      <button className="btn-danger min-h-9 px-2.5" type="button" onClick={() => deleteEntry(entry.id)}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  className="mt-3 flex w-full items-center justify-between gap-3 border-t border-line pt-3 text-left text-sm font-semibold text-brand-700"
                  type="button"
                  onClick={() => toggleEntryDetails(entry.id)}
                >
                  <span>{expanded ? t(language, "hideDetails") : t(language, "showDetails")}</span>
                  {expanded ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
                </button>
                {expanded ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <p>
                    <span className="block text-neutral-500">{t(language, "hours")}</span>
                    <span className="font-semibold">{formatDurationFromDecimalHours(entry.hours_worked)}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "gasSpent")}</span>
                    <span className="font-semibold">{formatCurrency(entry.gas_spent, currency)}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "estimatedGasCost")}</span>
                    <span className="font-semibold">{formatCurrency(entry.estimated_gas_cost, currency)}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "earningsHour")}</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateEarningsPerHour(entry.gross_earnings, entry.hours_worked), currency)}
                    </span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "earningsPerMile")}</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateEarningsPerMile(entry.gross_earnings, entry.miles_driven), currency)}
                    </span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "netHour")}</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateEarningsPerHour(entry.net_profit, entry.hours_worked), currency)}
                    </span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "netMile")}</span>
                    <span className="font-semibold">
                      {formatCurrency(calculateEarningsPerMile(entry.net_profit, entry.miles_driven), currency)}
                    </span>
                  </p>
                  {entry.notes ? <p className="col-span-full text-sm text-neutral-600">{entry.notes}</p> : null}
                </div>
                ) : null}
              </AppListCard>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
