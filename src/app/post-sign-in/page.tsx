import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { homeForRoles } from "@/lib/rbac/roles";

export const metadata = { title: "Signing you in…" };

// Disable caching so every post-auth visit re-evaluates the user's role.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Post-sign-in landing — single source of truth for "where does this user go
// after Clerk finishes authenticating them?" Previously the Clerk widget
// hard-coded /portal as the redirect target, which forced every role
// (practice_owner, super_admin, etc.) to bounce through the patient layout's
// reject-and-redirect logic. That bounce relied on `user.roles[0]`, which
// orders by membership creation date — not by privilege — so multi-role users
// could land in the wrong shell and trip the (auth) group's missing
// error.tsx, surfacing global-error.tsx ("Something went wrong").
//
// Landing uses `homeForRoles` (→ `landingRole`), which prefers the surface a
// user actually works in. A clinician who also carries an admin role lands on
// /clinic, not the Practice Onboarding wizard.
export default async function PostSignInPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  redirect(homeForRoles(user.roles));
}
