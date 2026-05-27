import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock prisma before importing the module under test so the loader sees the
// mock instead of a real PrismaClient. vi.mock is hoisted; vi.hoisted keeps
// the mock object reachable from the factory.
const hoisted = vi.hoisted(() => {
  const mockPrisma = {
    agentJob: {
      findMany: vi.fn(),
    },
  };
  return { mockPrisma };
});

vi.mock("@/lib/db/prisma", () => ({
  prisma: hoisted.mockPrisma,
}));

import {
  getActiveAgentActivity,
  indexActivityByHref,
} from "./nav-agent-activity";

beforeEach(() => {
  hoisted.mockPrisma.agentJob.findMany.mockReset();
});

describe("getActiveAgentActivity", () => {
  it("returns [] when organizationId is empty without hitting the DB", async () => {
    const out = await getActiveAgentActivity("");
    expect(out).toEqual([]);
    expect(hoisted.mockPrisma.agentJob.findMany).not.toHaveBeenCalled();
  });

  it("returns [] when there are no running jobs (empty-result safety)", async () => {
    hoisted.mockPrisma.agentJob.findMany.mockResolvedValueOnce([]);
    const out = await getActiveAgentActivity("org_1");
    expect(out).toEqual([]);
  });

  it("maps a running prescription-safety job to the Approvals href with active tone", async () => {
    hoisted.mockPrisma.agentJob.findMany.mockResolvedValueOnce([
      { agentName: "prescription-safety" },
    ]);
    const out = await getActiveAgentActivity("org_1");
    expect(out).toEqual([
      {
        href: "/clinic/approvals",
        agentKey: "prescription-safety",
        tone: "active",
      },
    ]);
  });

  it("scopes the prisma query to status=running + organizationId and caps at 50", async () => {
    hoisted.mockPrisma.agentJob.findMany.mockResolvedValueOnce([]);
    await getActiveAgentActivity("org_42");
    expect(hoisted.mockPrisma.agentJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "running", organizationId: "org_42" },
        take: 50,
      }),
    );
  });

  it("skips unmapped agent names instead of throwing", async () => {
    hoisted.mockPrisma.agentJob.findMany.mockResolvedValueOnce([
      { agentName: "unknown-agent-that-has-no-nav" },
      { agentName: "denial-triage" },
      { agentName: "also-unknown" },
    ]);
    const out = await getActiveAgentActivity("org_1");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      href: "/ops/denials",
      agentKey: "denial-triage",
    });
  });

  it("dedupes multiple running jobs that map to the same href", async () => {
    hoisted.mockPrisma.agentJob.findMany.mockResolvedValueOnce([
      { agentName: "prescription-safety" },
      { agentName: "prescription-safety" },
      { agentName: "prescription-safety" },
    ]);
    const out = await getActiveAgentActivity("org_1");
    expect(out).toHaveLength(1);
    expect(out[0].href).toBe("/clinic/approvals");
  });

  it("collapses two different agents that share a nav href into one entry", async () => {
    // adherence-drift-detector + visit-discovery-whisperer both target
    // /clinic/command — a single dot should light up, not two.
    hoisted.mockPrisma.agentJob.findMany.mockResolvedValueOnce([
      { agentName: "adherence-drift-detector" },
      { agentName: "visit-discovery-whisperer" },
    ]);
    const out = await getActiveAgentActivity("org_1");
    expect(out).toHaveLength(1);
    expect(out[0].href).toBe("/clinic/command");
    // First mapped agent wins tone (info, in this case).
    expect(out[0].tone).toBe("info");
  });

  it("returns multiple entries when jobs map to distinct hrefs", async () => {
    hoisted.mockPrisma.agentJob.findMany.mockResolvedValueOnce([
      { agentName: "prescription-safety" },
      { agentName: "denial-triage" },
      { agentName: "clearinghouse-submission" },
    ]);
    const out = await getActiveAgentActivity("org_1");
    const hrefs = out.map((a) => a.href).sort();
    expect(hrefs).toEqual(["/clinic/approvals", "/ops/denials", "/ops/scrub"]);
  });

  it("swallows prisma failures and returns [] so the nav never crashes", async () => {
    hoisted.mockPrisma.agentJob.findMany.mockRejectedValueOnce(
      new Error("P2021: table AgentJob does not exist"),
    );
    // Silence the console.error call in the test output — we assert the
    // loader handled the error, not that it logged silently.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await getActiveAgentActivity("org_1");
    expect(out).toEqual([]);
    errSpy.mockRestore();
  });
});

describe("indexActivityByHref", () => {
  it("returns an empty object for an empty list", () => {
    expect(indexActivityByHref([])).toEqual({});
  });

  it("indexes activity entries by href for O(1) nav decoration", () => {
    const idx = indexActivityByHref([
      { href: "/clinic/approvals", agentKey: "prescription-safety", tone: "active" },
      { href: "/ops/denials", agentKey: "denial-triage", tone: "active" },
    ]);
    expect(idx["/clinic/approvals"].tone).toBe("active");
    expect(idx["/ops/denials"].agentKey).toBe("denial-triage");
    expect(idx["/nowhere"]).toBeUndefined();
  });
});
