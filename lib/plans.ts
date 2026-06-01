import type { TranslationKey } from "@/lib/i18n";

export type PlanId = "free" | "pro_monthly" | "pro_yearly";

export type PlanConfig = {
  id: PlanId;
  nameKey: TranslationKey;
  descriptionKey: TranslationKey;
  price: string;
  interval: "none" | "month" | "year";
  features: TranslationKey[];
  isBestValue?: boolean;
  ctaKey: TranslationKey;
  limits: {
    bills: number | null;
    driverLogsPerMonth: number | null;
    customProjection: boolean;
    weeklySettlement: boolean;
    weeklyHistory: boolean;
  };
};

const proFeatures: TranslationKey[] = [
  "unlimitedBills",
  "unlimitedDriverLogs",
  "customProjectionPeriodFeature",
  "weeklyDriverSettlementFeature",
  "driverTrackingFeature",
  "netProfitPerDay",
  "netProfitPerWeek",
  "netHourAndMile",
  "allLanguages"
];

export const plans: PlanConfig[] = [
  {
    id: "free",
    nameKey: "freePlan",
    descriptionKey: "freePlanDescription",
    price: "$0",
    interval: "none",
    ctaKey: "currentPlan",
    features: [
      "upToFiveBills",
      "upToSevenDriverLogs",
      "basicSafeToSpend",
      "thisMonthProjectionOnly",
      "allLanguages"
    ],
    limits: {
      bills: 5,
      driverLogsPerMonth: 7,
      customProjection: false,
      weeklySettlement: false,
      weeklyHistory: false
    }
  },
  {
    id: "pro_monthly",
    nameKey: "proMonthly",
    descriptionKey: "proMonthlyDescription",
    price: "$7.99",
    interval: "month",
    ctaKey: "upgradeToPro",
    features: proFeatures,
    limits: {
      bills: null,
      driverLogsPerMonth: null,
      customProjection: true,
      weeklySettlement: true,
      weeklyHistory: true
    }
  },
  {
    id: "pro_yearly",
    nameKey: "proYearly",
    descriptionKey: "proYearlyDescription",
    price: "$59",
    interval: "year",
    ctaKey: "getBestValue",
    features: [...proFeatures, "yearlySavings"],
    isBestValue: true,
    limits: {
      bills: null,
      driverLogsPerMonth: null,
      customProjection: true,
      weeklySettlement: true,
      weeklyHistory: true
    }
  }
];
