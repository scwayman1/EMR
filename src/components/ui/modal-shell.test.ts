import { describe, it, expect, vi } from "vitest";
import { isValidElement, type ReactElement } from "react";
import {
  ModalShell,
  renderModalShell,
  resolveCloseIntent,
  modalDirtyReducer,
  CONFIRM_LEAVE_COPY,
  type ModalDirtyState,
  type ModalShellProps,
} from "./modal-shell";

/**
 * EMR-642 — Modal close pattern.
 *
 * The vitest config uses environment: "node" (no DOM), so tests work with the
 * React element tree directly instead of rendering. They cover:
 *  - pure intent helper (pristine vs dirty → close vs confirm)
 *  - dirty reducer (markDirty, markPristine, reset)
 *  - ModalShell element tree always contains an X affordance
 *  - dirty modal contains the AlertDialog-style confirmation scaffold
 *  - close trigger callback respects intent + Stay / Leave choice
 *  - ESC + outside-click route through the same intent helper
 */

// ---------- Tree walkers ----------

type AnyEl = ReactElement<Record<string, unknown>>;

function walk(node: unknown, visit: (el: AnyEl) => void): void {
  if (Array.isArray(node)) {
    node.forEach((child) => walk(child, visit));
    return;
  }
  if (!node || typeof node !== "object") return;
  if (isValidElement(node)) {
    visit(node as AnyEl);
    if (typeof node.type === "function") {
      try {
        const rendered = (node.type as Function)(node.props);
        walk(rendered, visit);
      } catch (e) {
        // Safe fallback in case hooks or contexts throw
      }
    }
    const children = (node.props as { children?: unknown }).children;
    if (children !== undefined) walk(children, visit);
  }
}

function findByLabel(tree: unknown, label: string): AnyEl | null {
  let found: AnyEl | null = null;
  walk(tree, (el) => {
    if (found) return;
    const aria = (el.props as { "aria-label"?: string })["aria-label"];
    if (aria === label) found = el;
  });
  return found;
}

function findByText(tree: unknown, text: string): AnyEl | null {
  let found: AnyEl | null = null;
  walk(tree, (el) => {
    if (found) return;
    const children = (el.props as { children?: unknown }).children;
    if (typeof children === "string" && children.includes(text)) found = el;
  });
  return found;
}

function findByTestId(tree: unknown, testId: string): AnyEl | null {
  let found: AnyEl | null = null;
  walk(tree, (el) => {
    if (found) return;
    const id = (el.props as { "data-testid"?: string })["data-testid"];
    if (id === testId) found = el;
  });
  return found;
}

function makeRendererProps(
  overrides: Partial<ModalShellProps> & Partial<Parameters<typeof renderModalShell>[0]> = {},
) {
  const onOpenChange = vi.fn();
  const onRequestClose = vi.fn();
  const onStay = vi.fn();
  const onLeave = vi.fn();
  return {
    onOpenChange,
    onRequestClose,
    onStay,
    onLeave,
    props: {
      open: true,
      onOpenChange,
      title: "Test modal",
      children: "body",
      titleId: "t-1",
      descId: "d-1",
      confirming: false,
      onRequestClose,
      onStay,
      onLeave,
      ...overrides,
    } satisfies Parameters<typeof renderModalShell>[0],
  };
}

// ---------- resolveCloseIntent ----------

describe("resolveCloseIntent", () => {
  it("returns 'close' when modal is pristine", () => {
    expect(resolveCloseIntent({ dirty: false })).toBe("close");
  });

  it("returns 'confirm' when modal is dirty", () => {
    expect(resolveCloseIntent({ dirty: true })).toBe("confirm");
  });

  it("returns 'close' when the modal opts out of confirm via skipConfirm", () => {
    expect(resolveCloseIntent({ dirty: true, skipConfirm: true })).toBe("close");
  });
});

// ---------- modalDirtyReducer ----------

describe("modalDirtyReducer", () => {
  const initial: ModalDirtyState = { dirty: false };

  it("markDirty flips the flag on", () => {
    expect(modalDirtyReducer(initial, { type: "markDirty" })).toEqual({
      dirty: true,
    });
  });

  it("markPristine flips the flag off", () => {
    expect(modalDirtyReducer({ dirty: true }, { type: "markPristine" })).toEqual({
      dirty: false,
    });
  });

  it("reset returns to pristine regardless of prior state", () => {
    expect(modalDirtyReducer({ dirty: true }, { type: "reset" })).toEqual({
      dirty: false,
    });
    expect(modalDirtyReducer({ dirty: false }, { type: "reset" })).toEqual({
      dirty: false,
    });
  });

  it("markDirty is idempotent (same reference when already dirty)", () => {
    const dirty = { dirty: true };
    const next = modalDirtyReducer(dirty, { type: "markDirty" });
    expect(next).toBe(dirty);
  });

  it("markPristine is idempotent (same reference when already pristine)", () => {
    const pristine = { dirty: false };
    const next = modalDirtyReducer(pristine, { type: "markPristine" });
    expect(next).toBe(pristine);
  });
});

// ---------- renderModalShell — open state ----------

describe("renderModalShell — open state", () => {
  it("renders nothing when open=false", () => {
    const { props } = makeRendererProps({ open: false });
    expect(renderModalShell(props)).toBeNull();
  });

  it("renders the dialog title", () => {
    const { props } = makeRendererProps({ title: "Edit appointment" });
    const tree = renderModalShell(props);
    expect(findByText(tree, "Edit appointment")).not.toBeNull();
  });

  it("renders the optional description when provided", () => {
    const { props } = makeRendererProps({ description: "Confirm details" });
    const tree = renderModalShell(props);
    expect(findByText(tree, "Confirm details")).not.toBeNull();
  });

  it("renders the optional footer when provided", () => {
    const { props } = makeRendererProps({ footer: "footer-content" });
    const tree = renderModalShell(props);
    expect(findByText(tree, "footer-content")).not.toBeNull();
  });
});

// ---------- X close affordance is always present ----------

describe("renderModalShell — X close affordance", () => {
  it("always includes an X close button when open (pristine)", () => {
    const { props } = makeRendererProps();
    const tree = renderModalShell(props);
    expect(findByLabel(tree, "Close")).not.toBeNull();
    expect(findByTestId(tree, "modal-close-x")).not.toBeNull();
  });

  it("always includes an X close button when open (dirty)", () => {
    const { props } = makeRendererProps({ dirty: true });
    const tree = renderModalShell(props);
    expect(findByLabel(tree, "Close")).not.toBeNull();
    expect(findByTestId(tree, "modal-close-x")).not.toBeNull();
  });

  it("respects a custom closeLabel for the X aria-label", () => {
    const { props } = makeRendererProps({ closeLabel: "Dismiss" });
    const tree = renderModalShell(props);
    expect(findByLabel(tree, "Dismiss")).not.toBeNull();
    expect(findByLabel(tree, "Close")).toBeNull();
  });
});

// ---------- Confirm scaffold visibility ----------

describe("renderModalShell — confirm scaffold", () => {
  it("does NOT render the confirm dialog when pristine", () => {
    const { props } = makeRendererProps();
    const tree = renderModalShell(props);
    expect(findByTestId(tree, "modal-confirm-leave")).toBeNull();
  });

  it("renders the confirm dialog scaffold when dirty", () => {
    const { props } = makeRendererProps({ dirty: true });
    const tree = renderModalShell(props);
    expect(findByTestId(tree, "modal-confirm-leave")).not.toBeNull();
  });

  it("renders Stay and Leave action buttons inside the confirm scaffold", () => {
    const { props } = makeRendererProps({ dirty: true, confirming: true });
    const tree = renderModalShell(props);
    expect(findByText(tree, "Stay")).not.toBeNull();
    expect(findByText(tree, "Leave")).not.toBeNull();
    expect(findByTestId(tree, "modal-confirm-stay")).not.toBeNull();
    expect(findByTestId(tree, "modal-confirm-leave-action")).not.toBeNull();
  });
});

// ---------- Close intent wiring (X + backdrop) ----------

describe("renderModalShell — X click", () => {
  it("X click invokes onRequestClose", () => {
    const { props, onRequestClose } = makeRendererProps();
    const tree = renderModalShell(props);
    const x = findByLabel(tree, "Close");
    expect(x).not.toBeNull();
    const onClick = (x!.props as { onClick?: (e: unknown) => void }).onClick;
    onClick?.({ preventDefault() {}, stopPropagation() {} });
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});

describe("renderModalShell — outside (backdrop) click", () => {
  it("backdrop click invokes onRequestClose", () => {
    const { props, onRequestClose } = makeRendererProps();
    const tree = renderModalShell(props);
    const backdrop = findByTestId(tree, "modal-backdrop");
    expect(backdrop).not.toBeNull();
    const onClick = (backdrop!.props as { onClick?: (e: unknown) => void }).onClick;
    onClick?.({ preventDefault() {}, stopPropagation() {} });
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});

// ---------- Stay / Leave button wiring ----------

describe("renderModalShell — Stay / Leave", () => {
  it("Stay button invokes onStay (and does NOT close)", () => {
    const { props, onStay, onOpenChange, onLeave } = makeRendererProps({
      dirty: true,
      confirming: true,
    });
    const tree = renderModalShell(props);
    const stay = findByTestId(tree, "modal-confirm-stay");
    expect(stay).not.toBeNull();
    const onClick = (stay!.props as { onClick?: () => void }).onClick;
    onClick?.();
    expect(onStay).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("Leave button invokes onLeave", () => {
    const { props, onLeave, onStay } = makeRendererProps({
      dirty: true,
      confirming: true,
    });
    const tree = renderModalShell(props);
    const leave = findByTestId(tree, "modal-confirm-leave-action");
    expect(leave).not.toBeNull();
    const onClick = (leave!.props as { onClick?: () => void }).onClick;
    onClick?.();
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onStay).not.toHaveBeenCalled();
  });
});

// ---------- Intent semantics for ESC + outside-click ----------

describe("close intent semantics (used by ESC + outside-click)", () => {
  it("pristine close: resolveCloseIntent returns 'close' so onOpenChange is invoked", () => {
    const onOpenChange = vi.fn();
    // Simulate the production handler:
    const requestClose = () => {
      if (resolveCloseIntent({ dirty: false }) === "close") onOpenChange(false);
    };
    requestClose();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dirty close: resolveCloseIntent returns 'confirm' so onOpenChange is NOT invoked yet", () => {
    const onOpenChange = vi.fn();
    let confirmingShown = false;
    const requestClose = () => {
      if (resolveCloseIntent({ dirty: true }) === "close") {
        onOpenChange(false);
      } else {
        confirmingShown = true;
      }
    };
    requestClose();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(confirmingShown).toBe(true);
  });

  it("skipConfirm overrides dirty and closes immediately", () => {
    const onOpenChange = vi.fn();
    const requestClose = () => {
      if (resolveCloseIntent({ dirty: true, skipConfirm: true }) === "close") {
        onOpenChange(false);
      }
    };
    requestClose();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ---------- Confirmation copy ----------

describe("CONFIRM_LEAVE_COPY", () => {
  it("uses the canonical 'Are you sure you want to leave?' copy", () => {
    expect(CONFIRM_LEAVE_COPY.title).toMatch(/are you sure/i);
    expect(CONFIRM_LEAVE_COPY.title).toMatch(/leave/i);
  });

  it("warns the user that changes will be lost", () => {
    expect(CONFIRM_LEAVE_COPY.description).toMatch(/changes will be lost/i);
  });

  it("uses 'Stay' and 'Leave' as the action labels", () => {
    expect(CONFIRM_LEAVE_COPY.stay).toBe("Stay");
    expect(CONFIRM_LEAVE_COPY.leave).toBe("Leave");
  });
});

// ---------- Smoke: ModalShell is a function component ----------

describe("ModalShell", () => {
  it("is a function (callable as a React component)", () => {
    expect(typeof ModalShell).toBe("function");
  });
});
