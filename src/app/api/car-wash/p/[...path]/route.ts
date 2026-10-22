import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";

// Thin, allow-listed proxy to the backend's public car wash API (phone verification + self-service manage link).
const ALLOWED = [
  /^\d+\/otp\/(send|verify)$/,
  /^manage\/[A-Za-z0-9-]{16,64}(\/(slots|cancel|reschedule))?$/,
];

async function forward(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const rest = path.join("/");
  if (!ALLOWED.some((re) => re.test(rest))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { search } = new URL(req.url);
  const init: RequestInit = { method: req.method, cache: "no-store" };
  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(apiUrl(`/api/public/car-wash/${rest}${search}`), init);
  return new NextResponse(await res.text(), { status: res.status, headers: { "Content-Type": "application/json" } });
}

export const GET = forward;
export const POST = forward;
