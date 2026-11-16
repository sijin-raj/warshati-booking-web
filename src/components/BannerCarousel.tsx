"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

interface Banner { imageUrl: string; imageUrlAr: string | null; link: string | null }

/** Promo carousel at the top of the booking page: auto-advances, swipes, and pauses while a finger or the mouse is on it. */
export default function BannerCarousel({ banners, className = "" }: { banners: Banner[]; className?: string }) {
  const { locale, dir } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;
  const go = (i: number) => setIndex(((i % count) + count) % count);
  // In a right-to-left page the slides run right to left, so "next" is a swipe to the right.
  const step = dir === "rtl" ? -1 : 1;

  return (
    <section
      aria-roledescription="carousel"
      className={`relative mb-4 overflow-hidden rounded-[28px] bg-[#111] shadow-[0_14px_34px_rgba(0,0,0,0.14)] sm:mb-6 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { start.current = e.touches[0].clientX; moved.current = false; setPaused(true); }}
      onTouchEnd={(e) => {
        const dx = start.current === null ? 0 : e.changedTouches[0].clientX - start.current;
        start.current = null;
        setPaused(false);
        if (Math.abs(dx) > 40) { moved.current = true; go(index + (dx < 0 ? step : -step)); }
      }}
    >
      <div className="flex transition-transform duration-500 ease-out" dir="ltr" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map((b, i) => {
          const src = locale === "ar" && b.imageUrlAr ? b.imageUrlAr : b.imageUrl;
          // eslint-disable-next-line @next/next/no-img-element
          const img = <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} draggable={false} className="block aspect-[2.45/1] w-full object-cover" />;
          return (
            <div key={i} className="w-full shrink-0" aria-hidden={i !== index}>
              {b.link ? (
                <a href={b.link} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (moved.current) e.preventDefault(); }}>{img}</a>
              ) : img}
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <div className="absolute bottom-3 start-4 flex items-center gap-1.5" dir={dir}>
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1} / ${count}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-[#e8201c]" : "w-2 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
