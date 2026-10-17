import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

// POST /api/book?garageId=2 → creates the booking on the backend (public endpoint,
// which validates working hours and the phone number again server-side).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const garageId = searchParams.get("garageId") ?? "";
  if (!/^\d+$/.test(garageId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Only forward the fields a customer may set.
  const allowed = ["customerName", "customerPhone", "customerEmail", "vehicleBrand", "vehicleYear", "vehicleModel", "plateNumber", "serviceType", "notes", "preferredDate"];
  const payload = Object.fromEntries(allowed.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

  const res = await fetch(apiUrl(`/api/public/bookings?garageId=${garageId}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  return new NextResponse(text, { status: res.status, headers: { "Content-Type": "application/json" } });
}
