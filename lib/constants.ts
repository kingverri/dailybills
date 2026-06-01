export const incomeTypes = [
  "Fixed paycheck",
  "Variable income",
  "Gig work / driver",
  "Mixed income"
] as const;

export const workTypes = [
  "Uber",
  "Lyft",
  "DoorDash",
  "Uber Eats",
  "Amazon Flex",
  "Spark",
  "Instacart",
  "OnTrac",
  "Other"
] as const;

export const platforms = workTypes;

export const incomeEntryTypes = [
  { value: "actual", label: "Actual income already received" },
  { value: "confirmed", label: "Confirmed upcoming payment" },
  { value: "extra_gig", label: "Extra gig income" }
] as const;

export const paymentScheduleTypes = [
  "weekly",
  "biweekly",
  "twice_per_month",
  "monthly",
  "custom"
] as const;

export const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
] as const;

export const weeklySettlementDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

export const billRecurrences = ["monthly", "weekly", "biweekly", "one-time", "custom"] as const;

export const billCategories = [
  "Rent",
  "Car payment",
  "Car insurance",
  "Phone",
  "Credit card",
  "Loan",
  "Gas",
  "Food",
  "Utilities",
  "Other"
] as const;

export const billStatuses = ["unpaid", "paid"] as const;

export const fuelTypes = ["Regular", "Midgrade", "Premium", "Diesel"] as const;

export const currencies = ["USD", "CAD", "MXN", "EUR", "GBP"] as const;

export const defaultDailyBuffer = 25;
