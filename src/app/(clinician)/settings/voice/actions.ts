"use server";

/**
 * Voice enrollment server actions — stub.
 *
 * The real pipeline will:
 *   1. startEnrollment → allocate a row in "pending"
 *   2. client records audio, uploads via recordSample
 *   3. recordSample → upload sample to S3, call speaker-recognition
 *      provider to generate an embedding, stash the provider ID in
 *      embeddingRef, flip status to "enrolled" or "failed"
 *
 * Tonight we only stand up step 1 and a no-op step 2 so the UI /
 * data-model scaffolding can land without waiting on provider
 * credentials. When AssemblyAI / Azure land, the contract here does
 * not change — swap the body of recordSample.
 */

import type { VoiceEnrollment } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";

export type StartEnrollmentResult =
  | { ok: true; enrollment: VoiceEnrollment }
  | { ok: false; error: string };

export type RecordSampleResult =
  | { ok: true; enrollment: VoiceEnrollment }
  | { ok: false; error: string };

/**
 * Create (or reuse) a pending enrollment row for (userId, currentOrg).
 * Scoped to the caller's organization: you can only enroll yourself
 * or, later, another user inside your own org.
 */
export async function startEnrollment(
  userId: string,
): Promise<StartEnrollmentResult> {
  try {
    const caller = await requireUser();
    if (!caller.organizationId) {
      return { ok: false, error: "No active organization." };
    }

    // Callers can only start enrollment for themselves. A future
    // admin flow can relax this once we have an RBAC scope for it.
    if (caller.id !== userId) {
      return { ok: false, error: "You can only enroll your own voice." };
    }

    const enrollment = await prisma.voiceEnrollment.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId: caller.organizationId,
        },
      },
      create: {
        userId,
        organizationId: caller.organizationId,
        status: "pending",
      },
      update: {
        // Re-opening a failed enrollment should put the user back
        // into the pending state so they can try again. Enrolled
        // users stay enrolled (idempotent no-op for them).
        status: "pending",
      },
    });

    return { ok: true, enrollment };
  } catch (err) {
    console.error("[startEnrollment]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to start enrollment.",
    };
  }
}

/**
 * Receive a base64-encoded audio sample from the client and mark the
 * enrollment complete. Today this is a no-op — we don't upload to S3
 * and we don't call a speaker-recognition provider. We just flip the
 * row to "enrolled" with enrolledAt=now so downstream code can test
 * against isEnrolled().
 *
 * The audioBase64 param is validated for basic shape but otherwise
 * discarded. When the real storage layer lands, this is where we
 * decode → upload → call provider → populate sampleAudioUrl +
 * embeddingRef.
 */
export async function recordSample(
  userId: string,
  audioBase64: string,
): Promise<RecordSampleResult> {
  try {
    const caller = await requireUser();
    if (!caller.organizationId) {
      return { ok: false, error: "No active organization." };
    }

    if (caller.id !== userId) {
      return { ok: false, error: "You can only enroll your own voice." };
    }

    // Basic sanity — a real sample is many KB. Anything shorter is
    // almost certainly a mistake (empty string, truncated upload).
    // We don't decode, just refuse obviously-empty payloads so the
    // row doesn't flip to "enrolled" on an empty recording.
    if (typeof audioBase64 !== "string" || audioBase64.length < 32) {
      return { ok: false, error: "Audio sample is empty or too short." };
    }

    const existing = await prisma.voiceEnrollment.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: caller.organizationId,
        },
      },
    });

    if (!existing) {
      return {
        ok: false,
        error: "No enrollment in progress. Call startEnrollment first.",
      };
    }

    const enrollment = await prisma.voiceEnrollment.update({
      where: { id: existing.id },
      data: {
        status: "enrolled",
        enrolledAt: new Date(),
        // sampleAudioUrl + embeddingRef stay null until the real
        // storage + provider integrations land.
      },
    });

    return { ok: true, enrollment };
  } catch (err) {
    console.error("[recordSample]", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to record sample.",
    };
  }
}
