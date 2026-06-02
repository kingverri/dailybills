"use client";

import { useEffect, useState } from "react";
import {
  convert12HourTo24Hour,
  parseTimeTo12HourParts,
  type Time12HourPeriod
} from "@/lib/format";

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const periodOptions: Time12HourPeriod[] = ["AM", "PM"];

type TimePicker12HourProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function TimePicker12Hour({ label, value, onChange }: TimePicker12HourProps) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [period, setPeriod] = useState<Time12HourPeriod | "">("");

  useEffect(() => {
    const parts = parseTimeTo12HourParts(value);
    setHour(parts?.hour ?? "");
    setMinute(parts?.minute ?? "");
    setPeriod(parts?.period ?? "");
  }, [value]);

  function updateTime(nextHour: string, nextMinute: string, nextPeriod: Time12HourPeriod | "") {
    setHour(nextHour);
    setMinute(nextMinute);
    setPeriod(nextPeriod);

    if (nextHour && nextMinute && nextPeriod) {
      onChange(convert12HourTo24Hour(nextHour, nextMinute, nextPeriod));
    }
  }

  return (
    <fieldset className="space-y-2">
      <legend className="field-label">{label}</legend>
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
        <select className="field" value={hour} onChange={(event) => updateTime(event.target.value, minute, period)}>
          <option value="">--</option>
          {hourOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select className="field" value={minute} onChange={(event) => updateTime(hour, event.target.value, period)}>
          <option value="">--</option>
          {minuteOptions.map((option) => (
            <option key={option} value={option}>
              :{option}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={period}
          onChange={(event) => updateTime(hour, minute, event.target.value as Time12HourPeriod | "")}
        >
          <option value="">--</option>
          {periodOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
