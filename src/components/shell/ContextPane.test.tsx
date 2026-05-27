import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import util from "util";
import { ContextPaneLayout } from "./ContextPane";

function dump(node: React.ReactElement | null): string {
  return util.inspect(node, { depth: null });
}

describe("ContextPaneLayout", () => {
  it("renders vitals tab content when activeTab is vitals", () => {
    const setActiveTabMock = vi.fn();
    
    const out = ContextPaneLayout({
      activeTab: "vitals",
      setActiveTab: setActiveTabMock
    });
    
    const str = dump(out as React.ReactElement);
    
    expect(str).toContain("Sleep Quality");
    expect(str).toContain("Pain Level");
    expect(str).toContain("Active Regimen");
  });

  it("renders medical history tab content when activeTab is history", () => {
    const setActiveTabMock = vi.fn();
    
    const out = ContextPaneLayout({
      activeTab: "history",
      setActiveTab: setActiveTabMock
    });
    
    const str = dump(out as React.ReactElement);
    
    expect(str).toContain("Chronic Lower Back Pain");
    expect(str).toContain("Known Allergies");
  });

  it("renders labs tab content when activeTab is labs", () => {
    const setActiveTabMock = vi.fn();
    
    const out = ContextPaneLayout({
      activeTab: "labs",
      setActiveTab: setActiveTabMock
    });
    
    const str = dump(out as React.ReactElement);
    
    expect(str).toContain("Canna-QoL Index");
    expect(str).toContain("Recent Lab Values");
  });
});
