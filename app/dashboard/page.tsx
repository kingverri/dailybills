"use client";

import clsx from "clsx";
import {
  ArrowRight,
  Activity,
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  CheckCircle2,
  LockKeyhole,
  PiggyBank,
  Plus,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Target,
  Wallet,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  ExpenseForm,
  buildExpensePayload,
  createExpenseForm,
  validateExpenseForm,
  type ExpenseFormValues
} from "@/components/expense-form";
import {
  WorkRecordForm,
  buildWorkRecordPayload,
  createWorkRecordForm,
  validateWorkRecordForm,
  type WorkRecordFormValues
} from "@/components/work-record-form";
import { useAuth } from "@/components/auth-provider";
import { usePersistentDraft } from "@/hooks/use-persistent-draft";
import {
  calculateCashFlowProjectionForPeriod,
  calculateDriverLogMetrics,
  calculateProjectedBalanceAfterBills,
  calculateRiskLevelForPeriod,
  calculateShortfallForPeriod,
  calculateMonthlySummary,
  getCustomProjectionRange,
  getDefaultMonthlyProjectionRange,
  getOverdueBills,
  type BillOccurrence,
  type ProjectionPeriod
} from "@/lib/financeCalculations";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { projectionPeriodLabel, t } from "@/lib/i18n";
import { canAddDriverLog, canUseCustomProjection, getCurrentMonthDriverLogCount, getCurrentPlan } from "@/lib/planLimits";
import { getSupabaseClient } from "@/lib/supabase";
import type { Bill, BillOccurrenceStatus, DailyIncomeEntry, DriverLog, Expense, PaySchedule, Vehicle } from "@/types/app";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [billOccurrenceStatuses, setBillOccurrenceStatuses] = useState<BillOccurrenceStatus[]>([]);
  const [paySchedules, setPaySchedules] = useState<PaySchedule[]>([]);
  const [entries, setEntries] = useState<DailyIncomeEntry[]>([]);
  const [driverLogs, setDriverLogs] = useState<DriverLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [quickExpenseForm, setQuickExpenseForm, clearQuickExpenseDraft] = usePersistentDraft<ExpenseFormValues>({
    key: user ? `dailybills:draft:${user.id}:dashboard-expense` : null,
    initialValue: () => createExpenseForm(),
    enabled: Boolean(user)
  });
  const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
  const [savingQuickExpense, setSavingQuickExpense] = useState(false);
  const [quickLogForm, setQuickLogForm, clearQuickLogDraft] = usePersistentDraft<WorkRecordFormValues>({
    key: user ? `dailybills:draft:${user.id}:dashboard-work-record` : null,
    initialValue: () => createWorkRecordForm(profile),
    enabled: Boolean(user)
  });
  const [showQuickLogModal, setShowQuickLogModal] = useState(false);
  const [savingQuickLog, setSavingQuickLog] = useState(false);
  const [quickLogMessage, setQuickLogMessage] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [asOf] = useState(() => new Date());
  const [projectionPeriod, setProjectionPeriod] = useState<ProjectionPeriod>("this_month");
  const [customStartDate, setCustomStartDate] = useState(() => toDateInputValue(new Date()));
  const [customEndDate, setCustomEndDate] = useState(() =>
    toDateInputValue(getDefaultMonthlyProjectionRange(new Date()).end)
  );
  const [showProjectionDetails, setShowProjectionDetails] = useState(false);
  const [showOverdueDetails, setShowOverdueDetails] = useState(false);
  const [showFullMonthlySummary, setShowFullMonthlySummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const currency = "USD";
  const language = profile?.language ?? "en";
  const currentPlan = getCurrentPlan(profile);
  const canUseCustomPeriod = canUseCustomProjection(currentPlan);
  const monthlyDriverLogCount = useMemo(() => getCurrentMonthDriverLogCount(driverLogs), [driverLogs]);
  const canCreateDriverLog = canAddDriverLog(currentPlan, monthlyDriverLogCount);
  const currentBalance = Number(profile?.current_balance ?? 0);
  const todayValue = toDateInputValue(asOf);
  const todayWorkLogs = useMemo(() => driverLogs.filter((log) => log.date === todayValue), [driverLogs, todayValue]);
  const todayExpenses = useMemo(() => expenses.filter((expense) => expense.date === todayValue), [expenses, todayValue]);
  const todayWorkNet = todayWorkLogs.reduce((sum, log) => sum + calculateDriverLogMetrics(log).netProfit, 0);
  const todayExpenseTotal = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const projectionRange = useMemo(
    () =>
      projectionPeriod === "custom" && canUseCustomPeriod
        ? getCustomProjectionRange(customStartDate, customEndDate)
        : getDefaultMonthlyProjectionRange(asOf),
    [asOf, canUseCustomPeriod, customEndDate, customStartDate, projectionPeriod]
  );

  function changeProjectionPeriod(nextPeriod: ProjectionPeriod) {
    if (nextPeriod === "custom" && !canUseCustomPeriod) {
      setProjectionPeriod("this_month");
      setUpgradeMessage(t(language, "customProjectionProMessage"));
      return;
    }

    setUpgradeMessage("");
    setProjectionPeriod(nextPeriod);
  }

  async function loadDashboard() {
    if (!user) {
      return;
    }

    setLoading(true);
    const supabase = getSupabaseClient();
    const [billResult, occurrenceResult, scheduleResult, entryResult, expenseResult, driverLogResult, vehicleResult] = await Promise.all([
      supabase.from("bills").select("*").eq("user_id", user.id),
      supabase.from("bill_occurrences").select("*").eq("user_id", user.id),
      supabase.from("pay_schedules").select("*").eq("user_id", user.id),
      supabase.from("daily_income_entries").select("*").eq("user_id", user.id),
      supabase.from("expenses").select("*").eq("user_id", user.id),
      supabase.from("driver_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("vehicles").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    const firstError =
      billResult.error ?? occurrenceResult.error ?? scheduleResult.error ?? entryResult.error ?? expenseResult.error ?? driverLogResult.error ?? vehicleResult.error;

    if (firstError) {
      setError(firstError.message);
    } else {
      setBills(billResult.data ?? []);
      setBillOccurrenceStatuses(occurrenceResult.data ?? []);
      setPaySchedules(scheduleResult.data ?? []);
      setEntries(entryResult.data ?? []);
      setExpenses(expenseResult.data ?? []);
      setDriverLogs(driverLogResult.data ?? []);
      setVehicles(vehicleResult.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function saveQuickWorkLog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setQuickLogMessage("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    if (!canCreateDriverLog) {
      setError(t(language, "freeDriverLogLimitMessage"));
      return;
    }

    if (!validateWorkRecordForm(quickLogForm)) {
      setError(t(language, "logRequiredError"));
      return;
    }

    setSavingQuickLog(true);
    const supabase = getSupabaseClient();
    const { error: saveError } = await supabase
      .from("driver_logs")
      .insert({ ...buildWorkRecordPayload(quickLogForm), user_id: user.id });
    setSavingQuickLog(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setQuickLogMessage(t(language, "logSaved"));
    setShowQuickLogModal(false);
    clearQuickLogDraft(createWorkRecordForm(profile));
    await loadDashboard();
  }

  async function saveQuickExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setQuickLogMessage("");

    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    if (!validateExpenseForm(quickExpenseForm)) {
      setError(t(language, "expenseRequiredError"));
      return;
    }

    setSavingQuickExpense(true);
    const supabase = getSupabaseClient();
    const { error: saveError } = await supabase
      .from("expenses")
      .insert({ ...buildExpensePayload(quickExpenseForm), user_id: user.id });
    setSavingQuickExpense(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    setQuickLogMessage(t(language, "expenseSaved"));
    setShowQuickExpenseModal(false);
    clearQuickExpenseDraft(createExpenseForm());
    await loadDashboard();
  }

  function discardQuickWorkLog() {
    clearQuickLogDraft(createWorkRecordForm(profile));
    setShowQuickLogModal(false);
  }

  function discardQuickExpense() {
    clearQuickExpenseDraft(createExpenseForm());
    setShowQuickExpenseModal(false);
  }

  async function markOccurrencePaid(bill: BillOccurrence) {
    if (!user) {
      setError(t(language, "loginAgain"));
      return;
    }

    const supabase = getSupabaseClient();
    const payload = {
      user_id: user.id,
      bill_id: bill.id,
      occurrence_date: bill.occurrenceDate,
      status: "paid" as const,
      paid_at: new Date().toISOString()
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

  const dashboard = useMemo(() => {
    const cashFlow = calculateCashFlowProjectionForPeriod({
      currentBalance,
      bills,
      billOccurrenceStatuses,
      paySchedules,
      incomeEntries: entries,
      projectionRange,
      asOf
    });
    const summary = calculateMonthlySummary(entries, bills, paySchedules, currentBalance, asOf, billOccurrenceStatuses, expenses);
    const todayValue = toDateInputValue(asOf);
    const overdueBills = getOverdueBills(bills, billOccurrenceStatuses, asOf);
    const upcomingBills = cashFlow.bills.filter((bill) => bill.occurrenceDate >= todayValue);
    const overdueTotal = overdueBills.reduce((sum, bill) => sum + Number(bill.amount ?? 0), 0);
    const upcomingBillsTotal = upcomingBills.reduce((sum, bill) => sum + Number(bill.amount ?? 0), 0);
    const includedBillsTotal = overdueTotal + upcomingBillsTotal;
    const projectedBalanceAfterBills = calculateProjectedBalanceAfterBills(cashFlow.projectedCash, includedBillsTotal);
    const shortfall = calculateShortfallForPeriod(cashFlow.projectedCash, includedBillsTotal);
    const adjustedCashFlow = {
      ...cashFlow,
      bills: upcomingBills,
      requiredBills: includedBillsTotal,
      projectedBalanceAfterBills,
      safeToSpendToday: Math.max(0, projectedBalanceAfterBills),
      shortfall,
      riskLevel: calculateRiskLevelForPeriod(projectedBalanceAfterBills)
    };
    const billProgress =
      includedBillsTotal > 0
        ? Math.min(100, (adjustedCashFlow.projectedCash / Math.max(1, includedBillsTotal)) * 100)
        : 100;

    return {
      cashFlow: adjustedCashFlow,
      nextBill: upcomingBills[0],
      includedBillsTotal,
      overdueBills,
      overdueTotal,
      overdueCount: overdueBills.length,
      oldestOverdueBill: overdueBills[0],
      upcomingBillsTotal,
      billProgress,
      summary,
      includedBills: upcomingBills
    };
  }, [asOf, billOccurrenceStatuses, bills, currentBalance, entries, expenses, paySchedules, projectionRange]);

  const statusCopy = {
    low: {
      label: t(language, "periodOnTrack"),
      helper: t(language, "riskLowHelper"),
      tone: "good" as const,
      className: "border-emerald-300/40 bg-emerald-400/15 text-emerald-100",
      icon: ShieldCheck
    },
    medium: {
      label: t(language, "periodClose"),
      helper: t(language, "riskMediumHelper"),
      tone: "warn" as const,
      className: "border-amber-300/50 bg-amber-400/15 text-amber-100",
      icon: AlertTriangle
    },
    high: {
      label: t(language, "periodBehind"),
      helper: t(language, "riskHighHelper"),
      tone: "danger" as const,
      className: "border-rose-300/50 bg-rose-500/15 text-rose-100",
      icon: ShieldAlert
    }
  }[dashboard.cashFlow.riskLevel];
  const hasShortfall = dashboard.cashFlow.shortfall > 0;
  const periodResultLabel = hasShortfall ? t(language, "shortfallToCover") : t(language, "estimatedLeftover");
  const periodResultValue = hasShortfall
    ? dashboard.cashFlow.shortfall
    : Math.max(0, dashboard.cashFlow.projectedBalanceAfterBills);
  const daysUntilPeriodEnd = Math.max(
    1,
    Math.ceil((new Date(dashboard.cashFlow.endDate).getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24))
  );
  const suggestedDailyTarget = hasShortfall ? dashboard.cashFlow.shortfall / daysUntilPeriodEnd : 0;
  const periodEndDate = formatDate(dashboard.cashFlow.endDate, language);
  const statusHeadline = hasShortfall
    ? t(language, "periodShortfallHeadline", {
        amount: formatCurrency(dashboard.cashFlow.shortfall, currency),
        endDate: periodEndDate
      })
    : t(language, "periodCoveredHeadline");
  const recommendedAction = dashboard.overdueTotal > 0
    ? t(language, "prioritizeOverdueAction")
    : hasShortfall
    ? t(language, "suggestedDailyAction", {
        dailyTarget: formatCurrency(suggestedDailyTarget, currency),
        endDate: periodEndDate
      })
    : t(language, "reserveMoneyAction");
  const StatusIcon = statusCopy.icon;

  return (
    <>
      <PageHeader
        eyebrow={t(language, "dashboard")}
        title={t(language, "todayName", { name: profile?.full_name?.split(" ")[0] ?? t(language, "driver") })}
        subtitle={t(language, "dashboardSubtitle")}
        variant="hero"
      >
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button className="btn-primary" type="button" onClick={() => setShowQuickLogModal(true)}>
            <Plus size={18} aria-hidden="true" />
            {t(language, "logWork")}
          </button>
          <div className="relative">
            <button className="btn-secondary w-full sm:w-auto" type="button" onClick={() => setShowAddMenu((value) => !value)}>
            <Plus size={18} aria-hidden="true" />
              {t(language, "addMenu")}
              {showAddMenu ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            </button>
            {showAddMenu ? (
              <div className="absolute right-0 z-30 mt-2 w-full min-w-56 rounded-2xl border border-line bg-surface p-2 shadow-card sm:w-64">
                <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-ink" href="/bills">
                  <Receipt size={17} aria-hidden="true" />
                  {t(language, "bill")}
                </Link>
                <button
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-ink"
                  type="button"
                  onClick={() => {
                    setShowAddMenu(false);
                    setShowQuickExpenseModal(true);
                  }}
                >
                  <Wallet size={17} aria-hidden="true" />
                  {t(language, "expense")}
                </button>
                <Link className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold text-neutral-600 hover:bg-neutral-50 hover:text-ink" href="/income">
                  <BarChart3 size={17} aria-hidden="true" />
                  {t(language, "payment")}
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </PageHeader>

      {quickLogMessage ? <p className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">{quickLogMessage}</p> : null}
      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="card p-5 text-sm text-neutral-600">{t(language, "loadingDashboard")}</div>
      ) : (
        <div className="space-y-5">
          <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="field-label" htmlFor="projection-period">
                {t(language, "projectionPeriod")}
              </label>
              <p className="mt-1 text-sm text-neutral-600">
                {formatDate(dashboard.cashFlow.startDate, language)} - {formatDate(dashboard.cashFlow.endDate, language)}
              </p>
            </div>
            <div className="grid gap-3 sm:min-w-72">
              <select
                id="projection-period"
                className="field"
                value={projectionPeriod}
                onChange={(event) => changeProjectionPeriod(event.target.value as ProjectionPeriod)}
              >
                {(["this_month", "custom"] as ProjectionPeriod[]).map((period) => (
                  <option key={period} value={period}>
                    {projectionPeriodLabel(language, period)}
                    {period === "custom" && !canUseCustomPeriod ? ` (${t(language, "proFeature")})` : ""}
                  </option>
                ))}
              </select>
              {upgradeMessage ? (
                <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
                  <div className="flex items-start gap-2">
                    <LockKeyhole className="mt-0.5 shrink-0" size={16} aria-hidden="true" />
                    <p>{upgradeMessage}</p>
                  </div>
                  <Link className="btn-primary mt-3" href="/pricing">
                    {t(language, "upgrade")}
                  </Link>
                </div>
              ) : null}
              {projectionPeriod === "custom" && canUseCustomPeriod ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="field-label">{t(language, "startDate")}</span>
                    <input
                      className="field"
                      type="date"
                      value={customStartDate}
                      onChange={(event) => {
                        const nextStart = event.target.value;
                        setCustomStartDate(nextStart);
                        if (customEndDate < nextStart) {
                          setCustomEndDate(nextStart);
                        }
                      }}
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="field-label">{t(language, "endDate")}</span>
                    <input
                      className="field"
                      type="date"
                      min={customStartDate}
                      value={customEndDate}
                      onChange={(event) => setCustomEndDate(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </div>

          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#05070d] shadow-2xl shadow-emerald-950/20">
            <div className="relative border-b border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(34,197,94,0.26),transparent_28rem),radial-gradient(circle_at_86%_8%,rgba(56,189,248,0.2),transparent_24rem),linear-gradient(145deg,rgba(15,23,42,0.98),rgba(5,7,13,0.98))] p-5 text-white sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_36%)]" />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg shadow-emerald-500/10">
                    <StatusIcon size={30} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/90">{t(language, "periodStatus")}</p>
                    <h2 className="mt-2 max-w-3xl text-2xl font-black leading-tight text-white sm:text-4xl">{statusHeadline}</h2>
                    <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">{t(language, "projectionBasedOnIncomeBalanceBills")}</p>
                    {dashboard.overdueTotal > 0 ? (
                      <p className="mt-2 max-w-2xl text-sm font-black leading-6 text-rose-100">
                        {t(language, "includesOverdueAmount", {
                          amount: formatCurrency(dashboard.overdueTotal, currency)
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
                <span className={clsx("inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-black backdrop-blur", statusCopy.className)}>
                  <Activity size={15} aria-hidden="true" />
                  {statusCopy.label}
                </span>
              </div>

              <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DashboardMetric
                  icon={hasShortfall ? AlertTriangle : CheckCircle2}
                  label={periodResultLabel}
                  value={formatCurrency(hasShortfall ? periodResultValue : 0, currency)}
                  helper={`${projectionPeriodLabel(language, dashboard.cashFlow.period)} · ${formatDate(dashboard.cashFlow.startDate, language)} - ${formatDate(
                    dashboard.cashFlow.endDate,
                    language
                  )}`}
                  tone={hasShortfall ? "danger" : "good"}
                  inverted
                />
                <DashboardMetric
                  icon={Target}
                  label={t(language, "suggestedDailyTarget")}
                  value={`${formatCurrency(suggestedDailyTarget, currency)}/${t(language, "dayShort")}`}
                  helper={t(language, "toCoverBillsBy", { endDate: periodEndDate })}
                  tone={hasShortfall ? "warn" : "neutral"}
                  inverted
                />
                <DashboardMetric
                  icon={AlertTriangle}
                  label={t(language, "overdueBills")}
                  value={formatCurrency(dashboard.overdueTotal, currency)}
                  helper={dashboard.overdueTotal > 0 ? t(language, "includesOverdueUnpaid") : t(language, "noOverdueBills")}
                  tone={dashboard.overdueTotal > 0 ? "danger" : "good"}
                  inverted
                />
                <DashboardMetric
                  icon={CalendarClock}
                  label={t(language, "nextCriticalBill")}
                  value={dashboard.nextBill ? formatCurrency(dashboard.nextBill.amount, currency) : "-"}
                  helper={
                    dashboard.nextBill
                      ? `${dashboard.nextBill.name} - ${formatDate(dashboard.nextBill.occurrenceDate, language)}`
                      : t(language, "noUnpaidBillsYet")
                  }
                  tone={dashboard.nextBill?.daysRemaining !== undefined && dashboard.nextBill.daysRemaining <= 7 ? "warn" : "neutral"}
                  inverted
                />
              </div>

              <div
                className={clsx(
                  "relative mt-5 rounded-[1.35rem] border p-4 text-sm font-semibold backdrop-blur",
                  hasShortfall ? "border-rose-300/30 bg-rose-500/10 text-rose-100" : "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                )}
              >
                <p className="text-xs font-black uppercase tracking-wide opacity-80">{t(language, "recommendedAction")}</p>
                <p className="mt-1 text-base">{recommendedAction}</p>
              </div>
            </div>

            <div className="bg-surface p-5 sm:p-6">
              <button
                className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-brand-700"
                type="button"
                onClick={() => setShowProjectionDetails((value) => !value)}
              >
                <span>{showProjectionDetails ? t(language, "hideProjectionDetails") : t(language, "showProjectionDetails")}</span>
                {showProjectionDetails ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
              </button>
              {showProjectionDetails ? (
                <div className="mt-3 space-y-4">
                  <p className="rounded-lg border border-line bg-neutral-50 p-3 text-sm text-neutral-600">
                    {t(language, "projectionPeriod")}: {formatDate(dashboard.cashFlow.startDate, language)} -{" "}
                    {formatDate(dashboard.cashFlow.endDate, language)}
                  </p>
                  {dashboard.cashFlow.income.length > 0 ? (
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-ink">{t(language, "expectedIncome")}</h3>
                      <div className="space-y-2">
                        {dashboard.cashFlow.income.map((income) => (
                          <div
                            key={`${income.source}-${income.date}-${income.amount}-${"entryId" in income ? income.entryId : income.scheduleId}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-line bg-neutral-50 p-3 text-sm"
                          >
                            <span className="text-neutral-600">{formatDate(income.date, language)}</span>
                            <span className="font-semibold text-ink">{formatCurrency(income.amount, currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {dashboard.includedBills.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-ink">{t(language, "includedBillsBreakdown")}</h3>
                      {dashboard.includedBills.map((bill) => (
                        <article key={`${bill.id}-${bill.occurrenceDate}`} className="rounded-lg border border-line bg-neutral-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-ink">{bill.name}</p>
                            <p className="shrink-0 font-bold text-ink">{formatCurrency(bill.amount, currency)}</p>
                          </div>
                          <dl className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-2">
                            <div>
                              <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "originalDueDate")}</dt>
                              <dd>{formatDate(bill.originalDueDate, language)}</dd>
                            </div>
                            <div>
                              <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "projectedOccurrenceDate")}</dt>
                              <dd>{formatDate(bill.occurrenceDate, language)}</dd>
                            </div>
                            <div>
                              <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "status")}</dt>
                              <dd>{bill.status === "paid" ? t(language, "paid") : t(language, "unpaid")}</dd>
                            </div>
                            <div>
                              <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "includedReason")}</dt>
                              <dd>
                                {bill.inclusionReason === "recurring_occurrence_in_projection_period"
                                  ? t(language, "billIncludedRecurring")
                                  : t(language, "billIncludedDueDate")}
                              </dd>
                            </div>
                          </dl>
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <button
              className="card flex min-h-20 items-center justify-between gap-3 p-4 text-left hover:border-brand-200"
              type="button"
              onClick={() => setShowQuickLogModal(true)}
            >
              <span>
                <span className="block text-sm font-black text-ink">
                  {todayWorkLogs.length > 0 ? t(language, "todayWorkLogged") : t(language, "logTodaysWork")}
                </span>
                <span className="mt-1 block text-sm font-semibold text-neutral-600">
                  {todayWorkLogs.length > 0
                    ? `${todayWorkLogs.length} ${t(language, "entries")} • ${formatCurrency(todayWorkNet, currency)}`
                    : t(language, "noWorkLoggedToday")}
                </span>
              </span>
              <span className="btn-primary min-h-10 px-3">{t(language, "logWork")}</span>
            </button>
            <button
              className="card flex min-h-20 items-center justify-between gap-3 p-4 text-left hover:border-brand-200"
              type="button"
              onClick={() => setShowQuickExpenseModal(true)}
            >
              <span>
                <span className="block text-sm font-black text-ink">{t(language, "quickExpense")}</span>
                <span className="mt-1 block text-sm font-semibold text-neutral-600">
                  {todayExpenses.length > 0
                    ? `${todayExpenses.length} ${t(language, "expenses")} • ${formatCurrency(todayExpenseTotal, currency)}`
                    : t(language, "noExpenseToday")}
                </span>
              </span>
              <span className="btn-secondary min-h-10 px-3">{t(language, "addExpense")}</span>
            </button>
          </section>

          {dashboard.overdueTotal > 0 ? (
            <OverdueBillsCard
              bills={dashboard.overdueBills}
              currency={currency}
              language={language}
              oldestBill={dashboard.oldestOverdueBill}
              showDetails={showOverdueDetails}
              total={dashboard.overdueTotal}
              onToggleDetails={() => setShowOverdueDetails((value) => !value)}
              onMarkPaid={markOccurrencePaid}
            />
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-brand-700">
                <span className="icon-chip-sm">
                  <CalendarDays size={20} aria-hidden="true" />
                </span>
                <h2 className="text-xl font-black text-ink">{t(language, "upcomingBills")}</h2>
              </div>
              <Link className="btn-secondary min-h-10 px-3" href="/bills">
                {t(language, "viewAllBills")}
              </Link>
            </div>
            {dashboard.nextBill ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-[1.35rem] border border-line bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="icon-chip-sm text-fuel-700">
                      <Receipt size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-lg font-black text-ink">{dashboard.nextBill.name}</p>
                      <p className="text-sm font-medium text-neutral-600">
                        {t(language, "due")} {formatDate(dashboard.nextBill.occurrenceDate, language)}{" - "}
                        {dashboard.nextBill.daysRemaining === 1
                          ? t(language, "daysLeft", { count: dashboard.nextBill.daysRemaining })
                          : t(language, "daysLeftPlural", { count: dashboard.nextBill.daysRemaining })}
                      </p>
                      <span className={clsx("badge mt-2", dashboard.nextBill.daysRemaining < 0 ? "badge-danger" : dashboard.nextBill.daysRemaining <= 7 ? "badge-warn" : "badge-muted")}>
                        <CalendarDays size={13} aria-hidden="true" />
                        {dashboard.nextBill.daysRemaining < 0 ? t(language, "overdue") : dashboard.nextBill.daysRemaining <= 7 ? t(language, "dueSoon") : t(language, "unpaid")}
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-black text-ink">{formatCurrency(dashboard.nextBill.amount, currency)}</p>
                </div>
                <div className="rounded-[1.25rem] border border-line bg-neutral-50 p-4">
                  <div className="h-3 overflow-hidden rounded-md bg-neutral-100">
                    <div
                      className={clsx("h-full rounded-md", dashboard.cashFlow.shortfall > 0 ? "bg-fuel-500" : "bg-brand-600")}
                      style={{ width: `${dashboard.billProgress}%` }}
                    />
                  </div>
                  <p
                    className={clsx(
                      "mt-3 text-sm font-black",
                      dashboard.cashFlow.shortfall > 0 ? "text-red-700" : "text-brand-700"
                    )}
                  >
                    {dashboard.cashFlow.shortfall > 0 ? t(language, "shortfall") : t(language, "remainingAfterBills")}:{" "}
                    {formatCurrency(
                      dashboard.cashFlow.shortfall > 0
                        ? dashboard.cashFlow.shortfall
                        : dashboard.cashFlow.projectedBalanceAfterBills,
                      currency
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-neutral-50 p-4">
                <p className="font-semibold text-ink">{t(language, "noUnpaidBillsYet")}</p>
                <p className="mt-1 text-sm text-neutral-600">{t(language, "addNextBillHelper")}</p>
                <Link className="btn-primary mt-4" href="/bills">
                  <Plus size={17} aria-hidden="true" />
                  {t(language, "addYourFirstBill")}
                </Link>
              </div>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="icon-chip">
                  <BarChart3 size={26} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-xl font-black text-ink">{t(language, "currentMonthSummary")}</h2>
                  <p className="text-sm font-medium text-neutral-600">{t(language, "currentMonthSummaryHelper")}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryItem icon={PiggyBank} label={t(language, "totalIncome")} value={formatCurrency(dashboard.summary.totalIncome, currency)} tone="good" />
              <SummaryItem icon={Activity} label={t(language, "workProfit")} value={formatCurrency(dashboard.summary.workProfit, currency)} />
              <SummaryItem
                icon={Wallet}
                label={t(language, "periodNetResult")}
                value={formatCurrency(dashboard.summary.periodNetResult, currency)}
                tone={dashboard.summary.periodNetResult < 0 ? "danger" : "good"}
              />
              <SummaryItem icon={Receipt} label={t(language, "unpaidBills")} value={formatCurrency(dashboard.summary.totalUnpaidBills, currency)} tone={dashboard.summary.totalUnpaidBills > 0 ? "warn" : "good"} />
            </div>
            <div className="mt-4 border-t border-line pt-3">
              <button
                className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-brand-700"
                type="button"
                onClick={() => setShowFullMonthlySummary((value) => !value)}
              >
                <span>{showFullMonthlySummary ? t(language, "hideFullMonthlySummary") : t(language, "showFullMonthlySummary")}</span>
                {showFullMonthlySummary ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
              </button>
              {showFullMonthlySummary ? (
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
                  <SummaryItem icon={CheckCircle2} label={t(language, "paidBills")} value={formatCurrency(dashboard.summary.totalBillsPaid, currency)} />
                  <SummaryItem icon={Receipt} label={t(language, "periodExpenses")} value={formatCurrency(dashboard.summary.totalExpenses, currency)} />
                  <SummaryItem
                    icon={Wallet}
                    label={t(language, "estimatedBalance")}
                    value={formatCurrency(dashboard.summary.estimatedRemainingBalance, currency)}
                  />
                  <SummaryItem label={t(language, "totalMiles")} value={`${dashboard.summary.totalMiles.toFixed(1)} mi`} />
                  <SummaryItem label={t(language, "totalGasCost")} value={formatCurrency(dashboard.summary.totalGasCost, currency)} />
                  <SummaryItem icon={PiggyBank} label={t(language, "expectedIncome")} value={formatCurrency(dashboard.summary.expectedIncome, currency)} />
                </div>
              ) : null}
            </div>
          </section>
          </div>

          <Link className="group flex items-center justify-between gap-4 rounded-[1.7rem] border border-brand-200/70 bg-gradient-to-br from-brand-50 to-neutral-50 p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-glow" href="/driver-log">
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-500 to-cyan-400 text-slate-950 shadow-glow transition group-hover:scale-105">
                <ClipboardList size={28} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-black text-ink">{t(language, "driverLog")}</h2>
                <p className="text-sm font-medium text-neutral-600">{t(language, "driverLogDashboardHelper")}</p>
              </div>
            </div>
            <span className="btn-secondary min-h-10 shrink-0">{t(language, "open")}</span>
          </Link>

          {bills.length === 0 || entries.length === 0 || vehicles.length === 0 || paySchedules.length === 0 ? (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-black text-ink">{t(language, "setupReminders")}</h2>
              <div className="divide-y divide-line">
              {bills.length === 0 ? (
                <SetupReminder href="/bills" label={t(language, "addBill")} />
              ) : null}
              {entries.length === 0 ? (
                <SetupReminder href="/income" label={t(language, "addIncome")} />
              ) : null}
              {paySchedules.length === 0 ? (
                <SetupReminder href="/settings" label={t(language, "addPaySchedule")} />
              ) : null}
              {vehicles.length === 0 ? (
                <SetupReminder href="/vehicle" label={t(language, "addVehicle")} />
              ) : null}
              </div>
            </section>
          ) : null}
        </div>
      )}

      {showQuickLogModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-w-2xl rounded-[2rem] border border-line bg-surface p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">{t(language, "driverLog")}</p>
                <h2 className="mt-1 text-2xl font-black text-ink">{t(language, "logTodaysWork")}</h2>
              </div>
              <button className="btn-secondary min-h-10 px-3" type="button" onClick={discardQuickWorkLog}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            {!canCreateDriverLog ? (
              <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800">
                <p>{t(language, "freeDriverLogLimitMessage")}</p>
                <Link className="btn-primary mt-3" href="/pricing">
                  {t(language, "upgrade")}
                </Link>
              </div>
            ) : null}
            <WorkRecordForm
              currency={currency}
              form={quickLogForm}
              language={language}
              profile={profile}
              saving={savingQuickLog}
              setForm={setQuickLogForm}
              submitLabel={t(language, "saveLog")}
              onCancel={discardQuickWorkLog}
              onSubmit={saveQuickWorkLog}
            />
          </div>
        </div>
      ) : null}

      {showQuickExpenseModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm">
          <div className="mx-auto max-w-xl rounded-[2rem] border border-line bg-surface p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">{t(language, "expenses")}</p>
                <h2 className="mt-1 text-2xl font-black text-ink">{t(language, "addExpense")}</h2>
              </div>
              <button className="btn-secondary min-h-10 px-3" type="button" onClick={discardQuickExpense}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <ExpenseForm
              form={quickExpenseForm}
              language={language}
              saving={savingQuickExpense}
              setForm={setQuickExpenseForm}
              submitLabel={t(language, "addExpense")}
              onCancel={discardQuickExpense}
              onSubmit={saveQuickExpense}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function DashboardMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  inverted = false
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "danger" | "cyan";
  inverted?: boolean;
}) {
  const cleanHelper = helper?.replace(/\u00c2/g, "");

  return (
    <div
      className={clsx(
        "rounded-[1.35rem] border p-4 shadow-sm",
        inverted ? "border-white/10 bg-white/[0.07] text-white backdrop-blur" : "border-line bg-neutral-50",
        tone === "good" && (inverted ? "border-emerald-300/25" : "border-brand-200"),
        tone === "warn" && (inverted ? "border-amber-300/30" : "border-amber-200"),
        tone === "danger" && (inverted ? "border-rose-300/30" : "border-red-200"),
        tone === "cyan" && (inverted ? "border-cyan-300/30" : "border-cyan-500")
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={clsx("text-xs font-black uppercase tracking-wide", inverted ? "text-slate-300" : "text-neutral-500")}>{label}</p>
        {Icon ? (
          <span
            className={clsx(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
              inverted && "border-white/10 bg-white/10 text-white",
              !inverted && "border-brand-200 bg-brand-50 text-brand-700",
              tone === "good" && (inverted ? "text-emerald-200" : "border-brand-200 bg-brand-50 text-brand-700"),
              tone === "warn" && (inverted ? "text-amber-200" : "border-amber-200 bg-amber-50 text-amber-700"),
              tone === "danger" && (inverted ? "text-rose-200" : "border-red-200 bg-red-50 text-red-700"),
              tone === "cyan" && (inverted ? "text-cyan-200" : "border-cyan-500 bg-brand-50 text-cyan-500")
            )}
          >
            <Icon size={22} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className={clsx("mt-3 text-2xl font-black", inverted ? "text-white" : "text-ink")}>{value}</p>
      {cleanHelper ? <p className={clsx("mt-1 text-xs font-semibold leading-5", inverted ? "text-slate-300" : "text-neutral-500")}>{cleanHelper}</p> : null}
    </div>
  );
}

function SummaryItem({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string; icon?: LucideIcon; tone?: "neutral" | "good" | "warn" | "danger" }) {
  return (
    <div
      className={clsx(
        "metric-card",
        tone === "good" && "border-brand-200",
        tone === "warn" && "border-amber-200",
        tone === "danger" && "border-red-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-500">{label}</p>
        {Icon ? (
          <span className={clsx("icon-chip-sm", tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700", tone === "danger" && "border-red-200 bg-red-50 text-red-700")}>
            <Icon size={20} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-xl font-black text-ink">{value}</p>
    </div>
  );
}

function OverdueBillsCard({
  bills,
  currency,
  language,
  oldestBill,
  showDetails,
  total,
  onToggleDetails,
  onMarkPaid
}: {
  bills: BillOccurrence[];
  currency: string;
  language: string;
  oldestBill?: BillOccurrence;
  showDetails: boolean;
  total: number;
  onToggleDetails: () => void;
  onMarkPaid: (bill: BillOccurrence) => void;
}) {
  return (
    <section className="card border-red-200/80 p-5 shadow-red-950/10 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700 shadow-sm">
            <AlertTriangle size={24} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">{t(language, "overdueBills")}</p>
            <h2 className="mt-1 text-2xl font-black text-ink">
              {formatCurrency(total, currency)} {t(language, "overdueOpen")}
            </h2>
            <p className="mt-1 text-sm font-semibold text-neutral-600">
              {bills.length} {t(language, "overdueBillsCount")}
            </p>
            {oldestBill ? (
              <p className="mt-1 text-sm font-medium text-neutral-600">
                {t(language, "oldest")}: {oldestBill.name} - {formatDate(oldestBill.occurrenceDate, language)}
              </p>
            ) : null}
          </div>
        </div>
        <button className="btn-secondary min-h-10" type="button" onClick={onToggleDetails}>
          {showDetails ? t(language, "hideOverdue") : t(language, "viewOverdue")}
          {showDetails ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
        </button>
      </div>

      <p className="mt-4 rounded-[1rem] border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {t(language, "includesOverdueUnpaid")}
      </p>

      {showDetails ? (
        <div className="mt-4 space-y-3">
          {bills.map((bill) => {
            const daysOverdue = Math.abs(bill.daysRemaining);

            return (
              <article key={`${bill.id}-${bill.occurrenceDate}`} className="rounded-[1.1rem] border border-line bg-neutral-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-ink">{bill.name}</p>
                      <span className="badge badge-danger">{bill.category}</span>
                    </div>
                    <dl className="mt-3 grid gap-2 text-xs text-neutral-600 sm:grid-cols-2">
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "originalDueDate")}</dt>
                        <dd>{formatDate(bill.originalDueDate, language)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "projectedOccurrenceDate")}</dt>
                        <dd>{formatDate(bill.occurrenceDate, language)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "status")}</dt>
                        <dd>{t(language, "unpaid")}</dd>
                      </div>
                      <div>
                        <dt className="font-medium uppercase tracking-wide text-neutral-500">{t(language, "includedReason")}</dt>
                        <dd>
                          {bill.inclusionReason === "recurring_occurrence_in_projection_period"
                            ? t(language, "billIncludedRecurring")
                            : t(language, "billIncludedDueDate")}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-sm font-black text-red-700">
                      {daysOverdue} {t(language, "daysOverdue")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <p className="text-xl font-black text-ink">{formatCurrency(bill.amount, currency)}</p>
                    <button className="btn-secondary min-h-10" type="button" onClick={() => onMarkPaid(bill)}>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      {t(language, "markPaid")}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function SetupReminder({ href, label }: { href: string; label: string }) {
  return (
    <Link className="flex items-center justify-between gap-3 py-3 text-sm font-semibold text-ink transition hover:text-brand-700" href={href}>
      <span className="flex items-center gap-3">
        <span className="icon-chip-sm">
          <CheckCircle2 size={18} aria-hidden="true" />
        </span>
        {label}
      </span>
      <ArrowRight className="shrink-0 text-brand-700" size={16} aria-hidden="true" />
    </Link>
  );
}
