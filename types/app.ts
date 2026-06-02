import type {
  billCategories,
  billRecurrences,
  billStatuses,
  daysOfWeek,
  fuelTypes,
  incomeEntryTypes,
  incomeTypes,
  paymentScheduleTypes,
  platforms,
  weeklySettlementDays,
  workLogTypes,
  workTypes
} from "@/lib/constants";

export type IncomeType = (typeof incomeTypes)[number];
export type WorkType = (typeof workTypes)[number];
export type Platform = (typeof platforms)[number];
export type PaymentScheduleType = (typeof paymentScheduleTypes)[number];
export type DayOfWeek = (typeof daysOfWeek)[number];
export type BillRecurrence = (typeof billRecurrences)[number];
export type BillCategory = (typeof billCategories)[number];
export type BillStatus = (typeof billStatuses)[number];
export type BillRepeatUntilType = "never" | "specific_month";
export type FuelType = (typeof fuelTypes)[number];
export type IncomeEntryType = (typeof incomeEntryTypes)[number]["value"];
export type WeeklySettlementDay = (typeof weeklySettlementDays)[number];
export type WorkLogType = (typeof workLogTypes)[number];
export type Language = "en" | "pt" | "es";
export type AppTheme = "dark" | "soft_light" | "light";
export type UserPlan = "free" | "pro_monthly" | "pro_yearly";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  currency: string;
  country: string;
  state: string | null;
  city: string | null;
  current_balance: number;
  income_type: IncomeType | null;
  work_type: WorkType | null;
  language: Language;
  theme: AppTheme;
  plan: UserPlan;
  weekly_settlement_day: WeeklySettlementDay | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type PaySchedule = {
  id: string;
  user_id: string;
  schedule_type: PaymentScheduleType;
  day_of_week: DayOfWeek | null;
  first_day_of_month: number | null;
  second_day_of_month: number | null;
  next_payment_date: string | null;
  estimated_amount: number;
  is_variable: boolean;
  created_at: string;
  updated_at: string;
};

export type Bill = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_date: string;
  recurrence: BillRecurrence;
  repeat_until: string | null;
  repeat_until_type: BillRepeatUntilType;
  category: BillCategory;
  status: BillStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type GasStation = {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  fuel_type: FuelType;
  current_price: number;
  last_updated: string | null;
  created_at: string;
  updated_at: string;
};

export type Vehicle = {
  id: string;
  user_id: string;
  nickname: string;
  make: string;
  model: string;
  year: number;
  mpg: number;
  fuel_type: FuelType;
  monthly_maintenance_estimate: number | null;
  created_at: string;
  updated_at: string;
};

export type DailyIncomeEntry = {
  id: string;
  user_id: string;
  date: string;
  income_entry_type: IncomeEntryType;
  platform: Platform;
  gross_earnings: number;
  miles_driven: number;
  hours_worked: number;
  gas_spent: number;
  estimated_gas_cost: number;
  net_profit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverLog = {
  id: string;
  user_id: string;
  date: string;
  work_type: WorkLogType;
  platform: string;
  start_time: string | null;
  end_time: string | null;
  miles_driven: number;
  gross_earnings: number;
  tips_received: number;
  gas_spent: number;
  gas_price_per_gallon: number;
  extra_expenses: number;
  stops_completed: number;
  extra_expense_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RiskLevel = "low" | "medium" | "high";
