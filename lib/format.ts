export function formatCurrency(amount: number, currency = "USD") {
  const displayCurrency = currency === "USD" ? currency : "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: displayCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(date: string | Date, language: string = "en") {
  const value = typeof date === "string" && !date.includes("T") ? new Date(`${date}T00:00:00`) : new Date(date);

  if (language === "pt") {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(value);
}

export function toDateInputValue(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatDurationFromDecimalHours(decimalHours: number) {
  if (!Number.isFinite(decimalHours) || decimalHours <= 0) {
    return "0h 00min";
  }

  let hours = Math.floor(decimalHours);
  let minutes = Math.round((decimalHours - hours) * 60);

  if (minutes === 60) {
    hours += 1;
    minutes = 0;
  }

  return `${hours}h ${String(minutes).padStart(2, "0")}min`;
}

export type Time12HourPeriod = "AM" | "PM";

export type Time12HourParts = {
  hour: string;
  minute: string;
  period: Time12HourPeriod;
};

export function parseTimeTo12HourParts(time24?: string | Date | null): Time12HourParts | null {
  if (!time24) {
    return null;
  }

  let hours: number;
  let minutes: number;

  if (time24 instanceof Date) {
    hours = time24.getHours();
    minutes = time24.getMinutes();
  } else {
    const [hourValue, minuteValue] = time24.split(":").map(Number);
    hours = hourValue;
    minutes = minuteValue;
  }

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

  return {
    hour: String(hours % 12 || 12),
    minute: String(minutes).padStart(2, "0"),
    period: hours >= 12 ? "PM" : "AM"
  };
}

export function convert12HourTo24Hour(hour: string | number, minute: string | number, period: Time12HourPeriod) {
  const hourValue = Number(hour);
  const minuteValue = Number(minute);

  if (
    !Number.isFinite(hourValue) ||
    !Number.isFinite(minuteValue) ||
    hourValue < 1 ||
    hourValue > 12 ||
    minuteValue < 0 ||
    minuteValue > 59
  ) {
    return "";
  }

  let hours = hourValue % 12;
  if (period === "PM") {
    hours += 12;
  }

  return `${String(hours).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}`;
}

export function formatTime12Hour(time?: string | Date | null) {
  const parts = parseTimeTo12HourParts(time);
  if (!parts) {
    return "-";
  }

  return `${parts.hour}:${parts.minute} ${parts.period}`;
}

export function formatMonthYear(date: string | Date, language = "en") {
  const value = typeof date === "string" && date.length === 7 ? new Date(`${date}-01T00:00:00`) : new Date(date);
  const month = value.getMonth();
  const year = value.getFullYear();

  if (!Number.isFinite(month) || !Number.isFinite(year)) {
    return "";
  }

  if (language === "pt") {
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${months[month]}/${year}`;
  }

  if (language === "es") {
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${months[month]}/${year}`;
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[month]} ${year}`;
}

export function formatHourlyRate(amount: number, currency = "USD", language: string = "en") {
  return `${formatCurrency(amount, currency)}/${language === "en" ? "hr" : "h"}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
