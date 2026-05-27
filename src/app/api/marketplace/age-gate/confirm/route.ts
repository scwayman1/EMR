import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { computeAgeYears } from "@/server/marketplace/age-gate";

function asSafeRedirect(path: string | null): string {
  if (!path) return "/portal/shop";
  if (!path.startsWith("/")) return "/portal/shop";
  return path;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const dobInput = String(formData.get("dob") ?? "").trim();
  const redirectTo = asSafeRedirect(String(formData.get("redirectTo") ?? ""));

  const dob = dobInput ? new Date(`${dobInput}T00:00:00.000Z`) : null;
  if (!dob || Number.isNaN(dob.getTime())) {
    return NextResponse.redirect(new URL(`${redirectTo}?ageGate=invalid_dob`, req.url));
  }

  const age = computeAgeYears(dob);
  await prisma.patient.updateMany({
    where: { userId: user.id },
    data: {
      dateOfBirth: dob,
      ageVerifiedAt: age >= 21 ? new Date() : null,
    },
  });

  if (age < 21) {
    return NextResponse.redirect(new URL(`${redirectTo}?ageGate=underage`, req.url));
  }

  const cookieStore = await cookies();
  cookieStore.set("marketplace_age_verified_21", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.redirect(new URL(redirectTo, req.url));
}
