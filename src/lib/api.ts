// Server-side access to the Garage Manager backend's public booking API.
// API_URL is read on the server only; the browser talks to this app's own
// /api/* routes (see src/app/api), so no CORS setup is needed on the backend.

const API_BASE = (process.env.API_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export interface BookingService {
  id: number;
  name: string;
  description: string | null;
  unitPrice: string;
  /** Arabic name set by the garage; null/absent = use `name`. */
  nameAr?: string | null;
  /** The garage's uploaded icon for this service, if any. */
  imageUrl?: string | null;
}

export interface FieldRule {
  visible?: boolean;
  required?: boolean;
  label?: string;
}

export interface BookingConfig {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  workingHours: { start: string; end: string };
  services: BookingService[];
  form: {
    title: string | null;
    submitLabel: string | null;
    fields: Record<string, FieldRule>;
  };
}

export async function fetchBookingConfig(garageId: string): Promise<BookingConfig | null> {
  const res = await fetch(apiUrl(`/api/public/booking/${encodeURIComponent(garageId)}/config`), { cache: "no-store" });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<BookingConfig>;
}

export interface CarWashInfo {
  garageName: string;
  daysAhead: number;
  vatRate: number;
  /** True when the customer must confirm their phone with a WhatsApp code before booking. */
  verifyPhone?: boolean;
  services: { id: number; name: string; nameAr: string | null; price: number; durationMin: number }[];
}

export async function fetchCarWashInfo(garageId: string): Promise<CarWashInfo | null> {
  const res = await fetch(apiUrl(`/api/public/car-wash/${encodeURIComponent(garageId)}/info`), { cache: "no-store" });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<CarWashInfo>;
}
