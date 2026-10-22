import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

// GET /api/car-wash/slots?garageId=1&date=2026-10-23 → car wash start times for that day
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const garageId = searchParams.get("garageId") ?? "";
  const date = searchParams.get("date") ?? "";
  if (!/^\d+$/.test(garageId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const serviceId = searchParams.get("serviceId") ?? "";
  const qs = /^\d+$/.test(serviceId) ? `&serviceId=${serviceId}` : "";
  const res = await fetch(apiUrl(`/api/public/car-wash/${garageId}/slots?date=${date}${qs}`), { cache: "no-store" });
  return new NextResponse(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}
