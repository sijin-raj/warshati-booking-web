import { NextResponse } from "next/server";

// Calls the car-data service directly: the backend's /api/car/* proxy requires login,
// which a public booking page doesn't have.
const CAR_API = "https://carmeta-api.onrender.com";

// GET /api/car/makes | /api/car/years?make= | /api/car/models?make=&year=
const KINDS = new Set(["makes", "years", "models"]);
const LIST_KEY: Record<string, string> = { makes: "makes", years: "years", models: "models" };

// The car service runs on a free Render instance that can be slow or return an error while it wakes up.
// Only a valid, non-empty answer is remembered — a failed request is never cached, so the next try asks again
// (the previous Next.js fetch cache could keep serving one bad answer for an hour).
const TTL_MS = 60 * 60 * 1000;
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
  const url = `${CAR_API}/${kind}${qs.size ? `?${qs}` : ""}`;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return new NextResponse(hit.body, { headers: { "Content-Type": "application/json" } });
  }

  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const body = await res.text();
    const json = res.ok ? (JSON.parse(body) as Record<string, unknown>) : null;
    const list = json?.[LIST_KEY[kind]];
    if (!Array.isArray(list) || list.length === 0) throw new Error(`bad answer (${res.status})`);
    cache.set(url, { at: Date.now(), body });
    return new NextResponse(body, { headers: { "Content-Type": "application/json" } });
  } catch {
    return NextResponse.json({ error: "Car data unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
