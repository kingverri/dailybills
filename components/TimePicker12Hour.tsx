"use client";

import clsx from "clsx";
import { Clock3, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  convert12HourTo24Hour,
  formatTime12Hour,
  parseTimeTo12HourParts,
  type Time12HourPeriod
} from "@/lib/format";
import { t } from "@/lib/i18n";

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const periodOptions: Time12HourPeriod[] = ["AM", "PM"];
const presets = [
  { hour: "8", minute: "00", period: "AM" as const },
  { hour: "9", minute: "00", period: "AM" as const },
  { hour: "12", minute: "00", period: "PM" as const },
  { hour: "5", minute: "00", period: "PM" as const },
  { hour: "6", minute: "00", period: "PM" as const },
  { hour: "8", minute: "00", period: "PM" as const }
];

type TimePicker12HourProps = {
  label: string;
  value: string;
  language?: string;
  onChange: (value: string) => void;
};

export function TimePicker12Hour({ label, value, language = "en", onChange }: TimePicker12HourProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState("8");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<Time12HourPeriod>("AM");

  useEffect(() => {
    const parts = parseTimeTo12HourParts(value);
    if (parts) {
      setHour(parts.hour);
      setMinute(parts.minute);
      setPeriod(parts.period);
    }
  }, [value]);

  function openPicker() {
    const parts = parseTimeTo12HourParts(value);
    if (parts) {
      setHour(parts.hour);
      setMinute(parts.minute);
      setPeriod(parts.period);
    }
    setOpen(true);
  }

  function confirmTime() {
    onChange(convert12HourTo24Hour(hour, minute, period));
    setOpen(false);
  }

  function setPreset(nextHour: string, nextMinute: string, nextPeriod: Time12HourPeriod) {
    setHour(nextHour);
    setMinute(nextMinute);
    setPeriod(nextPeriod);
  }

  return (
    <div className="space-y-2">
      <label className="field-label">{label}</label>
      <button
        className="field flex min-h-12 items-center justify-between gap-3 text-left"
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
      >
        <span className={value ? "font-bold text-ink" : "font-medium text-neutral-500"}>
          {value ? formatTime12Hour(value) : t(language, "selectTime")}
        </span>
        <Clock3 className="shrink-0 text-brand-700" size={19} aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/70 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full rounded-t-[2rem] border border-line bg-surface p-4 shadow-2xl sm:max-w-md sm:rounded-[2rem] sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-700">{label}</p>
                <h2 className="mt-1 text-2xl font-black text-ink">{t(language, "selectTime")}</h2>
              </div>
              <button className="btn-secondary min-h-10 px-3" type="button" onClick={() => setOpen(false)}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              <TimeColumn label={t(language, "hourLabel")} options={hourOptions} selected={hour} onSelect={setHour} />
              <TimeColumn label={t(language, "minuteLabel")} options={minuteOptions} selected={minute} onSelect={setMinute} />
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-neutral-500">AM/PM</p>
                <div className="grid gap-2">
                  {periodOptions.map((option) => (
                    <button
                      key={option}
                      className={clsx(
                        "min-h-14 rounded-2xl border px-3 text-base font-black transition",
                        period === option
                          ? "border-brand-300 bg-brand-50 text-brand-700 shadow-glow"
                          : "border-line bg-neutral-50 text-ink hover:border-brand-200"
                      )}
                      type="button"
                      onClick={() => setPeriod(option)}
                    >
                      {t(language, option.toLowerCase() as "am" | "pm")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {presets.map((preset) => {
                const presetValue = convert12HourTo24Hour(preset.hour, preset.minute, preset.period);
                return (
                  <button
                    key={`${preset.hour}-${preset.minute}-${preset.period}`}
                    className="btn-secondary min-h-10 px-3"
                    type="button"
                    onClick={() => setPreset(preset.hour, preset.minute, preset.period)}
                  >
                    {formatTime12Hour(presetValue)}
                  </button>
                );
              })}
            </div>

            <div className="rounded-[1.25rem] border border-line bg-neutral-50 p-4 text-center">
              <p className="text-xs font-black uppercase tracking-wide text-neutral-500">{t(language, "selectTime")}</p>
              <p className="mt-1 text-3xl font-black text-ink">{formatTime12Hour(convert12HourTo24Hour(hour, minute, period))}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>
                {t(language, "cancel")}
              </button>
              <button className="btn-primary" type="button" onClick={confirmTime}>
                {t(language, "confirmTime")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeColumn({
  label,
  options,
  selected,
  onSelect
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {options.map((option) => (
          <button
            key={option}
            className={clsx(
              "min-h-12 w-full rounded-2xl border px-3 text-base font-black transition",
              selected === option
                ? "border-brand-300 bg-brand-50 text-brand-700 shadow-glow"
                : "border-line bg-neutral-50 text-ink hover:border-brand-200"
            )}
            type="button"
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
