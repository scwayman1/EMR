import { PrismaClient, Role } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const prisma = new PrismaClient();

function printUsage() {
  console.log(`
Usage:
  npx tsx scripts/invite-member.ts --email <email> --firstName <first> --lastName <last> --orgId <orgId> --role <role> [--title <title>] [--specialty <specialty>]

Roles:
  clinician, practice_admin, operator, practice_owner

Example:
  npx tsx scripts/invite-member.ts --email doctor.jones@example.com --firstName Indiana --lastName Jones --orgId cmo37j43p0005l82qil6xx0ve --role clinician --title "MD, Orthopedic Surgery" --specialty "pain-management-non-cannabis"
`);
}

async function main() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, "");
    const val = args[i + 1];
    if (key && val) {
      params[key] = val;
    }
  }

  const { email, firstName, lastName, orgId, role, title, specialty } = params;

  if (!email || !firstName || !lastName || !orgId || !role) {
    printUsage();
    process.exit(1);
  }

  // Validate Role
  const validRoles = ["clinician", "practice_admin", "operator", "practice_owner"];
  if (!validRoles.includes(role)) {
    console.error(`❌ Invalid role "${role}". Allowed roles: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  // Find organization
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });
  if (!organization) {
    console.error(`❌ Organization with ID "${orgId}" not found in database.`);
    process.exit(1);
  }

  console.log(`Inviting ${firstName} ${lastName} (${email}) to "${organization.name}" as ${role}...`);

  let clerkId: string | null = null;
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (clerkSecretKey && process.env.AUTH_PROVIDER === "clerk") {
    console.log("Syncing user to Clerk directory...");
    const clerk = createClerkClient({ secretKey: clerkSecretKey });
    try {
      const existingUsers = await clerk.users.getUserList({ emailAddress: [email] });
      if (existingUsers.data.length > 0) {
        clerkId = existingUsers.data[0].id;
        console.log(`  User already exists in Clerk (Clerk ID: ${clerkId})`);
      } else {
        const newUser = await clerk.users.createUser({
          emailAddress: [email],
          firstName,
          lastName,
          skipPasswordChecks: true,
          skipPasswordRequirement: true,
        });
        clerkId = newUser.id;
        console.log(`  Created user in Clerk (Clerk ID: ${clerkId})`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Clerk API operation failed: ${err.message || err}. Proceeding with database provisioning...`);
    }
  } else {
    console.log("Clerk integration not active or CLERK_SECRET_KEY not set. Provisioning local DB user only.");
  }

  // 1. Create or update User in Prisma
  const dbUser = await prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      clerkId: clerkId || undefined,
    },
    create: {
      email,
      firstName,
      lastName,
      clerkId,
      passwordHash: "", // Unused for Clerk-authenticated users
    },
  });
  console.log(`✓ User record created/updated in Prisma (ID: ${dbUser.id}).`);

  // 2. Create Membership link
  const prismaRole = role as Role;
  await prisma.membership.upsert({
    where: {
      userId_organizationId_role: {
        userId: dbUser.id,
        organizationId: orgId,
        role: prismaRole,
      },
    },
    update: {},
    create: {
      userId: dbUser.id,
      organizationId: orgId,
      role: prismaRole,
    },
  });
  console.log(`✓ Membership record granted in Prisma.`);

  // 3. If clinician, create Provider record
  if (role === "clinician") {
    await prisma.provider.upsert({
      where: { userId: dbUser.id },
      update: {
        organizationId: orgId,
        title: title || undefined,
        specialties: specialty ? [specialty] : undefined,
        active: true,
      },
      create: {
        userId: dbUser.id,
        organizationId: orgId,
        title: title || null,
        specialties: specialty ? [specialty] : [],
        active: true,
      },
    });
    console.log(`✓ Provider record created/updated in Prisma.`);
  }

  console.log(`\n🎉 Success! ${firstName} ${lastName} has been successfully invited and linked to "${organization.name}".`);
}

main()
  .catch((e) => {
    console.error("Operation failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
