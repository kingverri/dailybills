"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type DraftEnvelope<T> = {
  updatedAt: string;
  data: T;
};

type PersistentDraftOptions<T> = {
  key: string | null | undefined;
  initialValue: T | (() => T);
  enabled?: boolean;
  debounceMs?: number;
  maxAgeMs?: number;
  resetWhenDisabled?: boolean;
};

function resolveInitialValue<T>(initialValue: T | (() => T)) {
  return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
}

function readDraft<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as DraftEnvelope<T>;
    const updatedAt = new Date(parsed.updatedAt).getTime();

    if (!parsed.data || !Number.isFinite(updatedAt) || Date.now() - updatedAt > maxAgeMs) {
      window.localStorage.removeItem(key);
      return null;
    }

    return parsed.data;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // localStorage may be unavailable in restricted browser modes.
    }
    return null;
  }
}

export function usePersistentDraft<T>({
  key,
  initialValue,
  enabled = true,
  debounceMs = 400,
  maxAgeMs = DEFAULT_DRAFT_MAX_AGE_MS,
  resetWhenDisabled = true
}: PersistentDraftOptions<T>) {
  const [value, setValue] = useState<T>(() => resolveInitialValue(initialValue));
  const hydratedRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  useEffect(() => {
    hydratedRef.current = false;

    if (!enabled || !key) {
      if (resetWhenDisabled) {
        setValue(resolveInitialValue(initialValue));
      }
      hydratedRef.current = true;
      return;
    }

    const savedDraft = readDraft<T>(key, maxAgeMs);
    setValue(savedDraft ?? resolveInitialValue(initialValue));
    hydratedRef.current = true;
    // Rehydrate only when the active draft key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, maxAgeMs]);

  useEffect(() => {
    if (!enabled || !key || !hydratedRef.current) {
      return;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          key,
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            data: value
          } satisfies DraftEnvelope<T>)
        );
      } catch {
        // Draft persistence should never block the form itself.
      }
    }, debounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [debounceMs, enabled, key, value]);

  const clearDraft = useCallback(
    (nextValue?: T) => {
      if (key) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // localStorage may be unavailable in restricted browser modes.
        }
      }

      if (typeof nextValue !== "undefined") {
        skipNextSaveRef.current = true;
        setValue(nextValue);
      }
    },
    [key]
  );

  return [value, setValue, clearDraft] as const;
}
