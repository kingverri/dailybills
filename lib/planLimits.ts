import type { PlanId } from "@/lib/plans";
import { plans } from "@/lib/plans";
import type { Profile } from "@/types/app";

function getPlan(planId: PlanId) {
  return plans.find((plan) => plan.id === planId) ?? plans[0];
}

export function getCurrentPlan(profile?: Pick<Profile, "plan"> | null): PlanId {
  if (profile?.plan === "pro_monthly" || profile?.plan === "pro_yearly") {
    return profile.plan;
  }

  return "free";
}

export function canAddBill(planId: PlanId, currentBillCount: number) {
  const limit = getPlan(planId).limits.bills;
  return limit === null || currentBillCount < limit;
}

export function canAddDriverLog(planId: PlanId, currentMonthlyLogCount: number) {
  const limit = getPlan(planId).limits.driverLogsPerMonth;
  return limit === null || currentMonthlyLogCount < limit;
}

export function canUseCustomProjection(planId: PlanId) {
  return getPlan(planId).limits.customProjection;
}

export function canUseWeeklySettlement(planId: PlanId) {
  return getPlan(planId).limits.weeklySettlement;
}

export function canUseWeeklyHistory(planId: PlanId) {
  return getPlan(planId).limits.weeklyHistory;
}

export function getCurrentMonthDriverLogCount(logs: { date: string }[], asOf = new Date()) {
  const month = asOf.getMonth();
  const year = asOf.getFullYear();

  return logs.filter((log) => {
    const [logYear, logMonth] = log.date.split("-").map(Number);
    return logYear === year && logMonth === month + 1;
  }).length;
}
