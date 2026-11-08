"use client";

import { useI18n } from "@/i18n/provider";
import LanguageSwitcher from "./LanguageSwitcher";

type Section = { title: string; items: string[] };

const CONTENT: Record<"en" | "ar", { title: string; intro: string; back: string; sections: Section[] }> = {
  en: {
    title: "Booking policy & terms",
    intro: "These terms apply to car wash bookings made on this website. By paying online you accept them.",
    back: "Back",
    sections: [
      { title: "1. Payment and refunds", items: [
        "Bookings are paid online when you confirm them, and the time is held for you while you pay.",
        "An online-paid booking is non-refundable. If you cancel, or you do not arrive for your booking, the amount paid is not returned.",
        "If the garage is the reason a booking cannot go ahead, contact the garage. Only the garage can decide on a refund, and it arranges it directly with you.",
        "You cannot cancel an online-paid booking yourself on the website. Please contact the garage.",
      ] },
      { title: "2. Changing your time", items: [
        "You can change the time of your own booking once, using the link in your confirmation message, up to the cut-off time shown on your booking page.",
        "After you have used your one change, further changes are only possible through the garage.",
        "The new time must be available, and the service stays the same.",
      ] },
      { title: "3. If you do not arrive", items: [
        "If you have not arrived a short while after your booked time, the garage may mark the booking as missed and release the time to other customers.",
        "The garage may then send you a one-time link on WhatsApp to choose a new time. This is separate from your own change, and the link works once and for a limited time.",
        "If you miss the new time as well, the booking is final: the amount paid is non-refundable and the booking cannot be rescheduled again online.",
      ] },
      { title: "4. Arriving on time", items: [
        "Please arrive at your booked time. Arriving late may mean we cannot complete the full service in your slot or that your car waits for a free bay.",
        "Wash times are estimates and may vary with the condition of the vehicle.",
      ] },
      { title: "5. Your details", items: [
        "We use your name, phone number and vehicle details to manage your booking and to send you WhatsApp messages about it, such as your confirmation, reminder, reschedule link and when your car is ready.",
        "Please give a correct mobile number so that you receive your booking link.",
      ] },
      { title: "6. Contact", items: [
        "For any change, cancellation or question about your booking, contact the garage. Keep your booking number ready.",
      ] },
    ],
  },
  ar: {
    title: "سياسة الحجز والشروط والأحكام",
    intro: "تنطبق هذه الشروط على حجوزات غسيل السيارات عبر هذا الموقع. بدفعك عبر الإنترنت فإنك توافق عليها.",
    back: "رجوع",
    sections: [
      { title: "١. الدفع والاسترداد", items: [
        "يتم دفع الحجز عبر الإنترنت عند تأكيده، ويُحتفظ بموعدك أثناء إتمام الدفع.",
        "الحجز المدفوع عبر الإنترنت غير قابل للاسترداد. وإذا ألغيت الحجز أو لم تحضر في موعدك فلن يُعاد المبلغ المدفوع.",
        "إذا كانت الورشة هي سبب تعذّر تنفيذ الحجز، تواصل معها. القرار في أي استرداد يعود للورشة وحدها وتتولى ترتيبه معك مباشرة.",
        "لا يمكنك إلغاء حجز مدفوع عبر الإنترنت بنفسك من الموقع. يرجى التواصل مع الورشة.",
      ] },
      { title: "٢. تغيير الموعد", items: [
        "يمكنك تغيير موعد حجزك مرة واحدة فقط باستخدام الرابط في رسالة التأكيد، وذلك حتى الوقت المحدد في صفحة حجزك.",
        "بعد استخدام التغيير الواحد، لا يمكن إجراء تغييرات أخرى إلا عن طريق الورشة.",
        "يجب أن يكون الموعد الجديد متاحًا، وتبقى الخدمة كما هي.",
      ] },
      { title: "٣. في حال عدم الحضور", items: [
        "إذا لم تصل بعد مرور فترة قصيرة على موعد حجزك، يجوز للورشة اعتبار الحجز فائتًا وإتاحة الموعد لعملاء آخرين.",
        "وقد ترسل لك الورشة بعدها رابطًا لمرة واحدة عبر واتساب لاختيار موعد جديد. وهذا منفصل عن تغييرك الخاص، ويعمل الرابط مرة واحدة ولفترة محدودة.",
        "إذا لم تحضر في الموعد الجديد أيضًا، يصبح الحجز نهائيًا: المبلغ المدفوع غير قابل للاسترداد ولا يمكن إعادة جدولة الحجز عبر الإنترنت.",
      ] },
      { title: "٤. الحضور في الموعد", items: [
        "يرجى الحضور في موعد حجزك. قد يعني التأخر أننا لا نستطيع إتمام الخدمة كاملة ضمن موعدك أو أن تنتظر سيارتك حتى يتوفر موقع غسيل.",
        "أوقات الغسيل تقديرية وقد تختلف حسب حالة السيارة.",
      ] },
      { title: "٥. بياناتك", items: [
        "نستخدم اسمك ورقم جوالك وبيانات سيارتك لإدارة حجزك ولإرسال رسائل واتساب بخصوصه، مثل التأكيد والتذكير ورابط تغيير الموعد وإشعار جاهزية السيارة.",
        "يرجى إدخال رقم جوال صحيح لتصلك رسالة الحجز.",
      ] },
      { title: "٦. التواصل", items: [
        "لأي تغيير أو إلغاء أو استفسار عن حجزك، تواصل مع الورشة وجهّز رقم حجزك.",
      ] },
    ],
  },
};

export default function PolicyPage() {
  const { locale, dir } = useI18n();
  const c = CONTENT[locale === "ar" ? "ar" : "en"];
  return (
    <div dir={dir} className="mx-auto max-w-2xl px-4 pb-14 pt-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <a href="/" onClick={(e) => { e.preventDefault(); if (history.length > 1) history.back(); else window.location.href = "/"; }} className="text-[14px] font-bold text-[#e8201c]">{c.back}</a>
        <LanguageSwitcher />
      </div>
      <h1 className="text-2xl font-extrabold leading-tight">{c.title}</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[#52525b]">{c.intro}</p>
      <div className="mt-6 space-y-3">
        {c.sections.map((s) => (
          <section key={s.title} className="rounded-2xl bg-[#f4f4f5] p-4">
            <h2 className="text-[16px] font-extrabold">{s.title}</h2>
            <ul className="mt-2 space-y-2 text-[14px] leading-relaxed text-[#3f3f46]">
              {s.items.map((i) => <li key={i} className="flex gap-2"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e8201c]" /><span>{i}</span></li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
