import { NextResponse } from "next/server";

import { apiUrl } from "@/lib/api";

// Asks our backend first (public, per-branch): it returns the car-data service's lists plus the models
// the garage added itself. If the backend is unreachable we fall back to the car-data service directly,
// so a customer can still book.
const CAR_API = "https://carmeta-api.onrender.com";

// GET /api/car/makes | /api/car/years?make= | /api/car/models?make=&year=
const KINDS = new Set(["makes", "years", "models"]);
const LIST_KEY: Record<string, string> = { makes: "makes", years: "years", models: "models" };

// The car service runs on a free Render instance that can be slow or return an error while it wakes up.
// Only a valid, non-empty answer is remembered — a failed request is never cached, so the next try asks again
// (the previous Next.js fetch cache could keep serving one bad answer for an hour).
// Short, so a model the garage just added shows up on the booking page within a minute.
const TTL_MS = 60 * 1000;
const cache = new Map<string, { at: number; body: string }>();

export async function GET(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!KINDS.has(kind)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { searchParams } = new URL(req.url);
  const qs = new URLSearchParams();
  for (const key of ["make", "year"]) {
    const v = searchParams.get(key);
    if (v) qs.set(key, v);
  }
  const garageId = searchParams.get("garageId");
  const query = qs.size ? `?${qs}` : "";
  const ownUrl = garageId && /^\d+$/.test(garageId) ? apiUrl(`/api/public/booking/${garageId}/car/${kind}${query}`) : null;
  const url = `${CAR_API}/${kind}${query}`;
  const cacheKey = `${garageId ?? ""}|${url}`;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return new NextResponse(hit.body, { headers: { "Content-Type": "application/json" } });
  }

  try {
    let body = "";
    let list: unknown;
    for (const target of ownUrl ? [ownUrl, url] : [url]) {
      try {
        const res = await fetch(target, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
        const text = await res.text();
        const json = res.ok ? (JSON.parse(text) as Record<string, unknown>) : null;
        const candidate = json?.[LIST_KEY[kind]];
        if (Array.isArray(candidate) && candidate.length > 0) { body = text; list = candidate; break; }
      } catch { /* try the next source */ }
    }
    if (!Array.isArray(list)) throw new Error("bad answer");
    cache.set(cacheKey, { at: Date.now(), body });
    return new NextResponse(body, { headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "Car data unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
