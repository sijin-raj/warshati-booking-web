"use client";

import { useI18n } from "@/i18n/provider";

export default function HomeMessage() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-extrabold">{t("home.title")}</h1>
        <p className="mt-2 text-slate-500">{t("home.text")}</p>
      </div>
    </main>
  );
}
