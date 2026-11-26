"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";

interface Banner { imageUrl: string | null; imageUrlAr: string | null; desktopImageUrl?: string | null; desktopImageUrlAr?: string | null; link: string | null }

/** Promo carousel at the top of the booking page: auto-advances, swipes, and pauses while a finger or the mouse is on it. */
export default function BannerCarousel({ banners: all, className = "", variant = "mobile" }: { banners: Banner[]; className?: string; variant?: "mobile" | "desktop" }) {
  const { locale, dir } = useI18n();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const start = useRef<number | null>(null);
  const moved = useRef(false);
  const desktop = variant === "desktop";
  // Each slide shows the artwork made for this screen; a slide with none for it is skipped.
  const pick = (b: Banner) => (desktop
    ? (locale === "ar" && b.desktopImageUrlAr ? b.desktopImageUrlAr : b.desktopImageUrl)
    : (locale === "ar" && b.imageUrlAr ? b.imageUrlAr : b.imageUrl));
  const banners = all.filter((b) => pick(b));
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
      className={`relative overflow-hidden rounded-[28px] bg-[#111] ${desktop ? "h-full w-full" : "mb-4 shadow-[0_14px_34px_rgba(0,0,0,0.14)] sm:mb-6"} ${className}`}
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
      <div className={`flex transition-transform duration-500 ease-out${desktop ? " h-full" : ""}`} dir="ltr" style={{ transform: `translateX(-${index * 100}%)` }}>
        {banners.map((b, i) => {
          const src = pick(b) as string;
          // Desktop: the picture fills the whole panel edge to edge (the panel is shaped like the 926 x 1698 artwork, so almost nothing is cut).
          // Mobile: the box is shaped like the 1698 x 926 artwork; a slide of another shape is shown whole over a blurred copy of itself.
          // Works the same for a still image and an animated GIF.
          const img = desktop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} draggable={false} className="block h-full w-full object-cover object-center" />
          ) : (
            <div className="relative aspect-[1698/926] w-full overflow-hidden bg-[#111]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" aria-hidden draggable={false} className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading={i === 0 ? "eager" : "lazy"} draggable={false} className="relative block h-full w-full object-contain" />
            </div>
          );
          return (
            <div key={i} className={`w-full shrink-0 ${desktop ? "h-full" : ""}`} aria-hidden={i !== index}>
              {b.link ? (
                <a href={b.link} className={desktop ? "block h-full" : undefined} target="_blank" rel="noopener noreferrer" onClick={(e) => { if (moved.current) e.preventDefault(); }}>{img}</a>
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
