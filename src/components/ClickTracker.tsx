"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/** Pushes a `ui_click` dataLayer event for every button/link click, with readable fields (Tailwind classes are useless to GTM). */
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("button, a, [role=button]");
      if (!el) return;
      const label = (el.getAttribute("data-track") || el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const href = el instanceof HTMLAnchorElement ? el.href : undefined;
      track("ui_click", {
        click_label: label,
        click_type: href?.startsWith("tel:") ? "call" : href?.includes("wa.me") || href?.includes("whatsapp") ? "whatsapp" : el.tagName.toLowerCase(),
        click_url: href,
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
