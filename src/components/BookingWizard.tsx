"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Car, CalendarClock, Check, ChevronLeft, ChevronRight, Droplets, Phone, Search, Snowflake, Sparkles, Wrench, CircleDot, ShieldCheck, UserRound, MapPin, Clock } from "lucide-react";
import type { BookingConfig } from "@/lib/api";
import { parsePhone } from "@/lib/phone";
import { useI18n } from "@/i18n/provider";
import LanguageSwitcher from "./LanguageSwitcher";

interface Slot { time: string; iso: string; available: boolean }

// Only these services are booked into a time slot (quick, walk-in style jobs). Every other service is sent
// as a request without a time and the garage calls the customer to arrange it. Matches on the service name.
const SCHEDULED_SERVICE = /wash|غسيل|غسل/i;

type LoadStatus = "idle" | "loading" | "error";

/** GET JSON from our /api/car/* routes, retrying a couple of times (the upstream car service can be slow to wake). */
async function fetchCarList<T>(url: string, key: string): Promise<T[] | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const list = ((await res.json()) as Record<string, unknown>)[key];
        if (Array.isArray(list) && list.length > 0) return list as T[];
      }
    } catch { /* network hiccup — retry */ }
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  return null;
}

// Shown when the car service is down so a customer can still book: any recent year, and a typed model.
const FALLBACK_YEARS = Array.from({ length: new Date().getFullYear() + 1 - 1999 }, (_, i) => new Date().getFullYear() + 1 - i);

const RIYADH_OFFSET_MS = 3 * 3600_000;
const DAYS_AHEAD = 14;

function riyadhDate(offsetDays: number): string {
  return new Date(Date.now() + RIYADH_OFFSET_MS + offsetDays * 86400_000).toISOString().slice(0, 10);
}

const inputCls =
  "h-12 w-full rounded-xl border border-transparent bg-white px-3.5 text-[15px] outline-none transition focus:border-[#e8201c] focus:ring-4 focus:ring-[#e8201c]/10 disabled:bg-[#f0f0f1] disabled:text-[#a1a1aa]";
const labelCls = "mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-[#52525b]";

function Block({ title, open, onToggle, hideLabel, showLabel, children }: {
  title: string; open: boolean; onToggle: () => void; hideLabel: string; showLabel: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-3">
        <h2 className="text-[15px] font-bold">{title}</h2>
        <button type="button" onClick={onToggle} className="text-[11px] font-bold text-[#e8201c]">{open ? hideLabel : showLabel}</button>
        <span className="h-px flex-1 bg-[#e4e4e7]" />
      </div>
      {open && <div className="rounded-2xl bg-[#f4f4f5] p-3.5">{children}</div>}
    </div>
  );
}

function serviceIcon(name: string) {
  const n = name.toLowerCase();
  if (/ac|air|cool/.test(n)) return Snowflake;
  if (/wash|clean/.test(n)) return Droplets;
  if (/polish|ceramic|detail|coat/.test(n)) return Sparkles;
  if (/tire|tyre|wheel|rim/.test(n)) return CircleDot;
  if (/ppf|tint|protect/.test(n)) return ShieldCheck;
  return Wrench;
}

export default function BookingWizard({ config }: { config: BookingConfig }) {
  const { t, locale, dir } = useI18n();
  const [step, setStep] = useState(0);

  // step 0
  const [selected, setSelected] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(riyadhDate(0));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState(false);
  const [slot, setSlot] = useState<Slot | null>(null);

  // step 1
  const [makes, setMakes] = useState<{ make: string; logo: string | null }[]>([]);
  const brandRef = useRef<HTMLDivElement>(null);
  const scrollBrands = (dir: 1 | -1) => brandRef.current?.scrollBy({ left: dir * 220 * (document.dir === "rtl" ? -1 : 1), behavior: "smooth" });
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setClosed((c) => ({ ...c, [k]: !c[k] }));
  const [years, setYears] = useState<number[]>([]);
  const [yearsStatus, setYearsStatus] = useState<LoadStatus>("idle");
  const [modelsStatus, setModelsStatus] = useState<LoadStatus>("idle");
  const [makesTry, setMakesTry] = useState(0);
  const [makesFailed, setMakesFailed] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [make, setMake] = useState("");
  const [year, setYear] = useState("");
  const [model, setModel] = useState("");
  const [plateNums, setPlateNums] = useState("");
  const [plateLetters, setPlateLetters] = useState("");

  // step 2
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);

  const fields = config.form.fields;
  const show = (k: string) => fields[k]?.visible !== false;
  const req = (k: string, dflt = false) => fields[k]?.required ?? dflt;
  const svcName = (s: { name: string; nameAr?: string | null }) => (locale === "ar" && s.nameAr ? s.nameAr : s.name);
  // "09:00" → "9 AM" / "٩ ص"; minutes only when not on the hour ("9:30 AM").
  const fmtClock = (hm: string) => {
    const [h, m] = hm.split(":").map(Number);
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    const mins = m ? `:${String(m).padStart(2, "0")}` : "";
    const text = `${hour12}${mins}`;
    const ampm = locale === "ar" ? (h >= 12 ? "م" : "ص") : h >= 12 ? "PM" : "AM";
    const shown = locale === "ar" ? text.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]) : text;
    return `${shown} ${ampm}`;
  };
  const fmtNum = (n: number | string) => Number(n).toLocaleString(locale === "ar" ? "ar-SA" : "en-US");

  const dates = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => riyadhDate(i)), []);

  const needsSchedule = useMemo(
    () => config.services.some((s) => selected.includes(s.id) && SCHEDULED_SERVICE.test(s.name)),
    [config.services, selected],
  );

  // Load slots whenever the day changes — only once a schedulable service (e.g. Car Wash) is picked.
  useEffect(() => {
    if (!needsSchedule) return;
    let cancelled = false;
    fetch(`/api/slots?garageId=${config.id}&date=${date}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => !cancelled && setSlots(j.slots as Slot[]))
      .catch(() => !cancelled && setSlotsError(true));
    return () => { cancelled = true; };
  }, [config.id, date, needsSchedule]);

  // Car cascade: makes → years → models. Each step retries, and degrades to manual entry if the service stays down.
  useEffect(() => {
    let cancelled = false;
    fetchCarList<{ make: string; logo: string | null }>("/api/car/makes", "makes").then((list) => {
      if (cancelled) return;
      if (list) { setMakes(list); setMakesFailed(false); } else setMakesFailed(true);
    });
    return () => { cancelled = true; };
  }, [makesTry]);
  useEffect(() => {
    if (!make) return;
    let cancelled = false;
    fetchCarList<number>(`/api/car/years?make=${encodeURIComponent(make)}`, "years").then((list) => {
      if (cancelled) return;
      if (list) { setYears([...list].reverse()); setYearsStatus("idle"); }
      else { setYears(FALLBACK_YEARS); setYearsStatus("error"); }
    });
    return () => { cancelled = true; };
  }, [make]);
  useEffect(() => {
    if (!make || !year) return;
    let cancelled = false;
    fetchCarList<string>(`/api/car/models?make=${encodeURIComponent(make)}&year=${year}`, "models").then((list) => {
      if (cancelled) return;
      if (list) { setModels(list); setModelsStatus("idle"); }
      else setModelsStatus("error");
    });
    return () => { cancelled = true; };
  }, [make, year]);

  function pickDate(d: string) {
    setDate(d); setSlots(null); setSlotsError(false); setSlot(null);
  }
  function pickMake(m: string) {
    setMake(m); setYear(""); setYears([]); setYearsStatus("loading"); setModel(""); setModels([]); setModelsStatus("idle");
  }
  function pickYear(y: string) {
    setYear(y); setModel(""); setModels([]); setModelsStatus(y ? "loading" : "idle");
  }

    const filtered = config.services.filter((s) => {
      const q = query.trim().toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.nameAr ?? "").toLowerCase().includes(q);
    });
  const chosen = config.services.filter((s) => selected.includes(s.id));
  const phoneOk = parsePhone(phone) !== null;

  const carOk =
    (!req("vehicleBrand") || !!make) &&
    (!req("vehicleModel") || !!model);
  const detailsOk = name.trim().length > 1 && phoneOk && (!req("customerEmail") || !!email.trim()) && (!req("notes") || !!notes.trim());
  const canNext = step === 0 ? carOk && selected.length > 0 : (!needsSchedule || !!slot) && detailsOk;

  const dayLabel = (d: string, i: number) => {
    if (i === 0) return t("service.today");
    if (i === 1) return t("service.tomorrow");
    return new Date(`${d}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  };
  const whenLabel = needsSchedule && slot
    ? `${new Date(`${date}T12:00:00Z`).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })} · ${slot.time}`
    : "";
  const plate = [plateLetters.trim(), plateNums.trim()].filter(Boolean).join(" ");
  const carLabel = [make, model, year].filter(Boolean).join(" ");

  async function submit() {
    if (submitting || (needsSchedule && !slot)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/book?garageId=${config.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined,
          vehicleBrand: make || undefined,
          vehicleYear: year ? Number(year) : undefined,
          vehicleModel: model || undefined,
          plateNumber: plate || undefined,
          serviceType: chosen.map((s) => s.name).join(", "),
          notes: notes.trim() || undefined,
          preferredDate: needsSchedule && slot ? slot.iso : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(res.status === 429 || j?.error ? String(j?.error ?? t("details.failed")) : t("details.failed"));
        return;
      }
      const j = await res.json();
      setBookingId(j.id ?? null);
    } catch {
      setError(t("details.failed"));
    } finally {
      setSubmitting(false);
    }
  }

  const Back = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Fwd = dir === "rtl" ? ChevronLeft : ChevronRight;

  // ── Shell: dark service panel (desktop) + form card ─────────────────────
  const shell = (children: React.ReactNode) => (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 pb-8 pt-4 sm:pt-6">
      <header className="mb-4 flex items-center justify-between sm:mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Lezof" className="h-6 w-auto sm:h-7" />
        <LanguageSwitcher />
      </header>
      <div className="grid flex-1 content-start items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <aside className="relative hidden overflow-hidden rounded-[28px] bg-[#111] shadow-[0_20px_50px_rgba(0,0,0,0.12)] lg:flex">
          {/* Branch artwork with the service list baked in, same as book.lezof.com */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-services.webp" alt={config.name} width={644} height={888} className="block w-full object-cover object-[30%_bottom]" />
        </aside>
        <div className="flex min-w-0 flex-col [&>*:first-child]:flex-1">{children}</div>
      </div>
      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-[12px] text-[#71717a]">
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-[#e8201c]" />{t("service.hours", { start: fmtClock(config.workingHours.start), end: fmtClock(config.workingHours.end) })}</span>
        {config.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#e8201c]" />{config.address}</span>}
      </p>
    </div>
  );

  // ── Confirmation ──────────────────────────────────────────────────────────
  if (bookingId !== null) {
    return (
      shell(<>
        <div className="rounded-[28px] bg-white p-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <div className="cta mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white"><Check className="h-8 w-8" /></div>
          <h1 className="text-2xl font-bold">{t("done.title")}</h1>
          <p className="mt-2 text-[#71717a]">{t("done.subtitle")}</p>
          <dl className="mt-6 space-y-3 rounded-2xl bg-[#f6f6f7] p-4 text-start text-[14px]">
            <div><dt className="text-[#71717a]">{t("done.reference")}</dt><dd className="font-bold">#{fmtNum(bookingId)}</dd></div>
            {whenLabel && <div><dt className="text-[#71717a]">{t("done.when")}</dt><dd className="font-bold">{whenLabel}</dd></div>}
            <div><dt className="text-[#71717a]">{t("done.where")}</dt><dd className="font-bold">{config.name}{config.address ? ` — ${config.address}` : ""}</dd></div>
          </dl>
          <div className="mt-6 flex flex-col gap-3">
            {config.phone && (
              <a href={`tel:${config.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#e4e4e7] font-bold">
                <Phone className="h-4 w-4 text-[#e8201c]" />{t("done.call")}
              </a>
            )}
            <button onClick={() => window.location.reload()} className="cta h-12 rounded-full font-bold text-white">{t("done.another")}</button>
          </div>
        </div>
      </>)
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  const tabs = [
    { key: "steps.car", Icon: Car },
    { key: "steps.details", Icon: UserRound },
  ] as const;

  return (
    shell(<>
      <div className="rounded-[28px] bg-white p-3 shadow-[0_20px_50px_rgba(0,0,0,0.08)] sm:p-4">
        {/* black pill step switcher */}
        <ol className="flex gap-1 rounded-full bg-[#111] p-1">
          {tabs.map(({ key, Icon }, i) => (
            <li key={key} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                className={`flex h-11 w-full items-center justify-center gap-2 rounded-full px-2 text-[12px] font-bold transition sm:text-[13px] ${
                  i === step ? "cta text-white" : i < step ? "text-white" : "text-white/40"
                }`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${i === step ? "bg-white text-[#e8201c]" : "bg-white/15"}`}>
                  {i < step ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </span>
                <span className="truncate">{t(key)}</span>
              </button>
            </li>
          ))}
        </ol>

        <section className="mt-4 space-y-5">
          {step === 0 && (
            <>
              {show("vehicleBrand") && (
                <Block title={t("steps.car")} open={!closed.car} onToggle={() => toggle("car")} hideLabel={t("common.hide")} showLabel={t("common.show")}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className={labelCls + " !mb-0"}>{fields.vehicleBrand?.label || t("car.make")}{make && <span className="ms-2 normal-case tracking-normal text-[#e8201c]">{make}</span>}</span>
                    <span className="text-[11px] font-bold text-[#e8201c]">{t("car.scroll")}</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl bg-white px-1.5 sm:px-2">
                    <button type="button" aria-label="Previous" onClick={() => scrollBrands(-1)} className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] transition hover:bg-[#e8201c] hover:text-white sm:flex"><Back className="h-4 w-4" /></button>
                    <div
                      ref={brandRef}
                      className="no-scrollbar flex min-w-0 flex-1 snap-x gap-2.5 overflow-x-auto scroll-smooth px-3 py-4 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)]"
                    >
                      {makes.length === 0 && makesFailed
                        ? <button type="button" onClick={() => { setMakesFailed(false); setMakesTry((n) => n + 1); }} className="mx-auto my-3 rounded-full bg-[#f4f4f5] px-4 py-2 text-[13px] font-bold text-[#e8201c]">{t("car.retry")}</button>
                        : makes.length === 0
                        ? Array.from({ length: 8 }, (_, i) => <div key={i} className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-[#f4f4f5]" />)
                        : makes.map((m) => (
                            <button key={m.make} type="button" title={m.make} aria-label={m.make} aria-pressed={make === m.make}
                              onClick={(e) => { pickMake(m.make); e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }}
                              className={`flex h-14 w-14 shrink-0 snap-center items-center justify-center rounded-2xl border-2 bg-[#f4f4f5] transition active:scale-95 ${make === m.make ? "border-[#e8201c] bg-white shadow-[0_6px_16px_rgba(232,32,28,0.18)]" : "border-transparent"}`}>
                              {m.logo ? <img src={m.logo} alt="" loading="lazy" className="h-8 w-8 object-contain" /> : <Car className="h-6 w-6" />}
                            </button>
                          ))}
                    </div>
                    <button type="button" aria-label="Next" onClick={() => scrollBrands(1)} className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] transition hover:bg-[#e8201c] hover:text-white sm:flex"><Fwd className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelCls}>{t("car.year")}</span>
                      <select className={inputCls} value={year} disabled={!make} onChange={(e) => pickYear(e.target.value)}>
                        <option value="">{!make ? t("car.selectMakeFirst") : yearsStatus === "loading" ? t("car.loading") : t("car.selectYear")}</option>
                        {years.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>{fields.vehicleModel?.label || t("car.model")}</span>
                      {modelsStatus === "error" ? (
                        // The model list couldn't be loaded — let the customer type it instead of blocking the booking.
                        <input className={inputCls} value={model} placeholder={t("car.typeModel")} onChange={(e) => setModel(e.target.value)} />
                      ) : (
                        <select className={inputCls} value={model} disabled={!year} onChange={(e) => setModel(e.target.value)}>
                          <option value="">{!year ? t("car.selectYearFirst") : modelsStatus === "loading" ? t("car.loading") : t("car.selectModel")}</option>
                          {models.map((m) => <option key={m}>{m}</option>)}
                        </select>
                      )}
                    </label>
                  </div>
                  {show("plateNumber") && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className={labelCls}>{t("car.plateLetters")} <span className="font-normal normal-case tracking-normal text-[#a1a1aa]">({t("common.optional")})</span></span>
                        <input className={`${inputCls} text-center font-bold tracking-[0.25em]`} dir="ltr" maxLength={4} value={plateLetters} onChange={(e) => setPlateLetters(e.target.value.toUpperCase())} />
                      </label>
                      <label className="block">
                        <span className={labelCls}>{t("car.plateNumbers")} <span className="font-normal normal-case tracking-normal text-[#a1a1aa]">({t("common.optional")})</span></span>
                        <input className={`${inputCls} text-center font-bold tracking-[0.25em]`} dir="ltr" inputMode="numeric" maxLength={4} value={plateNums} onChange={(e) => setPlateNums(e.target.value.replace(/\D/g, ""))} />
                      </label>
                    </div>
                  )}
                </Block>
              )}

              <Block title={t("steps.service")} open={!closed.service} onToggle={() => toggle("service")} hideLabel={t("common.hide")} showLabel={t("common.show")}>
                {config.services.length > 8 && (
                  <div className="relative mb-3">
                    <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a1a1aa]" />
                    <input className={`${inputCls} ps-10`} placeholder={t("service.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                )}
                <ul className="grid grid-cols-2 gap-2.5">
                  {filtered.length === 0 && <li className="col-span-2 py-4 text-center text-[14px] text-[#71717a]">{t("service.none")}</li>}
                  {filtered.map((s) => {
                    const on = selected.includes(s.id);
                    const Icon = serviceIcon(s.name);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSelected((p) => (on ? p.filter((x) => x !== s.id) : [...p, s.id]))}
                          className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 bg-white p-3 text-start transition active:scale-[0.98] ${on ? "border-[#e8201c] shadow-[0_8px_20px_rgba(232,32,28,0.15)]" : "border-transparent"}`}
                        >
                          {s.imageUrl ? (
                            // The garage's own service icon (Settings → Booking Form); a check badge marks the selection.
                            <span className="relative h-10 w-10 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={s.imageUrl} alt="" loading="lazy" className="h-10 w-10 rounded-xl bg-[#f1f1f2] object-cover" />
                              {on && <span className="cta absolute -end-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white ring-2 ring-white"><Check className="h-2.5 w-2.5" /></span>}
                            </span>
                          ) : (
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${on ? "cta text-white" : "bg-[#f1f1f2] text-[#3f3f46]"}`}>
                              {on ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block text-[13px] font-bold leading-tight">{svcName(s)}</span>
                            {Number(s.unitPrice) > 0 && <span className="mt-0.5 block text-[11px] text-[#71717a]">{t("service.from")} {fmtNum(s.unitPrice)} {t("common.sr")}</span>}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Block>
            </>
          )}

          {step === 1 && (
            <>
              {needsSchedule && (
              <Block title={t("service.when")} open={!closed.when} onToggle={() => toggle("when")} hideLabel={t("common.hide")} showLabel={t("common.show")}>
                <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                  {dates.map((d, i) => (
                    <button key={d} type="button" onClick={() => pickDate(d)}
                      className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold transition ${d === date ? "cta text-white" : "bg-white text-[#3f3f46]"}`}>
                      {dayLabel(d, i)}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  {slotsError ? (
                    <p className="text-[14px] text-[#e8201c]">{t("service.slotsFailed")}</p>
                  ) : slots === null ? (
                    <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white" />)}</div>
                  ) : slots.some((s) => s.available) ? (
                    <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto">
                      {slots.map((s) => (
                        <button key={s.iso} type="button" disabled={!s.available} onClick={() => setSlot(s)}
                          className={`h-10 rounded-xl text-[13px] font-bold transition disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[#c4c4cc] disabled:line-through ${slot?.iso === s.iso ? "cta text-white" : "bg-white text-[#3f3f46]"}`}>
                          {s.time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[14px] text-[#71717a]">{t("service.noSlots")}</p>
                  )}
                </div>
              </Block>
              )}

              <Block title={t("steps.details")} open={!closed.cust} onToggle={() => toggle("cust")} hideLabel={t("common.hide")} showLabel={t("common.show")}>
                <div className="space-y-3">
                  <label className="block">
                    <span className={labelCls}>{t("details.name")}</span>
                    <input className={inputCls} value={name} placeholder={t("details.namePlaceholder")} autoComplete="name" onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label className="block">
                    <span className={labelCls}>{t("details.phone")}</span>
                    <input className={inputCls} dir="ltr" type="tel" inputMode="tel" autoComplete="tel" value={phone} placeholder={t("details.phonePlaceholder")}
                      onChange={(e) => setPhone(e.target.value)} onBlur={() => setPhoneTouched(true)} />
                    {phoneTouched && !phoneOk && <span className="mt-1 block text-[12px] text-[#e8201c]">{t("details.phoneInvalid")}</span>}
                  </label>
                  {show("customerEmail") && (
                    <label className="block">
                      <span className={labelCls}>{fields.customerEmail?.label || t("details.email")}{!req("customerEmail") && <span className="font-normal normal-case tracking-normal text-[#a1a1aa]"> ({t("common.optional")})</span>}</span>
                      <input className={inputCls} dir="ltr" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </label>
                  )}
                  {show("notes") && (
                    <label className="block">
                      <span className={labelCls}>{fields.notes?.label || t("details.notes")}{!req("notes") && <span className="font-normal normal-case tracking-normal text-[#a1a1aa]"> ({t("common.optional")})</span>}</span>
                      <textarea className={`${inputCls} h-24 py-3`} value={notes} placeholder={t("details.notesPlaceholder")} onChange={(e) => setNotes(e.target.value)} />
                    </label>
                  )}
                </div>

                <div className="mt-4 space-y-2 rounded-2xl bg-white p-4 text-[14px]">
                  <h3 className="font-bold">{t("details.summary")}</h3>
                  {whenLabel && <p className="flex gap-2"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-[#e8201c]" /><b>{whenLabel}</b></p>}
                  <p className="flex gap-2"><Wrench className="mt-0.5 h-4 w-4 shrink-0 text-[#e8201c]" /><b>{chosen.map(svcName).join("، ")}</b></p>
                  {(carLabel || plate) && <p className="flex gap-2"><Car className="mt-0.5 h-4 w-4 shrink-0 text-[#e8201c]" /><b>{[carLabel, plate].filter(Boolean).join(" · ")}</b></p>}
                </div>
                {error && <p role="alert" className="mt-3 text-[14px] text-[#e8201c]">{error}</p>}
              </Block>
            </>
          )}
        </section>

        <div className="mt-4 flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="flex h-12 items-center gap-1 rounded-full bg-[#f4f4f5] px-5 font-bold">
              <Back className="h-4 w-4" />{t("common.back")}
            </button>
          )}
          {step < 1 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)}
              className="cta flex h-12 flex-1 items-center justify-center gap-1 rounded-full font-bold text-white">
              {t("common.next")}<Fwd className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={!canNext || submitting} onClick={submit} className="cta h-12 flex-1 rounded-full font-bold text-white">
              {submitting ? t("details.sending") : config.form.submitLabel || t("details.confirm")}
            </button>
          )}
        </div>
      </div>
    </>)
  );
}
