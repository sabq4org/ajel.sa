import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-change-me-32chars-aaaa"
);
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "ajel_session";

const PROTECTED_PREFIXES = ["/admin"];
const ADMIN_ONLY_API_METHODS = ["POST", "PATCH", "PUT", "DELETE"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin pages
  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (needsAuth) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      // Allow accessing admin without auth for now (during initial setup)
      // In production, uncomment:
      // const url = req.nextUrl.clone();
      // url.pathname = "/login";
      // url.searchParams.set("callbackUrl", pathname);
      // return NextResponse.redirect(url);
      return NextResponse.next();
    }

    try {
      await jwtVerify(token, SECRET);
    } catch {
      // Invalid session
      // const url = req.nextUrl.clone();
      // url.pathname = "/login";
      // return NextResponse.redirect(url);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/articles/:path*"],
};
