import { NextResponse, type NextRequest } from "next/server";
import { checkStagingAccess } from "./security/staging-access";

export function proxy(request: NextRequest) {
  // Only this exact read-only endpoint is public; no customer or schedule data.
  if (request.nextUrl.pathname === "/api/health" && ["GET", "HEAD"].includes(request.method)) {
    return NextResponse.next();
  }
  const access = checkStagingAccess(request.headers.get("authorization"));
  if (access === "unconfigured") {
    return new NextResponse("Staging access is not configured.", {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  if (access === "unauthorized") {
    return new NextResponse("Authentication required.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Mini-ERP staging", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = { matcher: "/:path*" };
