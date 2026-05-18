import { afterEach, describe, expect, it, vi } from "vitest";

// Verify the /post-sign-in server component routes each role to its
// correct landing page. Mock both `next/navigation`'s redirect (which
// normally throws NEXT_REDIRECT) and the session loader so the test
// runs as a pure unit.

// vi.mock is hoisted above imports, so the mocks themselves have to be
// declared via vi.hoisted() to be visible inside the factory.
const mocks = vi.hoisted(() => ({
  redirect: vi.fn((_path: string) => {
    throw new Error(`__REDIRECT__:${_path}`);
  }),
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import PostSignInPage from "./page";

function userWith(roles: string[]) {
  return {
    id: "u_1",
    email: "x@example.com",
    firstName: "X",
    lastName: "Y",
    roles,
    organizationId: "o_1",
    organizationName: "Test Practice",
  };
}

async function runAndCaptureRedirect(): Promise<string> {
  try {
    await PostSignInPage();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const m = msg.match(/^__REDIRECT__:(.+)$/);
    if (m) return m[1];
    throw e;
  }
  throw new Error("PostSignInPage returned without redirecting");
}

describe("/post-sign-in routing", () => {
  afterEach(() => {
    mocks.redirect.mockClear();
    mocks.getCurrentUser.mockReset();
  });

  it("sends practice_owner to /ops — the bug we're fixing", async () => {
    // The exact failure case: a practice_owner with an older patient
    // membership. Before the fix, roles[0] === "patient" sent them to
    // /portal. Now primaryRole picks "practice_owner" → /ops.
    mocks.getCurrentUser.mockResolvedValue(
      userWith(["patient", "practice_owner"]),
    );
    expect(await runAndCaptureRedirect()).toBe("/ops");
  });

  it("sends a patient to /portal", async () => {
    mocks.getCurrentUser.mockResolvedValue(userWith(["patient"]));
    expect(await runAndCaptureRedirect()).toBe("/portal");
  });

  it("sends a clinician to /clinic", async () => {
    mocks.getCurrentUser.mockResolvedValue(userWith(["clinician"]));
    expect(await runAndCaptureRedirect()).toBe("/clinic");
  });

  it("sends an operator to /ops", async () => {
    mocks.getCurrentUser.mockResolvedValue(userWith(["operator"]));
    expect(await runAndCaptureRedirect()).toBe("/ops");
  });

  it("super_admin outranks every other role on the user", async () => {
    mocks.getCurrentUser.mockResolvedValue(
      userWith(["patient", "clinician", "practice_owner", "super_admin"]),
    );
    expect(await runAndCaptureRedirect()).toBe("/onboarding");
  });

  it("unauthenticated user is sent back to /sign-in", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect(await runAndCaptureRedirect()).toBe("/sign-in");
  });
});
