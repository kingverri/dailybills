"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Car,
  Home,
  Landmark,
  Pencil,
  Plus,
  Receipt,
  Shield,
  Smartphone,
  Trash2,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppActionPanel, AppFilterBar, AppListCard, AppMetricCard } from "@/components/app-ui";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { billCategories, billStatuses } from "@/lib/constants";
import {
  expandRecurringBillsWithinPeriod,
  mergeBillOccurrenceStatuses,
  type BillOccurrence
} from "@/lib/financeCalculations";
import { formatCurrency, formatDate, formatMonthYear, toDateInputValue } from "@/lib/format";
import { billRecurrenceLabel, t } from "@/lib/i18n";
import { canAddBill, getCurrentPlan } from "@/lib/planLimits";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import type { Bill, BillCategory, BillOccurrenceStatus, BillRecurrence, BillRepeatUntilType, BillStatus } from "@/types/app";

type BillForm = {
  name: string;
  amount: string;
  due_date: string;
  recurrence: BillRecurrence;
  repeat_until_type: BillRepeatUntilType;
  repeat_until_month: string;
  category: BillCategory;
  status: BillStatus;
  notes: string;
};

type BillFilter = "all" | "unpaid" | "paid" | "due_soon";
type BillSort = "due_date" | "amount";

type MonthRange = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
};

const initialForm: BillForm = {
  name: "",
  amount: "",
  due_date: toDateInputValue(),
  recurrence: "one-time",
  repeat_until_type: "never",
  repeat_until_month: "",
  category: "Rent",
  status: "unpaid",
  notes: ""
};

const repeatFrequencyOptions: BillRecurrence[] = ["monthly", "weekly", "biweekly"];

function repeatUntilMonthFromBill(bill: Bill) {
  return bill.repeat_until ? bill.repeat_until.slice(0, 7) : "";
}

function monthInputToLastDate(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return null;
  }

  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function billRecurrenceSummary(bill: Bill, language: string) {
  if (bill.recurrence === "one-time" || bill.recurrence === "custom") {
    return billRecurrenceLabel(language, bill.recurrence);
  }

  const base = billRecurrenceLabel(language, bill.recurrence);

  if (bill.repeat_until_type === "specific_month" && bill.repeat_until) {
    return `${base} · ${t(language, "ends")} ${formatMonthYear(bill.repeat_until, language)}`;
  }

  return `${base} · ${t(language, "noEndDate")}`;
}

function getMonthRange(monthValue: string): MonthRange {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    start,
    end,
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end)
  };
}

function addMonthsToMonthValue(monthValue: string, offset: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatSelectedMonth(monthValue: string, language: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const locale = language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US";

  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, 1));
}

function billCategoryIcon(category: BillCategory) {
  const icons = {
    Rent: Home,
    "Car payment": Car,
    "Car insurance": Shield,
    Phone: Smartphone,
    "Credit card": CreditCard,
    Loan: Landmark,
    Gas: Car,
    Food: Receipt,
    Utilities: Zap,
    Other: Receipt
  } satisfies Record<BillCategory, typeof Receipt>;

  return icons[category];
}

function billCategoryTone(category: BillCategory) {
  const tones = {
    Rent: "border-brand-200 text-brand-700",
    "Car payment": "border-sky-200 text-sky-700",
    "Car insurance": "border-violet-200 text-violet-700",
    Phone: "border-cyan-200 text-cyan-700",
    "Credit card": "border-amber-200 text-amber-700",
    Loan: "border-amber-200 text-amber-700",
    Gas: "border-amber-200 text-amber-700",
    Food: "border-brand-200 text-brand-700",
    Utilities: "border-amber-200 text-amber-700",
    Other: "border-line text-neutral-600"
  } satisfies Record<BillCategory, string>;

  return tones[category];
}

function billStatusBadge(bill: BillOccurrence, today: string, language: string) {
  if (bill.status === "paid") {
    return { className: "badge-good", label: t(language, "paid"), icon: CheckCircle2 };
  }

  if (bill.occurrenceDate < today) {
    return { className: "badge-danger", label: t(language, "overdue"), icon: Clock3 };
  }

  const dueDate = new Date(`${bill.occurrenceDate}T00:00:00`);
  const todayDate = new Date(`${today}T00:00:00`);
  const daysUntilDue = Math.ceil((dueDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000));

  if (daysUntilDue <= 7) {
    return { className: "badge-warn", label: t(language, "dueSoon"), icon: Clock3 };
  }

  return { className: "badge-muted", label: t(language, "unpaid"), icon: Clock3 };
}

export default function BillsPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [billOccurrenceStatuses, setBillOccurrenceStatuses] = useState<BillOccurrenceStatus[]>([]);
  const [form, setForm] = useState<BillForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(toDateInputValue().slice(0, 7));
  const [filter, setFilter] = useState<BillFilter>("all");
  const [sortBy, setSortBy] = useState<BillSort>("due_date");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const currency = profile?.currency ?? "USD";
  const language = profile?.language ?? "en";
  const currentPlan = getCurrentPlan(profile);
  const canCreateBill = canAddBill(currentPlan, bills.length);
  const isRepeatingBill = form.recurrence !== "one-time";
  const repeatFrequencyValue = repeatFrequencyOptions.includes(form.recurrence) ? form.recurrence : "monthly";
  const todayValue = toDateInputValue(new Date());
  const currentMonthValue = toDateInputValue().slice(0, 7);
  const selectedMonthRange = useMemo(() => getMonthRange(selectedMonth), [selectedMonth]);
  const monthlyBillOccurrences = useMemo(
    () =>
      mergeBillOccurrenceStatuses(
        expandRecurringBillsWithinPeriod(bills, selectedMonthRange.start, selectedMonthRange.end),
        billOccurrenceStatuses
      ),
    [billOccurrenceStatuses, bills, selectedMonthRange.end, selectedMonthRange.start]
  );
  const monthSummary = useMemo(
    () =>
      monthlyBillOccurrences.reduce(
        (summary, bill) => ({
          total: summary.total + bill.amount,
          paid: summary.paid + (bill.status === "paid" ? bill.amount : 0),
          unpaid: summary.unpaid + (bill.status === "unpaid" ? bill.amount : 0),
          count: summary.count + 1
        }),
        { total: 0, paid: 0, unpaid: 0, count: 0 }
      ),
    [monthlyBillOccurrences]
  );
  const sortedBills = useMemo(() => {
    const dueSoonEnd = new Date();
    dueSoonEnd.setDate(dueSoonEnd.getDate() + 7);
    const dueSoonEndValue = toDateInputValue(dueSoonEnd);

    return monthlyBillOccurrences
      .filter((bill) => {
        if (filter === "unpaid") {
          return bill.status === "unpaid";
        }
        if (filter === "paid") {
          return bill.status === "paid";
        }
        if (filter === "due_soon") {
          return bill.status === "unpaid" && bill.occurrenceDate >= todayValue && bill.occurrenceDate <= dueSoonEndValue;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "amount") {
          return Number(b.amount) - Number(a.amount);
        }
        return a.occurrenceDate.localeCompare(b.occurrenceDate);
      });
  }, [filter, monthlyBillOccurrences, sortBy, todayValue]);

  async function loadBills() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const [billResult, occurrenceResult] = await Promise.all([
      supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .order("due_date", { ascending: true }),
      supabase.from("bill_occurrences").select("*").eq("user_id", user.id)
    ]);

    const loadError = billResult.error ?? occurrenceResult.error;

    if (loadError) {
      setError(loadError.message);
    } else {
      setBills(billResult.data ?? []);
      setBillOccurrenceStatuses(occurrenceResult.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBills().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  }

  function editBill(bill: Bill) {
    setEditingId(bill.id);
    setShowForm(true);
    setForm({
      name: bill.name,
      amount: String(bill.amount),
      due_date: bill.due_date,
      recurrence: bill.recurrence,
      repeat_until_type: bill.repeat_until_type ?? "never",
      repeat_until_month: repeatUntilMonthFromBill(bill),
      category: bill.category,
      status: bill.status,
      notes: bill.notes ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    if (!editingId && !canCreateBill) {
      setError(t(language, "freeBillLimitMessage"));
      return;
    }

    const amount = Number(form.amount);
    if (!form.name.trim() || !form.due_date || !Number.isFinite(amount) || amount < 0) {
      setError(t(language, "billRequiredError"));
      return;
    }

    if (isRepeatingBill && form.repeat_until_type === "specific_month" && !form.repeat_until_month) {
      setError(t(language, "fillRequiredFields"));
      return;
    }

    setSaving(true);
    const supabase = getSupabaseClient();
    const repeatUntil =
      isRepeatingBill && form.repeat_until_type === "specific_month"
        ? monthInputToLastDate(form.repeat_until_month)
        : null;
    const payload = {
      name: form.name.trim(),
      amount,
      due_date: form.due_date,
      recurrence: form.recurrence,
      repeat_until: repeatUntil,
      repeat_until_type: isRepeatingBill ? form.repeat_until_type : "never",
      category: form.category,
      status: form.status,
      notes: form.notes.trim() || null
    };

    const result = editingId
      ? await supabase.from("bills").update(payload).eq("id", editingId)
      : await supabase.from("bills").insert({ ...payload, user_id: user.id });

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (editingId) {
      resetForm();
      setShowForm(false);
      await loadBills();
      return;
    }

    router.push("/dashboard");
  }

  async function deleteBill(id: string) {
    const supabase = getSupabaseClient();
    const { error: deleteError } = await supabase.from("bills").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setBills((items) => items.filter((item) => item.id !== id));
    setBillOccurrenceStatuses((items) => items.filter((item) => item.bill_id !== id));
  }

  async function toggleStatus(bill: BillOccurrence) {
    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    const nextStatus: BillStatus = bill.status === "paid" ? "unpaid" : "paid";
    const supabase = getSupabaseClient();
    const payload = {
      user_id: user.id,
      bill_id: bill.id,
      occurrence_date: bill.occurrenceDate,
      status: nextStatus,
      paid_at: nextStatus === "paid" ? new Date().toISOString() : null
    };
    const { data, error: updateError } = await supabase
      .from("bill_occurrences")
      .upsert(payload, { onConflict: "user_id,bill_id,occurrence_date" })
      .select()
      .single();

    if (updateError) {
      setError(t(language, "couldNotUpdateBillStatus"));
      return;
    }

    const now = new Date().toISOString();
    const nextOccurrence = data ?? ({ ...payload, id: "", created_at: now, updated_at: now } as BillOccurrenceStatus);
    setBillOccurrenceStatuses((items) => {
      const key = `${bill.id}:${bill.occurrenceDate}`;
      const withoutCurrent = items.filter((item) => `${item.bill_id}:${item.occurrence_date}` !== key);
      return [...withoutCurrent, nextOccurrence];
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={t(language, "bills")}
        title={t(language, "upcomingObligations")}
        subtitle={t(language, "billsSubtitle")}
        showBackToDashboard
        backToDashboardLabel={t(language, "backToDashboard")}
      >
        <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
          <Plus size={18} aria-hidden="true" />
          {t(language, "addBill")}
        </button>
      </PageHeader>

      <div className="space-y-5">
        <AppActionPanel
          icon={Plus}
          title={editingId ? t(language, "editBill") : t(language, "addBillForm")}
          subtitle={t(language, "noBillsHelper")}
          expanded={showForm}
          onToggle={() => setShowForm((value) => !value)}
        >
            <form className="space-y-4" onSubmit={handleSubmit}>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "billName")}</span>
            <input className="field" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "amount")}</span>
              <input className="field" inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "dueDate")}</span>
              <input className="field" type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="field-label">{t(language, "repeatThisBill")}</span>
              <select
                className="field"
                value={isRepeatingBill ? "yes" : "no"}
                onChange={(event) =>
                  setForm(
                    event.target.value === "yes"
                      ? { ...form, recurrence: repeatFrequencyValue }
                      : { ...form, recurrence: "one-time", repeat_until_type: "never", repeat_until_month: "" }
                  )
                }
              >
                <option value="no">{t(language, "no")}</option>
                <option value="yes">{t(language, "yes")}</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="field-label">{t(language, "category")}</span>
              <select className="field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as BillCategory })}>
                {billCategories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>

          {isRepeatingBill ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="field-label">{t(language, "repeatFrequency")}</span>
                <select
                  className="field"
                  value={repeatFrequencyValue}
                  onChange={(event) => setForm({ ...form, recurrence: event.target.value as BillRecurrence })}
                >
                  {repeatFrequencyOptions.map((value) => (
                    <option key={value} value={value}>
                      {billRecurrenceLabel(language, value)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="field-label">{t(language, "whenDoesItEnd")}</span>
                <select
                  className="field"
                  value={form.repeat_until_type}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      repeat_until_type: event.target.value as BillRepeatUntilType,
                      repeat_until_month: event.target.value === "never" ? "" : form.repeat_until_month
                    })
                  }
                >
                  <option value="never">{t(language, "never")}</option>
                  <option value="specific_month">{t(language, "endInSpecificMonth")}</option>
                </select>
              </label>
              {form.repeat_until_type === "specific_month" ? (
                <label className="block space-y-2 sm:col-span-2">
                  <span className="field-label">{t(language, "lastMonth")}</span>
                  <input
                    className="field"
                    type="month"
                    value={form.repeat_until_month}
                    onChange={(event) => setForm({ ...form, repeat_until_month: event.target.value })}
                  />
                </label>
              ) : null}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="field-label">{t(language, "status")}</span>
            <select className="field" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as BillStatus })}>
              {billStatuses.map((value) => (
                <option key={value} value={value}>
                  {value === "paid" ? t(language, "paid") : t(language, "unpaid")}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="field-label">{t(language, "notes")}</span>
            <textarea className="field min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {!editingId && !canCreateBill ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
              <p>{t(language, "freeBillLimitMessage")}</p>
              <Link className="btn-primary mt-3" href="/pricing">
                {t(language, "upgrade")}
              </Link>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button className="btn-primary flex-1" type="submit" disabled={saving || (!editingId && !canCreateBill)}>
              <Plus size={18} aria-hidden="true" />
              {saving ? t(language, "saving") : editingId ? t(language, "saveBill") : t(language, "addBill")}
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

        <section className="card space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="field-label">{t(language, "selectedMonth")}</p>
              <p className="text-2xl font-black capitalize text-ink">{formatSelectedMonth(selectedMonth, language)}</p>
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
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <AppMetricCard compact icon={CircleDollarSign} label={t(language, "totalForMonth")} value={formatCurrency(monthSummary.total, currency)} tone="cyan" />
            <AppMetricCard compact icon={CheckCircle2} label={t(language, "paid")} value={formatCurrency(monthSummary.paid, currency)} tone="green" />
            <AppMetricCard compact icon={Clock3} label={t(language, "unpaid")} value={formatCurrency(monthSummary.unpaid, currency)} tone="amber" />
            <AppMetricCard compact icon={Receipt} label={t(language, "bills")} value={monthSummary.count} tone="purple" />
          </div>
        </section>

        <section className="space-y-3">
          <AppFilterBar>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(["all", "unpaid", "paid", "due_soon"] as BillFilter[]).map((value) => (
                <button
                  key={value}
                  className={`filter-pill ${filter === value ? "filter-pill-active" : ""}`}
                  type="button"
                  onClick={() => setFilter(value)}
                >
                  {value === "all"
                    ? t(language, "all")
                    : value === "due_soon"
                      ? t(language, "dueSoon")
                      : value === "paid"
                        ? t(language, "paid")
                        : t(language, "unpaid")}
                </button>
              ))}
            </div>
            <select className="field py-2 text-sm sm:max-w-48" value={sortBy} onChange={(event) => setSortBy(event.target.value as BillSort)}>
              <option value="due_date">{t(language, "dueDate")}</option>
              <option value="amount">{t(language, "amount")}</option>
            </select>
          </AppFilterBar>
          {loading ? (
            <div className="card p-5 text-sm text-neutral-600">{t(language, "loadingBills")}</div>
          ) : sortedBills.length === 0 ? (
            <EmptyState icon={CircleDollarSign} title={t(language, "noBillsFoundForMonth")} body={t(language, "noBillsHelper")}>
              <button className="btn-primary" type="button" onClick={() => setShowForm(true)}>
                <Plus size={17} aria-hidden="true" />
                {t(language, "addBill")}
              </button>
            </EmptyState>
          ) : (
            sortedBills.map((bill: BillOccurrence) => {
              const CategoryIcon = billCategoryIcon(bill.category);
              const status = billStatusBadge(bill, todayValue, language);
              const StatusIcon = status.icon;

              return (
              <AppListCard
                key={`${bill.id}:${bill.occurrenceDate}`}
                className={`border-l-4 ${billCategoryTone(bill.category)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`icon-chip ${billCategoryTone(bill.category)}`}>
                      <CategoryIcon size={24} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-ink">{bill.name}</p>
                      <p className="text-sm font-medium text-neutral-600">
                        {t(language, "due")} {formatDate(bill.occurrenceDate, language)}
                      </p>
                      {bill.status === "paid" && bill.paid_at ? (
                        <p className="mt-1 text-xs font-semibold text-neutral-500">
                          {t(language, "paidOn")} {formatDate(bill.paid_at, language)}
                        </p>
                      ) : null}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className={`badge ${status.className}`}>
                        <StatusIcon size={13} aria-hidden="true" />
                        {status.label}
                      </span>
                      <span className="badge badge-muted">
                        {billRecurrenceSummary(bill, language)}
                      </span>
                      <span className="badge badge-muted">
                        {bill.category}
                      </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xl font-black text-ink">{formatCurrency(bill.amount, currency)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn-secondary" type="button" onClick={() => toggleStatus(bill)}>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    {bill.status === "paid" ? t(language, "markUnpaid") : t(language, "markPaid")}
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => editBill(bill)}>
                    <Pencil size={17} aria-hidden="true" />
                    {t(language, "edit")}
                  </button>
                  <button className="btn-danger" type="button" onClick={() => deleteBill(bill.id)}>
                    <Trash2 size={17} aria-hidden="true" />
                    {t(language, "delete")}
                  </button>
                </div>
              </AppListCard>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
