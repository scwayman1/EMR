"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "./session";
import { hashPassword, verifyPassword } from "./password";
import { ROLE_HOME, primaryRole } from "@/lib/rbac/roles";
import { loginLimiter, signupLimiter } from "./rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signupSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function loginAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  // Rate limit by IP + email to prevent brute force
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const emailRaw = (formData.get("email") as string)?.toLowerCase() ?? "";
  const rl = loginLimiter.check(`${ip}:${emailRaw}`);
  if (!rl.allowed) {
    const waitMin = Math.ceil((rl.resetAt - Date.now()) / 60000);
    return { ok: false, error: `Too many login attempts. Please try again in ${waitMin} minute${waitMin === 1 ? "" : "s"}.` };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please enter a valid email and password." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { memberships: true },
  });
  if (!user) return { ok: false, error: "Invalid email or password." };

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return { ok: false, error: "Invalid email or password." };

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const role = primaryRole(user.memberships.map((m) => m.role));
  redirect(ROLE_HOME[role]);
}

export async function signupAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  // Rate limit by IP to prevent account spam
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = signupLimiter.check(ip);
  if (!rl.allowed) {
    const waitMin = Math.ceil((rl.resetAt - Date.now()) / 60000);
    return { ok: false, error: `Too many signup attempts. Please try again in ${waitMin} minute${waitMin === 1 ? "" : "s"}.` };
  }

  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fill every field. Password must be 8+ characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (existing) return { ok: false, error: "An account with that email already exists." };

  const passwordHash = await hashPassword(parsed.data.password);

  // Self-signups go to the default org. In multi-tenant production, this should
  // be determined by the signup URL (e.g. signup?org=slug) or invitation link.
  // For now, use SIGNUP_DEFAULT_ORG_SLUG env var, falling back to first org.
  const orgSlug = process.env.SIGNUP_DEFAULT_ORG_SLUG;
  const org = orgSlug
    ? await prisma.organization.findUnique({ where: { slug: orgSlug } })
    : await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) {
    return { ok: false, error: "No organization available for signup. Please contact support." };
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      memberships: { create: { organizationId: org.id, role: "patient" } },
      patientProfile: {
        create: {
          organizationId: org.id,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email.toLowerCase(),
          status: "prospect",
        },
      },
    },
  });

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  redirect(ROLE_HOME.patient);
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
