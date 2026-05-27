import { describe, expect, it } from "vitest";
import {
  getTemplate,
  listAsks,
  lookupRepresentatives,
  renderLetter,
  type PatientStory,
} from "./representatives";

const STORY: PatientStory = {
  firstName: "Marcus",
  state: "CO",
  condition: "chronic neuropathic pain following a service injury",
  story:
    "Medical cannabis has let me reduce my opioid dose by half and stay engaged with my family again.",
};

describe("lookupRepresentatives", () => {
  it("returns federal + state reps for a known state", () => {
    const reps = lookupRepresentatives("co");
    expect(reps.length).toBeGreaterThan(0);
    expect(reps.every((r) => r.state === "CO")).toBe(true);
  });

  it("returns nothing for an unsupported state", () => {
    expect(lookupRepresentatives("ZZ")).toEqual([]);
  });
});

describe("listAsks", () => {
  it("includes the five core advocacy asks", () => {
    const asks = listAsks().map((a) => a.ask);
    expect(asks).toEqual(
      expect.arrayContaining([
        "reclassification",
        "research_funding",
        "insurance_coverage",
        "patient_access",
        "veteran_access",
      ]),
    );
  });
});

describe("renderLetter", () => {
  const rep = lookupRepresentatives("CO")[0];

  it("includes the patient name and home state", () => {
    const letter = renderLetter(rep, STORY, "veteran_access");
    expect(letter.body).toContain(STORY.firstName);
    expect(letter.body).toContain(STORY.state);
  });

  it("inlines the chosen ask's call-to-action", () => {
    const tpl = getTemplate("research_funding");
    const letter = renderLetter(rep, STORY, "research_funding");
    expect(letter.body).toContain(tpl.callToAction);
  });

  it("subject names the state and the ask title", () => {
    const letter = renderLetter(rep, STORY, "patient_access");
    expect(letter.subject).toContain("CO");
    expect(letter.subject.toLowerCase()).toContain("patient access");
  });

  it("character count matches body length", () => {
    const letter = renderLetter(rep, STORY, "insurance_coverage");
    expect(letter.characters).toBe(letter.body.length);
  });
});
