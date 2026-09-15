import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Safe, edge-compatible JWT payload decoding without Node.js dependencies
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// Routes that require teacher or assistant access
const TEACHER_ROUTES = [
  "/dashboard",
  "/students",
  "/classes",
  "/groups",
  "/attendance",
  "/exams",
  "/payments",
  "/cards",
  "/users",
  "/blocked",
  "/trash",
  "/settings",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read the session token and role from cookies
  const sessionCookie = request.cookies.get("__session")?.value;
  let role = request.cookies.get("user_role")?.value;

  // If role is not directly in cookie, decode it safely from the session JWT
  if (sessionCookie && !role) {
    const decoded = decodeJwtPayload(sessionCookie);
    if (decoded) {
      role = (decoded.role as string) || "teacher";
    }
  }

  const isAuthenticated = !!sessionCookie;

  const isTeacherRoute = TEACHER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isSuperAdminRoute =
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/super-admin" ||
    pathname.startsWith("/super-admin/");
  const isLoginPage = pathname === "/login";

  // 1. Unauthenticated users trying to access protected routes -> redirect to /login
  if (!isAuthenticated && (isTeacherRoute || isSuperAdminRoute)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users trying to access /login or / -> redirect to their designated dashboard
  if (isAuthenticated && (isLoginPage || pathname === "/")) {
    if (role === "super_admin") {
      return NextResponse.redirect(new URL("/super-admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Role-based protection: non-super_admin trying to access super_admin routes -> redirect to /dashboard
  if (isAuthenticated && isSuperAdminRoute && role !== "super_admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (/api/*)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (assets, svgs, images)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
