"use client";

import { Languages } from "lucide-react";
import { locales, localeMeta, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();

  function toggle() {
    const idx = locales.indexOf(locale);
    const next = locales[(idx + 1) % locales.length] as Locale;
    setLocale(next);
  }

  const nextLocale = locales[(locales.indexOf(locale) + 1) % locales.length] as Locale;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("common.switchLanguage")}
      title={`${t("common.switchLanguage")}: ${localeMeta[nextLocale].label}`}
      className={`flex h-12 items-center gap-2 rounded-full bg-white px-3.5 text-[#111827] shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-transform active:scale-[0.97] ${className}`}
    >
      <Languages className="h-4 w-4 text-[#e53935]" />
      <span className="text-[13px] font-bold tracking-wide">
        {localeMeta[locale].nativeLabel}
      </span>
    </button>
  );
}
