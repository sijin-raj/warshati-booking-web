"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  defaultLocale,
  isLocale,
  localeMeta,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./config";
import en, { type Messages } from "./messages/en";
import ar from "./messages/ar";

const catalogs: Record<Locale, Messages> = { en, ar };

type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`;
    }[keyof T & string]
  : never;

export type MessageKey = NestedKeyOf<Messages>;

type I18nContextValue = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: Messages, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

function applyVars(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}

function readStoredLocale(fallback: Locale): Locale {
  if (typeof window === "undefined") return fallback;
  try {
    const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  if (isLocale(match)) return match;
  return fallback;
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
}

function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = localeMeta[locale].dir;
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const stored = readStoredLocale(initialLocale);
    if (stored !== initialLocale) {
      // Prefer persisted client preference when it differs from the cookie snapshot.
      startTransition(() => setLocaleState(stored));
    }
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    applyDocumentLocale(next);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      const value =
        getByPath(catalogs[locale], key) ??
        getByPath(catalogs.en, key) ??
        key;
      return applyVars(value, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: localeMeta[locale].dir,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
