import { describe, expect, it } from "vitest";

import { findCodexAgentBriefComment, type LinearIssue } from "./linear";

function makeIssue(comments: Array<{ id: string; body: string }>): LinearIssue {
  return {
    id: "issue-1",
    identifier: "EMR-17",
    title: "Codex setup",
    description: null,
    url: "https://linear.app/leafjourney/issue/EMR-17",
    state: null,
    project: null,
    comments: {
      nodes: comments.map((comment) => ({
        ...comment,
        createdAt: "2026-04-23T00:00:00.000Z",
        user: null,
      })),
    },
  };
}

describe("findCodexAgentBriefComment", () => {
  it("returns the pinned brief comment when text is present", () => {
    const issue = makeIssue([
      { id: "c1", body: "General planning notes" },
      { id: "c2", body: "Codex Agent Brief: full implementation spec here." },
    ]);

    const result = findCodexAgentBriefComment(issue);

    expect(result?.id).toBe("c2");
  });

  it("supports markdown heading-only variants", () => {
    const issue = makeIssue([
      { id: "c1", body: "# Agent Brief\nMarketplace implementation details." },
    ]);

    const result = findCodexAgentBriefComment(issue);

    expect(result?.id).toBe("c1");
  });

  it("returns null when no matching comment exists", () => {
    const issue = makeIssue([{ id: "c1", body: "No brief in this thread." }]);

    const result = findCodexAgentBriefComment(issue);

    expect(result).toBeNull();
  });
});
