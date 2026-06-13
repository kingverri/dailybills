import type { DailyIncomeEntry, IncomeEntryType } from "@/types/app";

export function getPaymentDisplayType(entry: DailyIncomeEntry, todayValue: string): IncomeEntryType {
  if (entry.income_entry_type === "confirmed" && entry.date <= todayValue) {
    return "actual";
  }

  return entry.income_entry_type ?? "actual";
}

export function isReceivedPayment(entry: DailyIncomeEntry, todayValue: string) {
  const displayType = getPaymentDisplayType(entry, todayValue);
  return displayType === "actual" || displayType === "extra_gig";
}

export function calculatePaymentSummaryForPeriod(
  entries: DailyIncomeEntry[],
  startDate: string,
  endDate: string,
  todayValue: string
) {
  const periodEntries = entries.filter((entry) => entry.date >= startDate && entry.date <= endDate);
  const futureEntries = periodEntries.filter((entry) => getPaymentDisplayType(entry, todayValue) === "confirmed");
  const nextPayment = [...futureEntries].sort((first, second) => first.date.localeCompare(second.date))[0];

  return {
    received: periodEntries
      .filter((entry) => isReceivedPayment(entry, todayValue))
      .reduce((sum, entry) => sum + Number(entry.gross_earnings ?? 0), 0),
    pending: futureEntries.reduce((sum, entry) => sum + Number(entry.gross_earnings ?? 0), 0),
    confirmedEarnings: periodEntries.reduce((sum, entry) => sum + Number(entry.gross_earnings ?? 0), 0),
    extras: periodEntries
      .filter((entry) => entry.income_entry_type === "extra_gig")
      .reduce((sum, entry) => sum + Number(entry.gross_earnings ?? 0), 0),
    nextPayment,
    count: periodEntries.length
  };
}
