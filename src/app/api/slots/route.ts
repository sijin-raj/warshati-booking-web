import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

// GET /api/slots?garageId=2&date=2026-10-08 → free time slots for that day
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const garageId = searchParams.get("garageId") ?? "";
  const date = searchParams.get("date") ?? "";
  if (!/^\d+$/.test(garageId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const res = await fetch(apiUrl(`/api/public/booking/${garageId}/slots?date=${date}`), { cache: "no-store" });
  return new NextResponse(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}
