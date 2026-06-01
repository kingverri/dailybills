import { daysOfWeek } from "@/lib/constants";
import type { Bill, DailyIncomeEntry, DriverLog, PaySchedule, RiskLevel, WeeklySettlementDay } from "@/types/app";

type DateLike = string | Date;

export type BillInclusionReason =
  | "due_date_in_projection_period"
  | "recurring_occurrence_in_projection_period";

export type BillOccurrence = Bill & {
  originalDueDate: string;
  occurrenceDate: string;
  daysRemaining: number;
  inclusionReason: BillInclusionReason;
};

export type ProjectedIncomeOccurrence = {
  source: "projected";
  scheduleId: string;
  scheduleType: PaySchedule["schedule_type"];
  amount: number;
  date: string;
  isVariable: boolean;
};

export type ManualIncomeOccurrence = {
  source: "actual" | "confirmed" | "extra_gig";
  entryId: string;
  amount: number;
  date: string;
};

export type ExpectedIncomeOccurrence = ProjectedIncomeOccurrence | ManualIncomeOccurrence;

export type ProjectionPeriod = "this_month" | "custom";

export type ProjectionPeriodRange = {
  period: ProjectionPeriod;
  start: Date;
  end: Date;
};

export type ProjectionCashFlowInput = {
  currentBalance: number;
  bills: Bill[];
  paySchedules: PaySchedule[];
  incomeEntries?: DailyIncomeEntry[];
  period?: ProjectionPeriod;
  projectionRange?: ProjectionPeriodRange;
  startDate?: DateLike;
  endDate?: DateLike;
  asOf?: DateLike;
  emergencyBuffer?: number;
};

export type ProjectionCashFlow = {
  period: ProjectionPeriod;
  startDate: string;
  endDate: string;
  income: ExpectedIncomeOccurrence[];
  bills: BillOccurrence[];
  projectedIncome: number;
  projectedCash: number;
  requiredBills: number;
  projectedBalanceAfterBills: number;
  safeToSpendToday: number;
  shortfall: number;
  needToEarnToday: number;
  riskLevel: RiskLevel;
};

export type SafeToSpendInput = {
  currentBalance: number;
  bills: Bill[];
  paySchedules: PaySchedule[];
  incomeEntries?: DailyIncomeEntry[];
  horizonDays?: number;
  asOf?: DateLike;
};

export type DailyTargetInput = {
  currentBalance: number;
  bills: Bill[];
  paySchedules: PaySchedule[];
  incomeEntries?: DailyIncomeEntry[];
  asOf?: DateLike;
};

export type MonthlySummary = {
  totalIncome: number;
  totalBillsPaid: number;
  totalUnpaidBills: number;
  estimatedRemainingBalance: number;
  expectedIncome: number;
  totalMiles: number;
  totalGasCost: number;
  netProfit: number;
};

export type DriverLogMetrics = {
  hoursWorked: number;
  earningsPerHour: number;
  earningsPerMile: number;
  gallonsBought: number;
  netProfit: number;
  netProfitPerHour: number;
  netProfitPerMile: number;
};

export type DriverWeekRange = {
  start: Date;
  end: Date;
  startDate: string;
  endDate: string;
};

export type WeeklyDriverSummary = {
  startDate: string;
  endDate: string;
  totalGrossEarnings: number;
  totalMiles: number;
  totalHoursWorked: number;
  totalGasSpent: number;
  averageGasPricePaid: number;
  totalGallonsBought: number;
  totalExtraExpenses: number;
  netProfit: number;
  grossPerHour: number;
  netPerHour: number;
  grossPerMile: number;
  netPerMile: number;
  workDaysLogged: number;
};

const millisPerDay = 24 * 60 * 60 * 1000;

function startOfDay(value: DateLike = new Date()) {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00`) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.ceil((startOfDay(to).getTime() - startOfDay(from).getTime()) / millisPerDay));
}

function monthStart(value: DateLike) {
  const date = startOfDay(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(value: DateLike) {
  const date = startOfDay(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function dateFromMonthDay(year: number, month: number, day: number) {
  const date = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return date;
}

function nextWeekdayDate(from: Date, dayName: string) {
  const targetIndex = daysOfWeek.indexOf(dayName as (typeof daysOfWeek)[number]);
  if (targetIndex < 0) {
    return null;
  }

  const jsTarget = (targetIndex + 1) % 7;
  const diff = (jsTarget - from.getDay() + 7) % 7;
  return addDays(from, diff);
}

function normalizeAmount(amount: number | null | undefined) {
  const value = Number(amount ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getIncomeEntryType(entry: DailyIncomeEntry) {
  return entry.income_entry_type ?? "actual";
}

function isBetweenInclusive(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

export function expandRecurringBillsWithinPeriod(bills: Bill[], from: DateLike, to: DateLike) {
  const start = startOfDay(from);
  const end = startOfDay(to);
  const occurrences: BillOccurrence[] = [];

  for (const bill of bills) {
    let due = startOfDay(bill.due_date);
    const firstDueDate = startOfDay(bill.due_date);
    const originalDueDate = toIsoDate(due);

    const pushBill = (date: Date, inclusionReason: BillInclusionReason) => {
      if (date >= firstDueDate && isBetweenInclusive(date, start, end)) {
        occurrences.push({
          ...bill,
          originalDueDate,
          occurrenceDate: toIsoDate(date),
          daysRemaining: daysBetween(start, date),
          inclusionReason
        });
      }
    };

    if (bill.recurrence === "one-time" || bill.recurrence === "custom") {
      pushBill(due, "due_date_in_projection_period");
      continue;
    }

    const intervalDays = bill.recurrence === "weekly" ? 7 : bill.recurrence === "biweekly" ? 14 : null;

    if (intervalDays) {
      while (due < start) {
        due = addDays(due, intervalDays);
      }
      while (due <= end) {
        pushBill(
          due,
          toIsoDate(due) === originalDueDate
            ? "due_date_in_projection_period"
            : "recurring_occurrence_in_projection_period"
        );
        due = addDays(due, intervalDays);
      }
      continue;
    }

    const monthlyDay = due.getDate();
    let monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (monthCursor <= end) {
      due = dateFromMonthDay(monthCursor.getFullYear(), monthCursor.getMonth(), monthlyDay);
      pushBill(
        due,
        toIsoDate(due) === originalDueDate
          ? "due_date_in_projection_period"
          : "recurring_occurrence_in_projection_period"
      );
      monthCursor = addMonths(monthCursor, 1);
    }
  }

  const uniqueOccurrences = new Map<string, BillOccurrence>();

  for (const occurrence of occurrences) {
    uniqueOccurrences.set(`${occurrence.id}:${occurrence.occurrenceDate}`, occurrence);
  }

  return [...uniqueOccurrences.values()].sort((a, b) => {
    const dateSort = a.occurrenceDate.localeCompare(b.occurrenceDate);
    return dateSort === 0 ? a.name.localeCompare(b.name) : dateSort;
  });
}

export function calculateUpcomingBills(
  bills: Bill[],
  from: DateLike = new Date(),
  horizonDays = 45
): BillOccurrence[] {
  const start = startOfDay(from);
  return expandRecurringBillsWithinPeriod(bills, start, addDays(start, horizonDays)).filter(
    (bill) => bill.status === "unpaid"
  );
}

export function generateProjectedIncomeFromPaySchedules(
  paySchedules: PaySchedule[],
  from: DateLike = new Date(),
  to: DateLike = addDays(new Date(), 45)
): ProjectedIncomeOccurrence[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  const income: ProjectedIncomeOccurrence[] = [];

  for (const schedule of paySchedules) {
    const amount = normalizeAmount(schedule.estimated_amount);
    if (amount <= 0) {
      continue;
    }

    const pushIncome = (date: Date) => {
      if (isBetweenInclusive(date, start, end)) {
        income.push({
          source: "projected",
          scheduleId: schedule.id,
          scheduleType: schedule.schedule_type,
          amount,
          date: toIsoDate(date),
          isVariable: schedule.is_variable
        });
      }
    };

    if (schedule.schedule_type === "weekly" && schedule.day_of_week) {
      let next = nextWeekdayDate(start, schedule.day_of_week);
      while (next && next <= end) {
        pushIncome(next);
        next = addDays(next, 7);
      }
    }

    if (schedule.schedule_type === "biweekly" && schedule.next_payment_date) {
      let next = startOfDay(schedule.next_payment_date);
      while (next < start) {
        next = addDays(next, 14);
      }
      while (next <= end) {
        pushIncome(next);
        next = addDays(next, 14);
      }
    }

    if (schedule.schedule_type === "twice_per_month") {
      const payDays = [schedule.first_day_of_month, schedule.second_day_of_month].filter(
        (day): day is number => Boolean(day)
      );
      let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        for (const day of payDays) {
          pushIncome(dateFromMonthDay(cursor.getFullYear(), cursor.getMonth(), day));
        }
        cursor = addMonths(cursor, 1);
      }
    }

    if (schedule.schedule_type === "monthly" && schedule.first_day_of_month) {
      let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor <= end) {
        pushIncome(dateFromMonthDay(cursor.getFullYear(), cursor.getMonth(), schedule.first_day_of_month));
        cursor = addMonths(cursor, 1);
      }
    }

    if (schedule.schedule_type === "custom" && schedule.next_payment_date) {
      pushIncome(startOfDay(schedule.next_payment_date));
    }
  }

  return income.sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeActualIncomeWithProjectedIncome(
  projectedIncome: ProjectedIncomeOccurrence[],
  incomeEntries: DailyIncomeEntry[],
  from: DateLike = new Date(),
  to: DateLike = addDays(new Date(), 45)
): ExpectedIncomeOccurrence[] {
  const start = startOfDay(from);
  const end = startOfDay(to);
  const entriesInRange = incomeEntries.filter((entry) =>
    isBetweenInclusive(startOfDay(entry.date), start, end)
  );

  // Actual/manual/confirmed income entries override projected recurring income on the same date.
  const replacementDates = new Set(
    entriesInRange
      .filter((entry) => getIncomeEntryType(entry) !== "extra_gig")
      .map((entry) => entry.date)
  );
  const projectedWithoutReplacedDates = projectedIncome.filter((income) => !replacementDates.has(income.date));
  const manualIncome = entriesInRange.map<ManualIncomeOccurrence>((entry) => ({
    source: getIncomeEntryType(entry),
    entryId: entry.id,
    amount: normalizeAmount(entry.gross_earnings),
    date: entry.date
  }));

  return [...projectedWithoutReplacedDates, ...manualIncome].sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateExpectedIncomeWithoutDoubleCounting(
  paySchedules: PaySchedule[],
  incomeEntries: DailyIncomeEntry[] = [],
  from: DateLike = new Date(),
  to: DateLike = addDays(new Date(), 45)
): ExpectedIncomeOccurrence[] {
  const projected = generateProjectedIncomeFromPaySchedules(paySchedules, from, to);
  return mergeActualIncomeWithProjectedIncome(projected, incomeEntries, from, to);
}

export function calculateExpectedIncome(
  paySchedules: PaySchedule[],
  from: DateLike = new Date(),
  to: DateLike = addDays(new Date(), 45)
): ProjectedIncomeOccurrence[] {
  return generateProjectedIncomeFromPaySchedules(paySchedules, from, to);
}

export function getDefaultMonthlyProjectionRange(asOf: DateLike = new Date()): ProjectionPeriodRange {
  const start = startOfDay(asOf);

  return {
    period: "this_month",
    start,
    end: monthEnd(start)
  };
}

export function getCustomProjectionRange(startDate: DateLike, endDate: DateLike): ProjectionPeriodRange {
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);

  return {
    period: "custom",
    start,
    end: end < start ? start : end
  };
}

function resolveProjectionRange({
  period = "this_month",
  projectionRange,
  startDate,
  endDate,
  asOf = new Date()
}: Pick<ProjectionCashFlowInput, "period" | "projectionRange" | "startDate" | "endDate" | "asOf">) {
  if (projectionRange) {
    return projectionRange;
  }

  if (period === "custom" && startDate && endDate) {
    return getCustomProjectionRange(startDate, endDate);
  }

  return getDefaultMonthlyProjectionRange(asOf);
}

export function getBillsWithinProjectionPeriod(
  bills: Bill[],
  projectionRange: ProjectionPeriodRange = getDefaultMonthlyProjectionRange()
): BillOccurrence[] {
  return expandRecurringBillsWithinPeriod(bills, projectionRange.start, projectionRange.end).filter(
    (bill) => bill.status === "unpaid"
  );
}

export function getIncomeWithinProjectionPeriod(
  incomeEntries: DailyIncomeEntry[] = [],
  projectionRange: ProjectionPeriodRange = getDefaultMonthlyProjectionRange()
): ManualIncomeOccurrence[] {
  return incomeEntries
    .filter((entry) => isBetweenInclusive(startOfDay(entry.date), projectionRange.start, projectionRange.end))
    .map((entry) => ({
      source: getIncomeEntryType(entry),
      entryId: entry.id,
      amount: normalizeAmount(entry.gross_earnings),
      date: entry.date
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getProjectedIncomeWithinProjectionPeriod(
  paySchedules: PaySchedule[] = [],
  projectionRange: ProjectionPeriodRange = getDefaultMonthlyProjectionRange()
): ProjectedIncomeOccurrence[] {
  return generateProjectedIncomeFromPaySchedules(paySchedules, projectionRange.start, projectionRange.end);
}

export function calculateProjectedCashForPeriod({
  currentBalance,
  paySchedules,
  incomeEntries = [],
  period = "this_month",
  projectionRange,
  startDate,
  endDate,
  asOf = new Date()
}: ProjectionCashFlowInput) {
  const range = resolveProjectionRange({ period, projectionRange, startDate, endDate, asOf });
  const income = calculateExpectedIncomeWithoutDoubleCounting(
    paySchedules,
    incomeEntries,
    range.start,
    range.end
  );
  const projectedIncome = income.reduce((sum, item) => sum + normalizeAmount(item.amount), 0);

  return normalizeAmount(currentBalance) + projectedIncome;
}

export function calculateRequiredBillsForPeriod(
  bills: Bill[],
  projectionRange: ProjectionPeriodRange = getDefaultMonthlyProjectionRange()
) {
  return getBillsWithinProjectionPeriod(bills, projectionRange).reduce(
    (sum, bill) => sum + normalizeAmount(bill.amount),
    0
  );
}

export function calculateProjectedBalanceAfterBills(projectedCash: number, requiredBills: number) {
  return normalizeAmount(projectedCash) - normalizeAmount(requiredBills);
}

export function calculateSafeToSpendForPeriod(projectedBalanceAfterBills: number, emergencyBuffer = 0) {
  return Math.max(0, normalizeAmount(projectedBalanceAfterBills) - normalizeAmount(emergencyBuffer));
}

export function calculateShortfallForPeriod(projectedCash: number, requiredBills: number) {
  return Math.max(0, normalizeAmount(requiredBills) - normalizeAmount(projectedCash));
}

export function calculateNeedToEarnForPeriod({
  currentBalance,
  bills,
  paySchedules,
  incomeEntries = [],
  period = "this_month",
  projectionRange,
  startDate,
  endDate,
  asOf = new Date()
}: ProjectionCashFlowInput) {
  const range = resolveProjectionRange({ period, projectionRange, startDate, endDate, asOf });
  const projectedCash = calculateProjectedCashForPeriod({
    currentBalance,
    bills,
    paySchedules,
    incomeEntries,
    projectionRange: range,
    asOf
  });
  const requiredBills = calculateRequiredBillsForPeriod(bills, range);
  const shortfall = calculateShortfallForPeriod(projectedCash, requiredBills);

  if (shortfall <= 0) {
    return 0;
  }

  const urgentBill = getBillsWithinProjectionPeriod(bills, range)[0];
  return shortfall / Math.max(1, urgentBill?.daysRemaining || 1);
}

export function calculateRiskLevelForPeriod(projectedBalanceAfterBills: number): RiskLevel {
  return calculateRiskLevel(projectedBalanceAfterBills);
}

export function calculateCashFlowProjectionForPeriod({
  currentBalance,
  bills,
  paySchedules,
  incomeEntries = [],
  period = "this_month",
  projectionRange,
  startDate,
  endDate,
  asOf = new Date(),
  emergencyBuffer = 0
}: ProjectionCashFlowInput): ProjectionCashFlow {
  const range = resolveProjectionRange({ period, projectionRange, startDate, endDate, asOf });
  const periodBills = getBillsWithinProjectionPeriod(bills, range);

  /*
   * The selected projection period is the source of truth for Safe to Spend calculations.
   * Next-month bills are ignored only when the selected projection period does not include them.
   */
  const income = calculateExpectedIncomeWithoutDoubleCounting(
    paySchedules,
    incomeEntries,
    range.start,
    range.end
  );
  const projectedIncome = income.reduce((sum, item) => sum + normalizeAmount(item.amount), 0);
  const projectedCash = normalizeAmount(currentBalance) + projectedIncome;
  const requiredBills = periodBills.reduce((sum, bill) => sum + normalizeAmount(bill.amount), 0);
  // The dashboard renders this exact periodBills list, so this sum must match the visible breakdown.
  const projectedBalanceAfterBills = calculateProjectedBalanceAfterBills(projectedCash, requiredBills);
  const shortfall = calculateShortfallForPeriod(projectedCash, requiredBills);

  return {
    period: range.period,
    startDate: toIsoDate(range.start),
    endDate: toIsoDate(range.end),
    income,
    bills: periodBills,
    projectedIncome,
    projectedCash,
    requiredBills,
    projectedBalanceAfterBills,
    safeToSpendToday: calculateSafeToSpendForPeriod(projectedBalanceAfterBills, emergencyBuffer),
    shortfall,
    needToEarnToday: calculateNeedToEarnForPeriod({
      currentBalance,
      bills,
      paySchedules,
      incomeEntries,
      projectionRange: range,
      asOf
    }),
    riskLevel: calculateRiskLevelForPeriod(projectedBalanceAfterBills)
  };
}

export function calculateSafeToSpendToday({
  currentBalance,
  bills,
  paySchedules,
  incomeEntries = [],
  horizonDays = 45,
  asOf = new Date()
}: SafeToSpendInput) {
  const start = startOfDay(asOf);
  const todayIso = toIsoDate(start);
  const end = addDays(start, horizonDays);
  const futureIncome = calculateExpectedIncomeWithoutDoubleCounting(
    paySchedules,
    incomeEntries,
    addDays(start, 1),
    end
  );
  const nextIncomeDate = futureIncome[0]?.date;
  const reserveThrough = nextIncomeDate ? startOfDay(nextIncomeDate) : end;
  const requiredReserve = calculateUpcomingBills(bills, start, horizonDays)
    .filter((bill) => (nextIncomeDate ? bill.occurrenceDate < nextIncomeDate : bill.occurrenceDate >= todayIso))
    .filter((bill) => startOfDay(bill.occurrenceDate) <= reserveThrough)
    .reduce((sum, bill) => sum + normalizeAmount(bill.amount), 0);

  return Math.max(0, normalizeAmount(currentBalance) - requiredReserve);
}

export function calculateDailyEarningTarget({
  currentBalance,
  bills,
  paySchedules,
  incomeEntries = [],
  asOf = new Date()
}: DailyTargetInput) {
  const start = startOfDay(asOf);
  const nextBill = calculateUpcomingBills(bills, start, 60)[0];

  if (!nextBill) {
    return 0;
  }

  const expectedBeforeBill = calculateExpectedIncomeWithoutDoubleCounting(
    paySchedules,
    incomeEntries,
    addDays(start, 1),
    nextBill.occurrenceDate
  ).reduce((sum, income) => sum + income.amount, 0);
  const gap = normalizeAmount(nextBill.amount) - normalizeAmount(currentBalance) - expectedBeforeBill;
  const dailyTarget = gap / Math.max(1, nextBill.daysRemaining || 1);

  return Math.max(0, dailyTarget);
}

export function calculateRiskLevel(projectedBalanceAfterBills: number): RiskLevel {
  if (projectedBalanceAfterBills < 0) {
    return "high";
  }

  if (projectedBalanceAfterBills <= 100) {
    return "medium";
  }

  return "low";
}

export function calculateGasCost(milesDriven: number, mpg: number, gasPrice: number) {
  if (milesDriven <= 0 || mpg <= 0 || gasPrice <= 0) {
    return 0;
  }

  return (milesDriven / mpg) * gasPrice;
}

export function calculateNetProfit(grossEarnings: number, gasCost: number) {
  return normalizeAmount(grossEarnings) - normalizeAmount(gasCost);
}

export function calculateEarningsPerMile(earnings: number, milesDriven: number) {
  if (milesDriven <= 0) {
    return 0;
  }

  return normalizeAmount(earnings) / milesDriven;
}

export function calculateEarningsPerHour(earnings: number, hoursWorked: number) {
  if (hoursWorked <= 0) {
    return 0;
  }

  return normalizeAmount(earnings) / hoursWorked;
}

function parseTimeToMinutes(time?: string | Date | null) {
  if (!time) {
    return null;
  }

  const [hours, minutes] =
    time instanceof Date ? [time.getHours(), time.getMinutes()] : time.split(":").map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateWorkedHours(startTime?: string | Date | null, endTime?: string | Date | null) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return 0;
  }

  let diff = endMinutes - startMinutes;
  if (diff < 0) {
    diff += 24 * 60;
  }

  if (diff < 0) {
    return 0;
  }

  return Number((diff / 60).toFixed(2));
}

export function calculateGallonsBought(gasSpent: number, gasPricePerGallon: number) {
  const spent = normalizeAmount(gasSpent);
  const price = normalizeAmount(gasPricePerGallon);

  if (spent <= 0 || price <= 0) {
    return 0;
  }

  return spent / price;
}

export function calculateDriverLogNetProfit(grossEarnings: number, gasSpent: number, extraExpenses: number) {
  return normalizeAmount(grossEarnings) - normalizeAmount(gasSpent) - normalizeAmount(extraExpenses);
}

export function calculateDriverLogMetrics(log: Pick<
  DriverLog,
  "start_time" | "end_time" | "miles_driven" | "gross_earnings" | "gas_spent" | "gas_price_per_gallon" | "extra_expenses"
>): DriverLogMetrics {
  const hoursWorked = calculateWorkedHours(log.start_time, log.end_time);
  const miles = normalizeAmount(log.miles_driven);
  const gross = normalizeAmount(log.gross_earnings);
  const gallonsBought = calculateGallonsBought(log.gas_spent, log.gas_price_per_gallon);
  const netProfit = calculateDriverLogNetProfit(gross, log.gas_spent, log.extra_expenses);

  return {
    hoursWorked,
    earningsPerHour: calculateEarningsPerHour(gross, hoursWorked),
    earningsPerMile: calculateEarningsPerMile(gross, miles),
    gallonsBought,
    netProfit,
    netProfitPerHour: calculateEarningsPerHour(netProfit, hoursWorked),
    netProfitPerMile: calculateEarningsPerMile(netProfit, miles)
  };
}

function settlementDayToJsIndex(settlementDay: WeeklySettlementDay | string | null | undefined) {
  const lookup: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6
  };

  return lookup[String(settlementDay ?? "friday").toLowerCase()] ?? lookup.friday;
}

export function getWeekRangeBySettlementDay(
  date: DateLike = new Date(),
  settlementDay: WeeklySettlementDay | string = "friday"
): DriverWeekRange {
  const current = startOfDay(date);
  const settlementIndex = settlementDayToJsIndex(settlementDay);
  const daysUntilSettlement = (settlementIndex - current.getDay() + 7) % 7;
  const end = addDays(current, daysUntilSettlement);
  const start = addDays(end, -6);

  return {
    start,
    end,
    startDate: toIsoDate(start),
    endDate: toIsoDate(end)
  };
}

export function getCurrentDriverWeekRange(settlementDay: WeeklySettlementDay | string = "friday") {
  return getWeekRangeBySettlementDay(new Date(), settlementDay);
}

export function calculateWeeklyDriverSummaryForRange(logs: DriverLog[], range: DriverWeekRange): WeeklyDriverSummary {
  const weekLogs = logs.filter((log) =>
    isBetweenInclusive(startOfDay(log.date), range.start, range.end)
  );
  const metrics = weekLogs.map((log) => ({
    log,
    metrics: calculateDriverLogMetrics(log)
  }));
  const totalGrossEarnings = weekLogs.reduce((sum, log) => sum + normalizeAmount(log.gross_earnings), 0);
  const totalMiles = weekLogs.reduce((sum, log) => sum + normalizeAmount(log.miles_driven), 0);
  const totalHoursWorked = metrics.reduce((sum, item) => sum + item.metrics.hoursWorked, 0);
  const totalGasSpent = weekLogs.reduce((sum, log) => sum + normalizeAmount(log.gas_spent), 0);
  const totalGallonsBought = metrics.reduce((sum, item) => sum + item.metrics.gallonsBought, 0);
  const totalExtraExpenses = weekLogs.reduce((sum, log) => sum + normalizeAmount(log.extra_expenses), 0);
  const netProfit = calculateDriverLogNetProfit(totalGrossEarnings, totalGasSpent, totalExtraExpenses);

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    totalGrossEarnings,
    totalMiles,
    totalHoursWorked,
    totalGasSpent,
    averageGasPricePaid: totalGallonsBought > 0 ? totalGasSpent / totalGallonsBought : 0,
    totalGallonsBought,
    totalExtraExpenses,
    netProfit,
    grossPerHour: calculateEarningsPerHour(totalGrossEarnings, totalHoursWorked),
    netPerHour: calculateEarningsPerHour(netProfit, totalHoursWorked),
    grossPerMile: calculateEarningsPerMile(totalGrossEarnings, totalMiles),
    netPerMile: calculateEarningsPerMile(netProfit, totalMiles),
    workDaysLogged: weekLogs.length
  };
}

export function calculateWeeklyDriverSummary(
  logs: DriverLog[],
  settlementDay: WeeklySettlementDay | string = "friday",
  date: DateLike = new Date()
) {
  return calculateWeeklyDriverSummaryForRange(logs, getWeekRangeBySettlementDay(date, settlementDay));
}

export function calculateMonthlySummary(
  entries: DailyIncomeEntry[],
  bills: Bill[],
  paySchedules: PaySchedule[] = [],
  currentBalance = 0,
  asOf: DateLike = new Date()
): MonthlySummary {
  const today = startOfDay(asOf);
  const start = monthStart(today);
  const end = monthEnd(today);
  const tomorrow = addDays(today, 1);
  const monthEntriesToDate = entries.filter((entry) => {
    const date = startOfDay(entry.date);
    return isBetweenInclusive(date, start, today);
  });
  const monthBillOccurrences = expandRecurringBillsWithinPeriod(bills, start, end);
  const totalIncome = monthEntriesToDate.reduce((sum, entry) => sum + normalizeAmount(entry.gross_earnings), 0);
  const totalGasCost = monthEntriesToDate.reduce(
    (sum, entry) => sum + (normalizeAmount(entry.gas_spent) || normalizeAmount(entry.estimated_gas_cost)),
    0
  );
  const expectedIncome =
    tomorrow <= end
      ? calculateExpectedIncomeWithoutDoubleCounting(paySchedules, entries, tomorrow, end).reduce(
          (sum, income) => sum + income.amount,
          0
        )
      : 0;
  const totalBillsPaid = monthBillOccurrences
    .filter((bill) => bill.status === "paid")
    .reduce((sum, bill) => sum + normalizeAmount(bill.amount), 0);
  const totalUnpaidBills = monthBillOccurrences
    .filter((bill) => bill.status === "unpaid")
    .reduce((sum, bill) => sum + normalizeAmount(bill.amount), 0);

  return {
    totalIncome,
    totalBillsPaid,
    totalUnpaidBills,
    estimatedRemainingBalance:
      normalizeAmount(currentBalance) + totalIncome + expectedIncome - totalUnpaidBills - totalGasCost,
    expectedIncome,
    totalMiles: monthEntriesToDate.reduce((sum, entry) => sum + normalizeAmount(entry.miles_driven), 0),
    totalGasCost,
    netProfit: totalIncome - totalGasCost
  };
}
