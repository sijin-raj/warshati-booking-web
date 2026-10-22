import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

// POST /api/car-wash/book?garageId=1 → books a car wash slot on the backend (re-validated server-side).
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const garageId = searchParams.get("garageId") ?? "";
  if (!/^\d+$/.test(garageId)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const allowed = ["customerName", "customerPhone", "plateNumber", "vehicleMake", "vehicleModel", "serviceId", "slot", "notes", "lang", "verifyToken"];
  const payload = Object.fromEntries(allowed.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));
  const res = await fetch(apiUrl(`/api/public/car-wash/${garageId}/book`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return new NextResponse(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}
