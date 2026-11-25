import { NextResponse, type NextRequest } from "next/server";

// The manage link (/manage/<token>) lets anyone holding it change the booking, and the page loads third-party
// tags (GTM, ads pixel) that can read the address. So the token is moved into an httpOnly cookie and the browser
// is redirected to /manage?ref=<ref> before any page, and therefore any script, is loaded.
export const config = { matcher: "/manage/:token" };

export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const token = url.pathname.split("/")[2] ?? "";
  url.pathname = "/manage"; // the query (MyFatoorah's paymentId) is kept
  if (!/^[A-Za-z0-9-]{16,64}$/.test(token)) return NextResponse.redirect(url);

  // One cookie per booking, so a second booking's link doesn't replace the first. The ref can't be turned back into the token.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const ref = Array.from(new Uint8Array(digest).slice(0, 8), (b) => b.toString(16).padStart(2, "0")).join("");
  url.searchParams.set("ref", ref);

  const response = NextResponse.redirect(url);
  response.cookies.set(`lezof-manage-${ref}`, token, {
    httpOnly: true,
    sameSite: "lax", // still sent when the customer comes back from the payment page
    secure: url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
    path: "/manage",
    maxAge: 180 * 86400,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
