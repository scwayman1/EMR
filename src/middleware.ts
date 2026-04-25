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
//   leafmart.com / www.leafmart.com / leafmart.localhost → Leafmart
//   Everything else → Leafjourney (EMR)

import { NextResponse, type NextRequest } from "next/server";

/** Hostnames that should resolve to the Leafmart storefront */
const LEAFMART_HOSTS = [
  "leafmart.com",
  "www.leafmart.com",
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

export default function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // Skip shared paths (API, static assets)
  if (isSharedPath(pathname)) {
    return NextResponse.next();
  }

  // ── Leafmart domain routing ──────────────────────────────
  // When accessed via leafmart.com, rewrite all paths to /leafmart/*
  // so the user sees clean URLs (leafmart.com/products/x instead of
  // leafmart.com/leafmart/products/x)
  if (isLeafmartHost(host)) {
    // Already on a /leafmart path? Strip the prefix to avoid double-nesting
    if (pathname.startsWith("/leafmart")) {
      // /leafmart/products/x → /products/x (redirect to clean URL)
      const cleanPath = pathname.replace(/^\/leafmart/, "") || "/";
      const url = req.nextUrl.clone();
      url.pathname = cleanPath;
      return NextResponse.redirect(url, 308);
    }

    // Rewrite clean URL to internal /leafmart/* route
    const url = req.nextUrl.clone();
    url.pathname = `/leafmart${pathname === "/" ? "" : pathname}`;

    const response = NextResponse.rewrite(url);
    // Set brand header so components can detect which domain they're on
    response.headers.set("x-leafmart-brand", "leafmart");
    return response;
  }

  // ── Leafjourney (default) ────────────────────────────────
  // Pass through normally — the EMR routes are at the root
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes
    "/(api|trpc)(.*)",
  ],
};
