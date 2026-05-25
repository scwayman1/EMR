"use client";

import React, { useState, useEffect, useRef } from "react";

interface SplitWorkspaceLayoutProps {
  collapsed: boolean;
  paneWidth: number;
  toggleCollapse: () => void;
  startResize: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}

export function SplitWorkspaceLayout({
  collapsed,
  paneWidth,
  toggleCollapse,
  startResize,
  children,
}: SplitWorkspaceLayoutProps) {
  const childArray = React.Children.toArray(children);
  const leftChild = childArray[0];
  const rightChild = childArray[1];

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div
        className="overflow-y-auto border-r border-border bg-surface transition-all duration-200"
        style={{ width: collapsed ? 0 : paneWidth, minWidth: collapsed ? 0 : 200 }}
      >
        {!collapsed && leftChild}
      </div>

      <div
        className="w-2 cursor-col-resize hover:bg-accent-soft flex items-center justify-center bg-surface-muted border-r border-border select-none"
        onMouseDown={startResize}
      >
        <button
          onClick={toggleCollapse}
          aria-label="Toggle panel"
          className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center shadow-sm text-xs hover:bg-surface-muted"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-surface">
        {rightChild}
      </div>
    </div>
  );
}

interface SplitWorkspaceProps {
  children: React.ReactNode;
}

export function SplitWorkspace({ children }: SplitWorkspaceProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [paneWidth, setPaneWidth] = useState(350);
  const isDragging = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedCollapsed = localStorage.getItem("workspace:splitPaneCollapsed");
    const savedWidth = localStorage.getItem("workspace:splitPaneWidth");
    if (savedCollapsed) setCollapsed(savedCollapsed === "true");
    if (savedWidth) setPaneWidth(Number(savedWidth));
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("workspace:splitPaneCollapsed", String(next));
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResize);
  };

  const resize = (e: MouseEvent) => {
    if (!isDragging.current) return;
    const newWidth = Math.max(200, Math.min(600, e.clientX - 64)); // Offset by rail nav width
    setPaneWidth(newWidth);
    localStorage.setItem("workspace:splitPaneWidth", String(newWidth));
  };

  const stopResize = () => {
    isDragging.current = false;
    document.removeEventListener("mousemove", resize);
    document.removeEventListener("mouseup", stopResize);
  };

  return (
    <SplitWorkspaceLayout
      collapsed={collapsed}
      paneWidth={paneWidth}
      toggleCollapse={toggleCollapse}
      startResize={startResize}
    >
      {children}
    </SplitWorkspaceLayout>
  );
}
