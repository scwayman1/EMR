import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import util from "util";
import { SplitWorkspaceLayout } from "./SplitWorkspace";

function dump(node: React.ReactElement | null): string {
  return util.inspect(node, { depth: null });
}

describe("SplitWorkspaceLayout", () => {
  it("renders a split layout with left and right children slots when not collapsed", () => {
    const toggleCollapseMock = vi.fn();
    const startResizeMock = vi.fn();
    
    const out = SplitWorkspaceLayout({
      collapsed: false,
      paneWidth: 350,
      toggleCollapse: toggleCollapseMock,
      startResize: startResizeMock,
      children: [
        <div key="left">Left Reference Content</div>,
        <div key="right">Right Note Input</div>
      ]
    });
    
    const str = dump(out as React.ReactElement);
    
    // Left and right contents are present
    expect(str).toContain("Left Reference Content");
    expect(str).toContain("Right Note Input");
    
    // Toggle button exists
    expect(str).toContain("'aria-label': 'Toggle panel'");
  });

  it("collapses the left pane layout when collapsed is true", () => {
    const toggleCollapseMock = vi.fn();
    const startResizeMock = vi.fn();
    
    const out = SplitWorkspaceLayout({
      collapsed: true,
      paneWidth: 350,
      toggleCollapse: toggleCollapseMock,
      startResize: startResizeMock,
      children: [
        <div key="left">Left Reference Content</div>,
        <div key="right">Right Note Input</div>
      ]
    });
    
    const str = dump(out as React.ReactElement);
    
    // When collapsed, the left child should not be rendered
    expect(str).not.toContain("Left Reference Content");
    expect(str).toContain("Right Note Input");
  });
});
