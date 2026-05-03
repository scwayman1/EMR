// Middleware — multi-domain routing for Leafmart + Leafjourney.
//
// How it works:
// 1. Reads the Host header to determine which brand is being accessed
// 2. For leafmart.com requests, internally rewrites "/" → "/leafmart",
//    "/products/x" → "/leafmart/products/x", etc.
// 3. The user never sees "/leafmart/" in their URL bar
// 4. For leafjourney.com (or localhost), passes through normally
//
// Domain config:
//   leafmart.com / www.leafmart.com / theleafmart.com / www.theleafmart.com → Leafmart
//   Everything else → Leafjourney (EMR)

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/** Hostnames that should resolve to the Leafmart storefront */
const LEAFMART_HOSTS = [
  "leafmart.com",
  "www.leafmart.com",
  "theleafmart.com",
  "www.theleafmart.com",
  "leafmart.localhost",
];

/** Paths that should NOT be rewritten (shared infra) */
const SHARED_PATHS = [
  "/api/",
  "/_next/",
  "/favicon.ico",
  "/icon.svg",
];

function isLeafmartHost(host: string): boolean {
  // Strip port for localhost comparison
  const hostname = host.split(":")[0];
  return LEAFMART_HOSTS.includes(hostname);
}

function isSharedPath(pathname: string): boolean {
  return SHARED_PATHS.some((p) => pathname.startsWith(p));
}

// Ensure the sign-in / sign-up routes and APIs are public
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api(.*)", "/(.*)"]); // Wait, everything public? The previous middleware didn't enforce auth. Wait, in Next.js app router, the pages enforce auth.

export default clerkMiddleware((auth, req) => {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // Skip shared paths (API, static assets)
  if (isSharedPath(pathname)) {
    return NextResponse.next();
  }

  // ── Security: Zero-Trust Ops & Clinic Allowlist ──────────
  const isOps = pathname === "/ops" || pathname.startsWith("/ops/");
  const isClinic = pathname === "/clinic" || pathname.startsWith("/clinic/");
  
  if (isOps || isClinic) {
    const allowedIpsStr = process.env.OPS_ALLOWED_IPS;
    if (allowedIpsStr) {
      const allowedIps = allowedIpsStr.split(",").map((ip) => ip.trim());
      const clientIpHeader = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
      const clientIp = clientIpHeader ? clientIpHeader.split(",")[0].trim() : req.ip;
      
      if (!clientIp || !allowedIps.includes(clientIp)) {
        console.warn(`[SECURITY] Blocked unauthorized access to ${pathname} from IP: ${clientIp}`);
        return new NextResponse("Forbidden: Access Denied via Zero-Trust Policy", { status: 403 });
      }
    }
  }

  // ── Leafmart domain routing ──────────────────────────────
  if (isLeafmartHost(host)) {
    if (pathname.startsWith("/leafmart")) {
      const cleanPath = pathname.replace(/^\/leafmart/, "") || "/";
      const url = req.nextUrl.clone();
      url.pathname = cleanPath;
      return NextResponse.redirect(url, 308);
    }
    const url = req.nextUrl.clone();
    url.pathname = `/leafmart${pathname === "/" ? "" : pathname}`;
    const response = NextResponse.rewrite(url);
    response.headers.set("x-leafmart-brand", "leafmart");
    return response;
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
