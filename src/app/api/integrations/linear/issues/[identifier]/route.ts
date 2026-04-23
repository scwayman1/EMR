import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";
import { findCodexAgentBriefComment, getLinearIssue } from "@/lib/integrations/linear";

interface RouteContext {
  params: { identifier: string };
}

function toHttpError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return { status: 401, message: "unauthorized" };
    }
    if (error.message === "FORBIDDEN") {
      return { status: 403, message: "forbidden" };
    }
    return { status: 500, message: error.message };
  }

  return { status: 500, message: "Linear integration error" };
}

async function requireLinearIntegrationAccess() {
  const user = await requireUser();
  const canAccess = user.roles.some((role) =>
    role === "operator" || role === "practice_owner" || role === "system",
  );

  if (!canAccess) {
    throw new Error("FORBIDDEN");
  }
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    await requireLinearIntegrationAccess();

    const issue = await getLinearIssue(params.identifier);

    if (!issue) {
      return NextResponse.json(
        { ok: false, error: `Issue ${params.identifier} not found` },
        { status: 404 },
      );
    }

    const codexAgentBrief = findCodexAgentBriefComment(issue);

    return NextResponse.json({
      ok: true,
      issue,
      codexAgentBrief,
    });
  } catch (error) {
    const { status, message } = toHttpError(error);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
