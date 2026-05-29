/**
 * Revoke a stray super_admin grant from an account.
 *
 * Background: the bootstrap allowlist (SUPER_ADMIN_BOOTSTRAP_EMAILS) can
 * silently grant super_admin to any listed email on first admin-surface hit.
 * A clinician demo login picked one up, which routed it into Practice
 * Onboarding instead of /clinic. The code is now hardened to never escalate
 * clinical/end-user accounts, but any *existing* stray grant must be cleaned
 * up explicitly — that's what this script does.
 *
 * Usage:
 *   # Preview (no writes):
 *   tsx --conditions=react-server scripts/revoke-super-admin.ts clinician@demo.health
 *
 *   # Actually revoke:
 *   tsx --conditions=react-server scripts/revoke-super-admin.ts clinician@demo.health --apply
 *
 * Safe by default: prints what it would do and exits unless --apply is passed.
 */

import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

async function main() {
  config({ path: ".env.local" });
  config({ path: ".env" });

  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();

  if (!email) {
    console.error(
      "Usage: tsx scripts/revoke-super-admin.ts <email> [--apply]",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        memberships: {
          select: { id: true, role: true, organizationId: true },
        },
      },
    });

    if (!user) {
      console.error(`✗ No user found with email "${email}".`);
      process.exit(1);
    }

    const superAdminMemberships = user.memberships.filter(
      (m) => m.role === "super_admin",
    );

    console.log(`User: ${user.email} (${user.id})`);
    console.log(
      `Roles: ${user.memberships.map((m) => m.role).join(", ") || "(none)"}`,
    );

    if (superAdminMemberships.length === 0) {
      console.log("✓ No super_admin membership to revoke. Nothing to do.");
      return;
    }

    console.log(
      `Found ${superAdminMemberships.length} super_admin membership(s): ` +
        superAdminMemberships.map((m) => m.organizationId).join(", "),
    );

    if (!apply) {
      console.log(
        "\nDRY RUN — no changes made. Re-run with --apply to revoke.",
      );
      return;
    }

    const result = await prisma.membership.deleteMany({
      where: { userId: user.id, role: "super_admin" },
    });
    console.log(`✓ Revoked ${result.count} super_admin membership(s).`);
    console.log(
      "Reminder: also remove this email from SUPER_ADMIN_BOOTSTRAP_EMAILS " +
        "(and set SUPER_ADMIN_BOOTSTRAP_ENABLED=0) so it is not re-granted.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
