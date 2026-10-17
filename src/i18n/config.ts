export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "lezof-locale";
export const LOCALE_STORAGE_KEY = "lezof-locale";

export const localeMeta: Record<
  Locale,
  { label: string; nativeLabel: string; dir: "ltr" | "rtl" }
> = {
  en: { label: "English", nativeLabel: "EN", dir: "ltr" },
  ar: { label: "Arabic", nativeLabel: "ع", dir: "rtl" },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
