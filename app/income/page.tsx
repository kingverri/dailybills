"use client";

import { BarChart3, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { incomeEntryTypeLabel, t } from "@/lib/i18n";
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

export default function IncomePage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<DailyIncomeEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [form, setForm] = useState<IncomeForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<IncomeFilter>("all");
  const [expandedEntries, setExpandedEntries] = useState<string[]>([]);
  const [exportMonth, setExportMonth] = useState(toDateInputValue().slice(0, 7));
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
  const filteredEntries = useMemo(
    () => entries.filter((entry) => filter === "all" || entry.income_entry_type === filter),
    [entries, filter]
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

    if (editingId) {
      resetForm();
      setShowForm(false);
      await loadData();
      return;
    }

    router.push("/dashboard");
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

    if (!exportMonth) {
      setExportError(t(language, "noRecordsFoundForPeriod"));
      return;
    }

    const [year, month] = exportMonth.split("-").map(Number);
    const startDate = `${exportMonth}-01`;
    const nextMonthDate = new Date(year, month, 1);
    const endExclusive = toDateInputValue(nextMonthDate);
    const selectedEntries = entries
      .filter((entry) => entry.date >= startDate && entry.date < endExclusive)
      .sort((first, second) => first.date.localeCompare(second.date));

    if (selectedEntries.length === 0) {
      setExportError(t(language, "noRecordsFoundForPeriod"));
      return;
    }

    const rows = buildIncomeExportRows(selectedEntries, language);
    const baseFilename = `dailybills-income-${exportMonth}`;

    if (format === "xlsx") {
      exportToXLSX(`${baseFilename}.xlsx`, rows, t(language, "income"));
      return;
    }

    exportToCSV(`${baseFilename}.csv`, rows);
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "income")}
        title={t(language, "trackEachDrivingDay")}
        subtitle={t(language, "incomeSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      />

      <div className="space-y-5">
        <section className="card p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-ink">{t(language, "exportIncome")}</h2>
          </div>
          <label className="block space-y-2 sm:max-w-xs">
            <span className="field-label">{t(language, "selectMonth")}</span>
            <input
              className="field"
              type="month"
              value={exportMonth}
              onChange={(event) => setExportMonth(event.target.value)}
            />
          </label>
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

        <section className="card p-4">
          <button
            className="flex w-full items-center justify-between gap-3 text-left"
            type="button"
            onClick={() => setShowForm((value) => !value)}
          >
            <span className="text-lg font-semibold text-ink">
              {editingId ? t(language, "editIncome") : t(language, "addIncome")}
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
              {saving ? t(language, "saving") : editingId ? t(language, "saveIncome") : t(language, "addIncome")}
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

        <section className="space-y-3">
          <div className="card flex gap-2 overflow-x-auto p-3">
            {(["all", "actual", "confirmed", "extra_gig"] as IncomeFilter[]).map((value) => (
              <button
                key={value}
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  filter === value ? "bg-brand-50 text-brand-700" : "bg-neutral-50 text-neutral-600 hover:text-ink"
                }`}
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
          {loading ? (
            <div className="card p-5 text-sm text-neutral-600">{t(language, "loadingIncome")}</div>
          ) : filteredEntries.length === 0 ? (
            <EmptyState icon={BarChart3} title={t(language, "noIncomeEntriesYet")} body={t(language, "noIncomeHelper")}>
              <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
                <Plus size={17} aria-hidden="true" />
                {t(language, "addIncome")}
              </button>
            </EmptyState>
          ) : (
            filteredEntries.map((entry) => {
              const expanded = expandedEntries.includes(entry.id);

              return (
              <article key={entry.id} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{entry.platform}</p>
                    <p className="text-sm text-neutral-600">
                      {formatDate(entry.date, language)} - {incomeEntryTypeLabel(language, entry.income_entry_type)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-ink">{formatCurrency(entry.net_profit, currency)}</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <p>
                    <span className="block text-neutral-500">{t(language, "gross")}</span>
                    <span className="font-semibold">{formatCurrency(entry.gross_earnings, currency)}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "miles")}</span>
                    <span className="font-semibold">{entry.miles_driven}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "netProfit")}</span>
                    <span className="font-semibold">{formatCurrency(entry.net_profit, currency)}</span>
                  </p>
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
                    <span className="font-semibold">{entry.hours_worked}</span>
                  </p>
                  <p>
                    <span className="block text-neutral-500">{t(language, "gasSpent")}</span>
                    <span className="font-semibold">{formatCurrency(entry.gas_spent, currency)}</span>
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => editEntry(entry)}>
                    <Pencil size={17} aria-hidden="true" />
                    {t(language, "edit")}
                  </button>
                  <button className="btn-danger" type="button" onClick={() => deleteEntry(entry.id)}>
                    <Trash2 size={17} aria-hidden="true" />
                    {t(language, "delete")}
                  </button>
                </div>
              </article>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
