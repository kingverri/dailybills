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

export function formatTime12Hour(time?: string | Date | null) {
  if (!time) {
    return "-";
  }

  let hours: number;
  let minutes: number;

  if (time instanceof Date) {
    hours = time.getHours();
    minutes = time.getMinutes();
  } else {
    const [hourValue, minuteValue] = time.split(":").map(Number);
    hours = hourValue;
    minutes = minuteValue;
  }

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return "-";
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatHourlyRate(amount: number, currency = "USD", language: string = "en") {
  return `${formatCurrency(amount, currency)}/${language === "en" ? "hr" : "h"}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
