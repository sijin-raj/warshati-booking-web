import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/i18n/config";

export function getLocaleFromCookieHeader(cookieHeader: string | null): Locale {
  if (!cookieHeader) return defaultLocale;
  const match = cookieHeader
    .split("; ")
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return isLocale(match) ? match : defaultLocale;
}
