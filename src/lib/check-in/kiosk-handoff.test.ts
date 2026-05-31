import { describe, expect, it } from "vitest";

import { lobbyUrl, qrImageUrl } from "./kiosk-handoff";

describe("lobbyUrl", () => {
  it("builds an origin-rooted /kiosk/lobby URL with the token url-encoded", () => {
    expect(lobbyUrl("https://app.leafjourney.com", "abc.def")).toBe(
      "https://app.leafjourney.com/kiosk/lobby/abc.def",
    );
  });
  it("encodes a token so reserved characters survive the path", () => {
    expect(lobbyUrl("https://x", "a/b+c")).toBe("https://x/kiosk/lobby/a%2Fb%2Bc");
  });
});

describe("qrImageUrl", () => {
  it("points at the qrserver endpoint with the data url-encoded", () => {
    const url = qrImageUrl("https://x/kiosk/lobby/tok", 280);
    expect(url).toContain("https://api.qrserver.com/v1/create-qr-code/");
    expect(url).toContain("size=280x280");
    expect(url).toContain(encodeURIComponent("https://x/kiosk/lobby/tok"));
  });
});
