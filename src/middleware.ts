// Middleware — pass-through.
//
// Clerk was scaffolded in an earlier commit but is not yet wired in prod
// (AUTH_PROVIDER=iron-session). The previous version imported Clerk at the
// top of this file, which forced @clerk/nextjs to initialize during Next.js
// boot — combined with the Clerk v7 / Next 14 peer-dep mismatch, this was
// causing the web server to fail to bind a port on Render, triggering
// "Timed out while running your code" deploy cancellations.
//
// Until Clerk is actually enabled, keep this file Clerk-free. Route
// protection continues to live at the layout level via `requireUser()`.
//
// To re-enable Clerk later:
//   1. Ensure @clerk/nextjs is compatible with the installed Next version
//   2. Restore the clerkMiddleware + createRouteMatcher wiring
//   3. Guard the Clerk import behind `AUTH_PROVIDER === "clerk"` via dynamic import

import { NextResponse, type NextRequest } from "next/server";

export default function middleware(_req: NextRequest) {
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
