"use server";

import { prisma } from "@/lib/db/prisma";

export interface DemoRequestResult {
  ok: boolean;
  error?: string;
}

export async function requestDemoAction(
  _prev: DemoRequestResult | null,
  formData: FormData,
): Promise<DemoRequestResult> {
  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const practice = (formData.get("practice") as string)?.trim() || null;

  if (!firstName || !lastName || !email) {
    return { ok: false, error: "Please fill in all required fields." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  // Check if this email already submitted a request
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, error: "This email is already registered. Try signing in instead." };
  }

  // Store the demo request — create a user with empty passwordHash.
  // Empty hash = can't log in until an admin sets a real password.
  // This gives the team a queue of demo requests to approve.
  try {
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash: "", // empty = can't authenticate until approved
      },
    });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return { ok: false, error: "This email is already registered." };
    }
    console.error("[demo-request] error:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  return { ok: true };
}
