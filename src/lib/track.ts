// dataLayer helpers for GTM. Every event pushed here is a named Custom Event that GTM triggers can match.
type Params = Record<string, unknown>;
declare global { interface Window { dataLayer?: Params[] } }

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined") return;
  (window.dataLayer = window.dataLayer || []).push({ event, ...params });
}

/**
 * OpenAI ads conversion for a confirmed booking. Pass `key` (unique per booking) wherever the same booking can be
 * seen again, e.g. a reload of the payment return page, so it is only counted once in this browser.
 */
export function measureAppointment(key?: string) {
  if (typeof window === "undefined") return;
  if (key) {
    const storageKey = `lezof-conversion:${key}`;
    try {
      if (window.localStorage.getItem(storageKey)) return;
      window.localStorage.setItem(storageKey, "1");
    } catch { /* storage blocked — still count the booking */ }
  }
  const w = window as unknown as { oaiq?: (...args: unknown[]) => void };
  w.oaiq?.("measure", "appointment_scheduled", { type: "customer_action" });
}

async function sha256(value: string): Promise<string | undefined> {
  if (!value || typeof crypto === "undefined" || !crypto.subtle) return undefined;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Sign-up (completed booking). Email, phone and first name are normalised then SHA-256 hashed, as Snapchat expects. */
export async function trackSignUp(user: { name: string; email?: string; phone?: string | null }, extra: Params = {}) {
  try {
    const first = user.name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    const [firstHash, emailHash, phoneHash] = await Promise.all([
      sha256(first),
      sha256((user.email ?? "").trim().toLowerCase()),
      sha256((user.phone ?? "").replace(/[^\d]/g, "")), // E.164 digits without "+"
    ]);
    track("sign_up", { user_data: { first_name_sha256: firstHash, email_sha256: emailHash, phone_sha256: phoneHash }, ...extra });
  } catch {
    track("sign_up", extra);
  }
}
