import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, validSession, developmentBypass } from "./lib/session";
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/access" || pathname === "/api/access")
    return NextResponse.next();
  if (
    developmentBypass() ||
    (await validSession(
      request.cookies.get(SESSION_COOKIE)?.value,
      process.env.SESSION_SECRET,
    ))
  )
    return NextResponse.next();
  if (pathname.startsWith("/api/"))
    return NextResponse.json(
      { error: "Enter the shared password to continue." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const url = new URL("/access", request.url);
  url.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
