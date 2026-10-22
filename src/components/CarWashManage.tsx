"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, Droplets, X } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import LanguageSwitcher from "./LanguageSwitcher";

interface Booking {
  jobNumber: string; status: string; plateNumber: string | null; service: string; scheduledAt: string | null; durationMin: number;
  garageName: string; daysAhead: number; cancelWindowMin: number; canChange: boolean; reason: "status" | "too_late" | null;
}
interface Slot { time: string; iso: string; available: boolean; current: boolean }

const to12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const riyadhDate = (offsetDays: number) => new Date(Date.now() + 3 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);

const TEXT = {
  en: {
    title: "Your car wash booking", loading: "Loading…", notFound: "We couldn't find this booking.", ref: "Booking no.", when: "Time", plate: "Plate",
    cancelled: "This booking was cancelled.", done: "This booking is completed.", inProgress: "Your car is already with us — this booking can't be changed online.",
    tooLate: (m: number) => `Changes are possible up to ${m} minutes before your time. Please call us.`,
    change: "Change time", cancel: "Cancel booking", confirmCancel: "Yes, cancel it", keep: "Keep booking", sure: "Cancel this booking?",
    pick: "Pick a new day & time", today: "Today", tomorrow: "Tomorrow", noSlots: "No free times on this day.", save: "Confirm new time", saving: "Saving…",
    savedTitle: "Booking updated", cancelledTitle: "Booking cancelled", back: "Back", failed: "Something went wrong. Please try again.",
  },
  ar: {
    title: "حجز غسيل سيارتك", loading: "جارٍ التحميل…", notFound: "لم نتمكن من العثور على هذا الحجز.", ref: "رقم الحجز", when: "الموعد", plate: "اللوحة",
    cancelled: "تم إلغاء هذا الحجز.", done: "هذا الحجز مكتمل.", inProgress: "سيارتك لدينا بالفعل — لا يمكن تعديل هذا الحجز عبر الإنترنت.",
    tooLate: (m: number) => `يمكن التعديل حتى ${m} دقيقة قبل الموعد. يرجى الاتصال بنا.`,
    change: "تغيير الموعد", cancel: "إلغاء الحجز", confirmCancel: "نعم، إلغاء", keep: "إبقاء الحجز", sure: "هل تريد إلغاء هذا الحجز؟",
    pick: "اختر يومًا ووقتًا جديدًا", today: "اليوم", tomorrow: "غدًا", noSlots: "لا توجد أوقات متاحة في هذا اليوم.", save: "تأكيد الموعد الجديد", saving: "جارٍ الحفظ…",
    savedTitle: "تم تحديث الحجز", cancelledTitle: "تم إلغاء الحجز", back: "رجوع", failed: "حدث خطأ. حاول مرة أخرى.",
  },
} as const;

export default function CarWashManage({ token }: { token: string }) {
  const { locale, dir } = useI18n();
  const tx = TEXT[locale === "ar" ? "ar" : "en"];
  const [b, setB] = useState<Booking | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [mode, setMode] = useState<"view" | "change" | "cancel">("view");
  const [date, setDate] = useState(riyadhDate(0));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<"updated" | "cancelled" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/car-wash/p/manage/${token}`);
      if (!res.ok) { setState("missing"); return; }
      setB(await res.json()); setState("ready");
    } catch { setState("missing"); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode !== "change") return;
    let live = true;
    setSlots(null); setSlot("");
    fetch(`/api/car-wash/p/manage/${token}/slots?date=${date}`).then((r) => r.json()).then((j) => { if (live) setSlots(j.slots ?? []); }).catch(() => { if (live) setSlots([]); });
    return () => { live = false; };
  }, [mode, date, token]);

  const when = (iso: string) => new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { timeZone: "Asia/Riyadh", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  const dayLabel = (d: string, i: number) => (i === 0 ? tx.today : i === 1 ? tx.tomorrow : new Date(`${d}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }));

  async function act(path: "cancel" | "reschedule") {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/car-wash/p/manage/${token}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(path === "reschedule" ? { slot } : {}) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setResult(path === "cancel" ? "cancelled" : "updated"); await load(); setMode("view"); }
      else setError(String(j?.error ?? tx.failed));
    } catch { setError(tx.failed); }
    setBusy(false);
  }

  const shell = (children: React.ReactNode) => (
    <div dir={dir} className="mx-auto max-w-md px-4 pb-10 pt-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold"><Droplets className="h-6 w-6 text-[#e8201c]" />{tx.title}</h1>
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );

  if (state === "loading") return shell(<p className="text-[14px] text-[#71717a]">{tx.loading}</p>);
  if (state === "missing" || !b) return shell(<p className="rounded-2xl bg-[#f4f4f5] p-5 text-[15px]">{tx.notFound}</p>);

  const dates = Array.from({ length: b.daysAhead + 1 }, (_, i) => riyadhDate(i));
  const note = b.status === "cancelled" ? tx.cancelled : b.status === "booked" ? null : ["delivered", "no_show"].includes(b.status) ? tx.done : tx.inProgress;

  return shell(
    <>
      {result && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-[14px] font-bold text-emerald-700"><Check className="h-5 w-5" />{result === "updated" ? tx.savedTitle : tx.cancelledTitle}</div>
      )}
      <div className="space-y-2 rounded-2xl bg-[#f4f4f5] p-4 text-[15px]">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[#71717a]">{b.garageName}</p>
        <p className="text-[17px] font-extrabold capitalize">{b.service}</p>
        {b.scheduledAt && <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#e8201c]" /><b>{when(b.scheduledAt)}</b></p>}
        <p className="text-[#52525b]">{tx.plate}: <b>{b.plateNumber}</b> · {tx.ref}: <b>{b.jobNumber}</b></p>
      </div>

      {note && <p className="mt-4 rounded-2xl bg-[#f4f4f5] p-4 text-[14px] text-[#52525b]">{note}</p>}
      {!note && !b.canChange && <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-[14px] text-amber-800">{tx.tooLate(b.cancelWindowMin)}</p>}

      {b.canChange && mode === "view" && (
        <div className="mt-4 grid gap-2.5">
          <button type="button" onClick={() => { setMode("change"); setResult(null); setError(""); }} className="cta h-12 rounded-full font-bold text-white">{tx.change}</button>
          <button type="button" onClick={() => { setMode("cancel"); setResult(null); setError(""); }} className="h-12 rounded-full bg-[#f4f4f5] font-bold text-[#e8201c]">{tx.cancel}</button>
        </div>
      )}

      {b.canChange && mode === "cancel" && (
        <div className="mt-4 rounded-2xl bg-[#f4f4f5] p-4">
          <p className="mb-3 text-[15px] font-bold">{tx.sure}</p>
          <div className="grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => setMode("view")} className="h-12 rounded-full bg-white font-bold">{tx.keep}</button>
            <button type="button" disabled={busy} onClick={() => act("cancel")} className="cta h-12 rounded-full font-bold text-white disabled:opacity-60"><X className="me-1 inline h-4 w-4" />{tx.confirmCancel}</button>
          </div>
          {error && <p role="alert" className="mt-3 text-[14px] text-[#e8201c]">{error}</p>}
        </div>
      )}

      {b.canChange && mode === "change" && (
        <div className="mt-4">
          <h2 className="mb-2.5 text-[15px] font-bold">{tx.pick}</h2>
          <div className="rounded-2xl bg-[#f4f4f5] p-3.5">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {dates.map((d, i) => (
                <button key={d} type="button" onClick={() => setDate(d)} className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold transition ${d === date ? "cta text-white" : "bg-white text-[#3f3f46]"}`}>{dayLabel(d, i)}</button>
              ))}
            </div>
            <div className="mt-3">
              {slots === null ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white" />)}</div>
                : slots.some((s) => s.available) ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.map((s) => (
                      <button key={s.iso} type="button" disabled={!s.available || s.current} onClick={() => setSlot(s.iso)}
                        className={`h-10 rounded-xl text-[13px] font-bold transition disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[#c4c4cc] ${s.current ? "!bg-white !text-[#e8201c] ring-1 ring-[#e8201c]/40" : ""} ${!s.available && !s.current ? "line-through" : ""} ${slot === s.iso ? "cta text-white" : "bg-white text-[#3f3f46]"}`}>{to12(s.time)}</button>
                    ))}
                  </div>
                ) : <p className="text-[14px] text-[#71717a]">{tx.noSlots}</p>}
            </div>
          </div>
          {error && <p role="alert" className="mt-3 text-[14px] text-[#e8201c]">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setMode("view")} className="h-12 rounded-full bg-[#f4f4f5] px-5 font-bold">{tx.back}</button>
            <button type="button" disabled={!slot || busy} onClick={() => act("reschedule")} className="cta h-12 flex-1 rounded-full font-bold text-white disabled:opacity-50">{busy ? tx.saving : tx.save}</button>
          </div>
        </div>
      )}
    </>,
  );
}
