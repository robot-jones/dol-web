import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: "/api/(.*)",
};

// These routes are only meant to be called by this app's own frontend, so
// rather than a shared "secret" (which can't actually be one when it ships
// inside a NEXT_PUBLIC_* value the browser sends right back to us — see
// PUNCHLIST.md Finding 2), we verify the request actually originated from
// this app: same-origin, not a third party replaying a captured request.
//
// `Sec-Fetch-Site` is set by the browser itself and can't be overridden by
// page JS, so it's preferred when present. Falls back to comparing
// Origin/Referer against this request's own resolved origin for clients
// that don't send it — which also means this works correctly in every
// environment (localhost, preview, production) without a hardcoded app URL.
//
// If a genuine server-to-server caller (e.g. dol-bot) ever needs to call
// these routes directly, that should be a real secret read from a
// non-NEXT_PUBLIC_* env var and checked as an alternate path here — not
// bolted onto this same-origin check.
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
