"use client";

import clsx from "clsx";
import {
  ArrowRight,
  Activity,
  BarChart3,
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
  Wallet
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";
import {
  calculateCashFlowProjectionForPeriod,
  calculateMonthlySummary,
  getCustomProjectionRange,
  getDefaultMonthlyProjectionRange,
  type ProjectionPeriod
} from "@/lib/financeCalculations";
import { formatCurrency, formatDate, toDateInputValue } from "@/lib/format";
import { projectionPeriodLabel, t } from "@/lib/i18n";
import { canUseCustomProjection, getCurrentPlan } from "@/lib/planLimits";
import { getSupabaseClient } from "@/lib/supabase";
import type { Bill, BillOccurrenceStatus, DailyIncomeEntry, PaySchedule, Vehicle } from "@/types/app";

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [billOccurrenceStatuses, setBillOccurrenceStatuses] = useState<BillOccurrenceStatus[]>([]);
  const [paySchedules, setPaySchedules] = useState<PaySchedule[]>([]);
  const [entries, setEntries] = useState<DailyIncomeEntry[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [asOf] = useState(() => new Date());
  const [projectionPeriod, setProjectionPeriod] = useState<ProjectionPeriod>("this_month");
  const [customStartDate, setCustomStartDate] = useState(() => toDateInputValue(new Date()));
  const [customEndDate, setCustomEndDate] = useState(() =>
    toDateInputValue(getDefaultMonthlyProjectionRange(new Date()).end)
  );
  const [showProjectionDetails, setShowProjectionDetails] = useState(false);
  const [showFullMonthlySummary, setShowFullMonthlySummary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState("");

  const currency = "USD";
  const language = profile?.language ?? "en";
  const currentPlan = getCurrentPlan(profile);
  const canUseCustomPeriod = canUseCustomProjection(currentPlan);
  const currentBalance = Number(profile?.current_balance ?? 0);
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
    const [billResult, occurrenceResult, scheduleResult, entryResult, vehicleResult] = await Promise.all([
      supabase.from("bills").select("*").eq("user_id", user.id),
      supabase.from("bill_occurrences").select("*").eq("user_id", user.id),
      supabase.from("pay_schedules").select("*").eq("user_id", user.id),
      supabase.from("daily_income_entries").select("*").eq("user_id", user.id),
      supabase.from("vehicles").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
    ]);

    const firstError =
      billResult.error ?? occurrenceResult.error ?? scheduleResult.error ?? entryResult.error ?? vehicleResult.error;

    if (firstError) {
      setError(firstError.message);
    } else {
      setBills(billResult.data ?? []);
      setBillOccurrenceStatuses(occurrenceResult.data ?? []);
      setPaySchedules(scheduleResult.data ?? []);
      setEntries(entryResult.data ?? []);
      setVehicles(vehicleResult.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
    const summary = calculateMonthlySummary(entries, bills, paySchedules, currentBalance, asOf, billOccurrenceStatuses);
    const includedBillsTotal = cashFlow.bills.reduce((sum, bill) => sum + Number(bill.amount ?? 0), 0);
    const billProgress =
      includedBillsTotal > 0
        ? Math.min(100, (cashFlow.projectedCash / Math.max(1, includedBillsTotal)) * 100)
        : 100;

    return {
      cashFlow,
      nextBill: cashFlow.bills[0],
      includedBillsTotal,
      billProgress,
      summary,
      includedBills: cashFlow.bills
    };
  }, [asOf, billOccurrenceStatuses, bills, currentBalance, entries, paySchedules, projectionRange]);

  const statusCopy = {
    low: {
      label: t(language, "periodOnTrack"),
      helper: t(language, "riskLowHelper"),
      tone: "good" as const,
      className: "border-brand-200 bg-brand-500/10 text-brand-700"
    },
    medium: {
      label: t(language, "periodClose"),
      helper: t(language, "riskMediumHelper"),
      tone: "warn" as const,
      className: "border-amber-200 bg-amber-50 text-amber-800"
    },
    high: {
      label: t(language, "periodBehind"),
      helper: t(language, "riskHighHelper"),
      tone: "danger" as const,
      className: "border-red-200 bg-red-500/10 text-red-700"
    }
  }[dashboard.cashFlow.riskLevel];
  const hasShortfall = dashboard.cashFlow.shortfall > 0;
  const periodResultLabel = hasShortfall ? t(language, "shortfallToCover") : t(language, "estimatedLeftover");
  const periodResultValue = hasShortfall
    ? dashboard.cashFlow.shortfall
    : Math.max(0, dashboard.cashFlow.projectedBalanceAfterBills);
  const recommendedAction = hasShortfall
    ? `${t(language, "earnAtLeast")} ${formatCurrency(dashboard.cashFlow.shortfall, currency)} ${t(language, "toCoverPeriodBills")}`
    : t(language, "coveredForUpcomingBillsPeriod");

  return (
    <>
      <PageHeader
        eyebrow={t(language, "dashboard")}
        title={t(language, "todayName", { name: profile?.full_name?.split(" ")[0] ?? t(language, "driver") })}
        subtitle={t(language, "dashboardSubtitle")}
      >
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Link className="btn-secondary" href="/bills">
            <Plus size={18} aria-hidden="true" />
            {t(language, "addBill")}
          </Link>
          <Link className="btn-primary" href="/income">
            <Plus size={18} aria-hidden="true" />
            {t(language, "addIncome")}
          </Link>
        </div>
      </PageHeader>

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

          <section className="card overflow-hidden p-0">
            <div className="border-b border-line bg-neutral-50 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="icon-chip">
                    <ShieldAlert size={26} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-neutral-500">{t(language, "periodStatus")}</p>
                    <h2 className="mt-1 text-2xl font-black text-ink sm:text-3xl">{t(language, "canCoverUpcomingBills")}</h2>
                    <p className="mt-1 text-sm font-medium text-neutral-600">{t(language, "projectionBasedOnIncomeBalanceBills")}</p>
                  </div>
                </div>
                <span className={clsx("inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-black", statusCopy.className)}>
                  <Activity size={15} aria-hidden="true" />
                  {statusCopy.label}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DashboardMetric
                  icon={PiggyBank}
                  label={t(language, "projectedCash")}
                  value={formatCurrency(dashboard.cashFlow.projectedCash, currency)}
                  helper={`${projectionPeriodLabel(language, dashboard.cashFlow.period)} · ${formatDate(dashboard.cashFlow.startDate, language)} - ${formatDate(
                    dashboard.cashFlow.endDate,
                    language
                  )}`}
                  tone="good"
                />
                <DashboardMetric
                  icon={Receipt}
                  label={t(language, "billsInPeriod")}
                  value={formatCurrency(dashboard.includedBillsTotal, currency)}
                  helper={t(language, "upcomingUnpaidBills")}
                />
                <DashboardMetric
                  icon={hasShortfall ? ShieldAlert : CheckCircle2}
                  label={periodResultLabel}
                  value={formatCurrency(periodResultValue, currency)}
                  helper={hasShortfall ? t(language, "amountNeededToCoverBills") : t(language, "afterBillsSelectedPeriod")}
                  tone={hasShortfall ? "danger" : "good"}
                />
                <DashboardMetric
                  icon={Wallet}
                  label={t(language, "needToEarnToday")}
                  value={formatCurrency(dashboard.cashFlow.needToEarnToday, currency)}
                  helper={t(language, "neededTodayToCoverPeriod")}
                  tone={dashboard.cashFlow.needToEarnToday > 0 ? "warn" : "neutral"}
                />
              </div>

              <div
                className={clsx(
                  "mt-4 rounded-[1.25rem] border p-4 text-sm font-semibold",
                  hasShortfall ? "border-red-200 bg-red-500/10 text-red-700" : "border-brand-200 bg-brand-500/10 text-brand-700"
                )}
              >
                <p className="text-xs font-black uppercase tracking-wide opacity-80">{t(language, "recommendedAction")}</p>
                <p className="mt-1 text-base">{recommendedAction}</p>
              </div>
            </div>

            <div className="p-5 sm:p-6">
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
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-neutral-600">{t(language, "projectedCash")}</span>
                    <span className="font-black text-ink">{formatCurrency(dashboard.cashFlow.projectedCash, currency)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-neutral-600">{t(language, "billsInPeriod")}</span>
                    <span className="font-black text-ink">{formatCurrency(dashboard.includedBillsTotal, currency)}</span>
                  </div>
                  <div className="mt-3 h-3 overflow-hidden rounded-md bg-neutral-100">
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

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryItem icon={PiggyBank} label={t(language, "totalIncome")} value={formatCurrency(dashboard.summary.totalIncome, currency)} tone="good" />
              <SummaryItem icon={Activity} label={t(language, "netProfit")} value={formatCurrency(dashboard.summary.netProfit, currency)} />
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
                  <SummaryItem icon={CheckCircle2} label={t(language, "billsPaid")} value={formatCurrency(dashboard.summary.totalBillsPaid, currency)} />
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

          <Link className="card flex items-center justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50" href="/driver-log">
            <div className="flex items-center gap-3">
              <span className="icon-chip">
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
    </>
  );
}

function DashboardMetric({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral"
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  return (
    <div
      className={clsx(
        "rounded-[1.35rem] border border-line bg-neutral-50 p-4 shadow-sm",
        tone === "good" && "border-brand-200",
        tone === "warn" && "border-amber-200",
        tone === "danger" && "border-red-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-neutral-500">{label}</p>
        {Icon ? (
          <span
            className={clsx(
              "icon-chip-sm",
              tone === "warn" && "border-amber-200 bg-amber-50 text-amber-700",
              tone === "danger" && "border-red-200 bg-red-50 text-red-700"
            )}
          >
            <Icon size={19} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-black text-ink">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-neutral-500">{helper}</p> : null}
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
