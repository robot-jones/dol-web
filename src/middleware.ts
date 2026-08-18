import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: "/api/(.*)",
};

// Same-origin check, not a shared secret (that can't work in a NEXT_PUBLIC_*
// value the browser sends right back to us). Sec-Fetch-Site is preferred
// (browser-set, can't be overridden by page JS); falls back to comparing
// Origin/Referer for clients that don't send it. A genuine server-to-server
// caller should use a real secret from a non-NEXT_PUBLIC_* env var instead.
export function middleware(request: NextRequest) {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    if (secFetchSite !== "same-origin") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    return NextResponse.next();
  }

  const origin = request.headers.get("origin") || request.headers.get("referer");
  let originIsSameOrigin = false;
  try {
    originIsSameOrigin = !!origin && new URL(origin).origin === request.nextUrl.origin;
  } catch {
    // malformed Origin/Referer header — treat as not same-origin
  }
  if (!originIsSameOrigin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return NextResponse.next();
}
