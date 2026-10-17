// Customer phone validation — keep in sync with parsePhone() in the backend's
// services/twilio.service.ts. Saudi mobiles: 05XXXXXXXX, 5XXXXXXXX,
// 9665XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX. Any other country needs an
// explicit + (or 00) prefix and 8–15 digits.

/** Clean E.164 number, or null if this can't be a real WhatsApp-reachable mobile. */
export function parsePhone(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+") || raw.replace(/\D/g, "").startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^05\d{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `+966${digits}`;
  if (digits.startsWith("966")) return /^9665\d{8}$/.test(digits) ? `+${digits}` : null;
  if (hasPlus && /^[1-9]\d{7,14}$/.test(digits)) return `+${digits}`;
  return null;
}
