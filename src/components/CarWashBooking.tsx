"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Check, Droplets } from "lucide-react";
import type { CarWashInfo } from "@/lib/api";
import { parsePhone } from "@/lib/phone";
import { useI18n } from "@/i18n/provider";
import LanguageSwitcher from "./LanguageSwitcher";

interface Slot { time: string; iso: string; available: boolean }

const to12 = (t: string) => { const [h, m] = t.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
const RIYADH_OFFSET_MS = 3 * 3600_000;
const riyadhDate = (offsetDays: number) => new Date(Date.now() + RIYADH_OFFSET_MS + offsetDays * 86400_000).toISOString().slice(0, 10);

const inputCls =
  "h-12 w-full rounded-xl border border-transparent bg-white px-3.5 text-[15px] outline-none transition focus:border-[#e8201c] focus:ring-4 focus:ring-[#e8201c]/10";
const labelCls = "mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-[#52525b]";

const TEXT = {
  en: {
    title: "Book a car wash", service: "Choose a wash", when: "Pick a day & time", today: "Today", tomorrow: "Tomorrow",
    noSlots: "No free times on this day. Try another day.", slotsFailed: "Couldn't load times. Please try again.",
    details: "Your details", name: "Full name", phone: "Mobile number", phoneInvalid: "Enter a valid mobile number, e.g. 05XXXXXXXX",
    plateNums: "Plate numbers", plateLetters: "Plate letters", make: "Car make", model: "Model", optional: "optional",
    total: "Total incl. 15% VAT", confirm: "Confirm booking", sending: "Booking…", sr: "SAR", failed: "Couldn't complete the booking. Please try again.",
    verifyBtn: "Send code", verifySent: "We sent a 6-digit code to your WhatsApp.", codeLabel: "Verification code", confirmCode: "Verify", verified: "Number verified", wrongPhoneEdit: "Change number", resend: "Resend code", verifyNeeded: "Verify your number to continue", manage: "Change or cancel booking", doneTitle: "You're booked!", doneBody: "Please arrive at your time. Pay at the garage after the wash.", ref: "Booking no.", another: "Make another booking",
  },
  ar: {
    title: "احجز غسيل سيارتك", service: "اختر نوع الغسيل", when: "اختر اليوم والوقت", today: "اليوم", tomorrow: "غدًا",
    noSlots: "لا توجد أوقات متاحة في هذا اليوم. جرّب يومًا آخر.", slotsFailed: "تعذّر تحميل الأوقات. حاول مرة أخرى.",
    details: "بياناتك", name: "الاسم الكامل", phone: "رقم الجوال", phoneInvalid: "أدخل رقم جوال صحيح مثل 05XXXXXXXX",
    plateNums: "أرقام اللوحة", plateLetters: "حروف اللوحة", make: "ماركة السيارة", model: "الموديل", optional: "اختياري",
    total: "الإجمالي شامل ضريبة 15%", confirm: "تأكيد الحجز", sending: "جارٍ الحجز…", sr: "ر.س", failed: "تعذّر إكمال الحجز. حاول مرة أخرى.",
    verifyBtn: "إرسال الرمز", verifySent: "أرسلنا رمزًا من 6 أرقام إلى واتساب.", codeLabel: "رمز التحقق", confirmCode: "تحقق", verified: "تم التحقق من الرقم", wrongPhoneEdit: "تغيير الرقم", resend: "إعادة إرسال الرمز", verifyNeeded: "تحقق من رقمك للمتابعة", manage: "تغيير الموعد أو الإلغاء", doneTitle: "تم الحجز!", doneBody: "يرجى الحضور في الموعد. الدفع في الورشة بعد الغسيل.", ref: "رقم الحجز", another: "حجز جديد",
  },
} as const;

export default function CarWashBooking({ garageId, info }: { garageId: string; info: CarWashInfo }) {
  const { locale, dir } = useI18n();
  const tx = TEXT[locale === "ar" ? "ar" : "en"];
  const [serviceId, setServiceId] = useState<number | null>(info.services[0]?.id ?? null);
  const [date, setDate] = useState(riyadhDate(0));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [plateNums, setPlateNums] = useState("");
  const [plateLetters, setPlateLetters] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ jobNumber: string; scheduledAt: string; manageToken?: string } | null>(null);
  // Phone verification (only when the garage requires it)
  const [otp, setOtp] = useState<"idle" | "sending" | "sent" | "verifying" | "verified">("idle");
  const [code, setCode] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [otpError, setOtpError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const needVerify = !!info.verifyPhone;
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown((c) => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);
  // A different number must be verified again.
  useEffect(() => { setOtp("idle"); setCode(""); setVerifyToken(""); setOtpError(""); }, [phone]);

  const dates = Array.from({ length: info.daysAhead + 1 }, (_, i) => riyadhDate(i));
  const dayLabel = (d: string, i: number) => {
    if (i === 0) return tx.today;
    if (i === 1) return tx.tomorrow;
    return new Date(`${d}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  };

  useEffect(() => {
    let live = true;
    setSlots(null); setSlotsError(false); setSlot(null);
    fetch(`/api/car-wash/slots?garageId=${garageId}&date=${date}${serviceId ? `&serviceId=${serviceId}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (live) setSlots(j.slots ?? []); })
      .catch(() => { if (live) { setSlots([]); setSlotsError(true); } });
    return () => { live = false; };
  }, [garageId, date, serviceId]);

  const service = info.services.find((s) => s.id === serviceId);
  const total = service ? Math.round(service.price * (1 + info.vatRate) * 100) / 100 : 0;
  const phoneOk = !!parsePhone(phone);
  const plate = [plateNums.trim(), plateLetters.trim()].filter(Boolean).join(" ");
  const canSubmit = !!service && !!slot && name.trim().length > 1 && phoneOk && plate.length > 0 && !submitting && (!needVerify || otp === "verified");
  const svcName = (s: CarWashInfo["services"][number]) => (locale === "ar" && s.nameAr ? s.nameAr : s.name);
  const fmt = (n: number) => n.toLocaleString("en-SA", { maximumFractionDigits: 2 });
  const timeLabel = (iso: string) => new Date(iso).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", { timeZone: "Asia/Riyadh", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

  async function sendCode() {
    setOtp("sending"); setOtpError("");
    try {
      const res = await fetch(`/api/car-wash/p/${garageId}/otp/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: parsePhone(phone), lang: locale === "ar" ? "ar" : "en" }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok) { setOtp("sent"); setCooldown(45); } else { setOtp("idle"); setOtpError(String(j?.error ?? tx.failed)); }
    } catch { setOtp("idle"); setOtpError(tx.failed); }
  }
  async function checkCode() {
    setOtp("verifying"); setOtpError("");
    try {
      const res = await fetch(`/api/car-wash/p/${garageId}/otp/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: parsePhone(phone), code }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.token) { setVerifyToken(j.token); setOtp("verified"); } else { setOtp("sent"); setOtpError(String(j?.error ?? tx.failed)); }
    } catch { setOtp("sent"); setOtpError(tx.failed); }
  }

  async function submit() {
    if (!canSubmit || !slot) return;
    setSubmitting(true); setError("");
    try {
      const res = await fetch(`/api/car-wash/book?garageId=${garageId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, slot: slot.iso, customerName: name.trim(), customerPhone: parsePhone(phone), plateNumber: plate, vehicleMake: make.trim() || undefined, vehicleModel: model.trim() || undefined, lang: locale === "ar" ? "ar" : "en", verifyToken: verifyToken || undefined }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setDone(j);
      else {
        setError(String(j?.error ?? tx.failed));
        if (res.status === 409) { setSlot(null); setDate((d) => d); fetch(`/api/car-wash/slots?garageId=${garageId}&date=${date}${serviceId ? `&serviceId=${serviceId}` : ""}`).then((r) => r.json()).then((x) => setSlots(x.slots ?? [])).catch(() => {}); }
      }
    } catch { setError(tx.failed); }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div dir={dir} className="mx-auto max-w-md px-4 py-10 text-center">
        <span className="cta mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white"><Check className="h-8 w-8" /></span>
        <h1 className="mt-5 text-2xl font-extrabold">{tx.doneTitle}</h1>
        <p className="mt-2 text-[15px] text-[#52525b]">{tx.doneBody}</p>
        <div className="mt-5 space-y-1 rounded-2xl bg-[#f4f4f5] p-4 text-[15px]">
          <p className="font-bold">{service && svcName(service)}</p>
          <p className="flex items-center justify-center gap-2"><CalendarClock className="h-4 w-4 text-[#e8201c]" />{timeLabel(done.scheduledAt)}</p>
          <p className="text-[#71717a]">{tx.ref}: <b>{done.jobNumber}</b></p>
        </div>
        {done.manageToken && <a href={`/manage/${done.manageToken}`} className="cta mt-6 inline-flex h-12 items-center rounded-full px-6 font-bold text-white">{tx.manage}</a>}
        <br /><button type="button" onClick={() => { setDone(null); setSlot(null); setError(""); setOtp("idle"); setVerifyToken(""); setCode(""); }} className="mt-3 h-12 rounded-full bg-[#f4f4f5] px-6 font-bold">{tx.another}</button>
      </div>
    );
  }

  return (
    <div dir={dir} className="mx-auto max-w-md px-4 pb-10 pt-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold"><Droplets className="h-6 w-6 text-[#e8201c]" />{tx.title}</h1>
        <LanguageSwitcher />
      </div>

      <h2 className="mb-2.5 text-[15px] font-bold">{tx.service}</h2>
      <ul className="space-y-2.5">
        {info.services.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => setServiceId(s.id)}
              className={`flex w-full items-center justify-between rounded-2xl border-2 bg-[#f4f4f5] px-4 py-3.5 text-start transition ${serviceId === s.id ? "border-[#e8201c] bg-white shadow-[0_6px_16px_rgba(232,32,28,0.15)]" : "border-transparent"}`}>
              <span className="text-[15px] font-bold">{svcName(s)}</span>
              <span className="text-[14px] font-bold text-[#e8201c]">{fmt(s.price)} {tx.sr}</span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="mb-2.5 mt-6 text-[15px] font-bold">{tx.when}</h2>
      <div className="rounded-2xl bg-[#f4f4f5] p-3.5">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dates.map((d, i) => (
            <button key={d} type="button" onClick={() => setDate(d)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold transition ${d === date ? "cta text-white" : "bg-white text-[#3f3f46]"}`}>{dayLabel(d, i)}</button>
          ))}
        </div>
        <div className="mt-3">
          {slotsError ? <p className="text-[14px] text-[#e8201c]">{tx.slotsFailed}</p>
            : slots === null ? <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white" />)}</div>
            : slots.some((s) => s.available) ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button key={s.iso} type="button" disabled={!s.available} onClick={() => setSlot(s)}
                    className={`h-10 rounded-xl text-[13px] font-bold transition disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[#c4c4cc] disabled:line-through ${slot?.iso === s.iso ? "cta text-white" : "bg-white text-[#3f3f46]"}`}>{to12(s.time)}</button>
                ))}
              </div>
            ) : <p className="text-[14px] text-[#71717a]">{tx.noSlots}</p>}
        </div>
      </div>

      <h2 className="mb-2.5 mt-6 text-[15px] font-bold">{tx.details}</h2>
      <div className="space-y-3 rounded-2xl bg-[#f4f4f5] p-3.5">
        <label className="block"><span className={labelCls}>{tx.name}</span>
          <input className={inputCls} value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} /></label>
        <label className="block"><span className={labelCls}>{tx.phone}</span>
          <input className={inputCls} dir="ltr" type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder="05XXXXXXXX" onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)} />
          {phoneTouched && !phoneOk && <span className="mt-1 block text-[12px] text-[#e8201c]">{tx.phoneInvalid}</span>}</label>
        {needVerify && phoneOk && (
          <div className="rounded-xl bg-white p-3">
            {otp === "verified" ? (
              <p className="flex items-center gap-2 text-[14px] font-bold text-emerald-600"><Check className="h-4 w-4" />{tx.verified}</p>
            ) : otp === "idle" || otp === "sending" ? (
              <button type="button" disabled={otp === "sending" || cooldown > 0} onClick={sendCode} className="h-11 w-full rounded-xl bg-[#f4f4f5] text-[14px] font-bold disabled:opacity-50">
                {otp === "sending" ? tx.sending : cooldown > 0 ? `${tx.resend} (${cooldown})` : tx.verifyBtn}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[13px] text-[#52525b]">{tx.verifySent}</p>
                <div className="flex gap-2">
                  <input className={`${inputCls} text-center text-lg font-bold tracking-[0.4em]`} dir="ltr" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
                  <button type="button" disabled={code.length !== 6 || otp === "verifying"} onClick={checkCode} className="cta h-12 shrink-0 rounded-xl px-5 text-[14px] font-bold text-white disabled:opacity-50">{otp === "verifying" ? "…" : tx.confirmCode}</button>
                </div>
                <button type="button" disabled={cooldown > 0} onClick={sendCode} className="text-[12px] font-bold text-[#e8201c] disabled:opacity-40">{cooldown > 0 ? `${tx.resend} (${cooldown})` : tx.resend}</button>
              </div>
            )}
            {otpError && <p role="alert" className="mt-2 text-[13px] text-[#e8201c]">{otpError}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={labelCls}>{tx.plateLetters}</span>
            <input className={`${inputCls} text-center font-bold tracking-[0.25em]`} dir="ltr" maxLength={4} value={plateLetters} onChange={(e) => setPlateLetters(e.target.value.toUpperCase())} /></label>
          <label className="block"><span className={labelCls}>{tx.plateNums}</span>
            <input className={`${inputCls} text-center font-bold tracking-[0.25em]`} dir="ltr" inputMode="numeric" maxLength={4} value={plateNums} onChange={(e) => setPlateNums(e.target.value.replace(/\D/g, ""))} /></label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className={labelCls}>{tx.make} <span className="font-normal normal-case tracking-normal text-[#a1a1aa]">({tx.optional})</span></span>
            <input className={inputCls} value={make} onChange={(e) => setMake(e.target.value)} /></label>
          <label className="block"><span className={labelCls}>{tx.model} <span className="font-normal normal-case tracking-normal text-[#a1a1aa]">({tx.optional})</span></span>
            <input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} /></label>
        </div>
        {service && (
          <div className="flex items-center justify-between rounded-2xl bg-white p-4 text-[14px]">
            <span className="text-[#52525b]">{tx.total}</span><b className="text-[16px]">{fmt(total)} {tx.sr}</b>
          </div>
        )}
        {error && <p role="alert" className="text-[14px] text-[#e8201c]">{error}</p>}
      </div>

      <button type="button" disabled={!canSubmit} onClick={submit} className="cta mt-4 h-12 w-full rounded-full font-bold text-white disabled:opacity-50">
        {submitting ? tx.sending : tx.confirm}
      </button>
    </div>
  );
}
