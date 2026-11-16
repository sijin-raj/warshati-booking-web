import { NextResponse } from "next/server";

// Brand logos come from a third-party image host. Serving them through this site means the customer's phone
// only ever talks to book.lezof.com (no blocked or slow foreign host, no hotlink rules), and they are cached for a year.
const ALLOWED_HOSTS = new Set(["cdn.tyresaddict.com"]);
const cache = new Map<string, { type: string; body: ArrayBuffer }>();

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src") ?? "";
  let url: URL;
  try { url = new URL(src); } catch { return NextResponse.json({ error: "Bad logo" }, { status: 400 }); }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) return NextResponse.json({ error: "Logo host not allowed" }, { status: 400 });

  const key = url.toString();
  let hit = cache.get(key);
  if (!hit) {
    try {
      const res = await fetch(key, { signal: AbortSignal.timeout(10_000) });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/")) return NextResponse.json({ error: "Logo not found" }, { status: 404 });
      hit = { type, body: await res.arrayBuffer() };
      if (cache.size < 500) cache.set(key, hit);
    } catch {
      return NextResponse.json({ error: "Logo unavailable" }, { status: 502 });
    }
  }
  return new NextResponse(hit.body, { headers: { "Content-Type": hit.type, "Cache-Control": "public, max-age=31536000, immutable" } });
}
