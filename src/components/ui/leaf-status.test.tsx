import { describe, it, expect } from "vitest";
import util from "util";
import {
  LeafStatus,
  LEAF_STATUS_DEFAULT_LABEL,
  LEAF_STATUS_EMOJI,
  type LeafStatusLevel,
} from "./leaf-status";

/**
 * EMR-638 — LeafStatus indicator tests.
 *
 * Vitest runs in node (no DOM); we inspect the React element returned by the
 * component function directly. Same pattern used elsewhere in the repo
 * (see src/components/clinic/clinic-ribbon.test.tsx).
 */

const LEVELS: LeafStatusLevel[] = ["green", "yellow", "red"];

describe("LeafStatus", () => {
  for (const status of LEVELS) {
    it(`renders the correct emoji + default aria-label + title for status="${status}"`, () => {
      const el = LeafStatus({ status });
      expect(el.props.role).toBe("img");
      expect(el.props["aria-label"]).toBe(LEAF_STATUS_DEFAULT_LABEL[status]);
      expect(el.props.title).toBe(LEAF_STATUS_DEFAULT_LABEL[status]);
      expect(el.props["data-leaf-status"]).toBe(status);

      const dump = util.inspect(el, { depth: null });
      expect(dump).toContain(LEAF_STATUS_EMOJI[status]);
    });
  }

  it("uses a custom label as both aria-label and tooltip when provided", () => {
    const el = LeafStatus({ status: "yellow", label: "Borderline glucose" });
    expect(el.props["aria-label"]).toBe("Borderline glucose");
    expect(el.props.title).toBe("Borderline glucose");
    // Custom label takes precedence over the default copy.
    expect(el.props["aria-label"]).not.toBe(LEAF_STATUS_DEFAULT_LABEL.yellow);
  });

  it("applies size class for sm/md/lg", () => {
    const sm = LeafStatus({ status: "green", size: "sm" });
    const md = LeafStatus({ status: "green", size: "md" });
    const lg = LeafStatus({ status: "green", size: "lg" });
    expect(sm.props.className).toContain("text-sm");
    expect(md.props.className).toContain("text-base");
    expect(lg.props.className).toContain("text-xl");
  });

  it("defaults to md size when size is omitted", () => {
    const el = LeafStatus({ status: "red" });
    expect(el.props.className).toContain("text-base");
  });

  it("merges caller-provided className", () => {
    const el = LeafStatus({ status: "green", className: "ml-2 align-middle" });
    expect(el.props.className).toContain("ml-2");
    expect(el.props.className).toContain("align-middle");
  });

  it("emoji table maps the three brand colours to the documented leaves", () => {
    expect(LEAF_STATUS_EMOJI.green).toBe("🍃");
    expect(LEAF_STATUS_EMOJI.yellow).toBe("🍂");
    expect(LEAF_STATUS_EMOJI.red).toBe("🍁");
  });
});
