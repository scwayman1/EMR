// Clerk Middleware — route protection at the edge
//
// This middleware runs on every request when AUTH_PROVIDER=clerk.
// When Clerk is disabled (default), it's a no-op pass-through so the
// existing iron-session flow continues to work unchanged.
//
// Security model:
//   - Public routes: landing, /education, /store, /api/webhooks/*, /share/[token]
//   - Auth routes: /sign-in, /sign-up (redirect away if already logged in)
//   - Protected routes: everything else (require Clerk session)

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const CLERK_ENABLED = process.env.AUTH_PROVIDER === "clerk";

// Public routes — no auth required
const isPublicRoute = createRouteMatcher([
  "/",
  "/about",
  "/security",
  "/pricing",
  "/education",
  "/education/(.*)",
  "/store",
  "/store/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/login", // legacy iron-session
  "/signup", // legacy iron-session
  "/api/webhooks/(.*)",
  "/api/health",
  "/share/(.*)",
]);

// When Clerk is DISABLED, export a pass-through middleware so route
// protection falls back to the layout-level requireUser() checks.
function passThrough(_req: NextRequest) {
  return NextResponse.next();
}

// When Clerk is ENABLED, enforce auth on every non-public route.
const clerkProtect = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  await auth.protect();
});

export default CLERK_ENABLED ? clerkProtect : passThrough;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes
    "/(api|trpc)(.*)",
  ],
};
