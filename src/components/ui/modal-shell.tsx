"use client";

/**
 * ModalShell — EMR-642
 *
 * A shared modal scaffold that enforces the Leafjourney close-confirmation
 * pattern:
 *   1. There is always an X affordance in the top-right.
 *   2. Outside-click and ESC route through `requestClose()`.
 *      - Pristine modal (no user input): close silently.
 *      - Dirty modal: show "Are you sure you want to leave?" with Stay / Leave.
 *
 * Consumers can mark dirty in two ways:
 *   - Controlled: pass `dirty` prop (recommended for forms with rich state).
 *   - Hook: `useModalDirty()` returns { dirty, markDirty, markPristine, reset }.
 *
 * For the common case of a form-only modal, wrap inputs in `<ModalForm>` —
 * any onChange inside it auto-marks dirty.
 *
 * The dialog primitive is intentionally self-contained (no Radix / shadcn
 * AlertDialog in this repo) and follows the same lightweight idiom as
 * `src/components/ui/dialog.tsx`.
 *
 * Structure:
 *   - Pure helpers (reducer, intent resolver, copy) are exported for tests.
 *   - `renderModalShell(...)` is a pure function that returns the React tree
 *     given resolved state + handlers. It contains no hooks, so unit tests
 *     can call it directly under vitest's node environment (no DOM).
 *   - `ModalShell` is the thin client component that wires hooks and
 *     delegates to `renderModalShell`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type FormHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ---------- Pure helpers ----------

export type ModalDirtyState = { dirty: boolean };

export type ModalDirtyAction =
  | { type: "markDirty" }
  | { type: "markPristine" }
  | { type: "reset" };

export function modalDirtyReducer(
  state: ModalDirtyState,
  action: ModalDirtyAction,
): ModalDirtyState {
  switch (action.type) {
    case "markDirty":
      return state.dirty ? state : { dirty: true };
    case "markPristine":
    case "reset":
      return state.dirty ? { dirty: false } : state;
    default:
      return state;
  }
}

export type CloseIntent = "close" | "confirm";

export function resolveCloseIntent(opts: {
  dirty: boolean;
  skipConfirm?: boolean;
}): CloseIntent {
  if (!opts.dirty) return "close";
  if (opts.skipConfirm) return "close";
  return "confirm";
}

export const CONFIRM_LEAVE_COPY = {
  title: "Are you sure you want to leave?",
  description: "Your changes will be lost.",
  stay: "Stay",
  leave: "Leave",
} as const;

// ---------- Dirty context + hook ----------

type DirtyContextValue = {
  dirty: boolean;
  markDirty: () => void;
  markPristine: () => void;
  reset: () => void;
};

const ModalDirtyContext = createContext<DirtyContextValue | null>(null);

function useLocalDirty(): DirtyContextValue {
  const [state, dispatch] = useReducer(modalDirtyReducer, { dirty: false });
  return {
    dirty: state.dirty,
    markDirty: useCallback(() => dispatch({ type: "markDirty" }), []),
    markPristine: useCallback(() => dispatch({ type: "markPristine" }), []),
    reset: useCallback(() => dispatch({ type: "reset" }), []),
  };
}

/**
 * Consumer hook for reading + mutating the dirty state of the enclosing
 * ModalShell. If used outside a ModalShell, returns an isolated local store
 * so callers can still drive their own state in tests.
 */
export function useModalDirty(): DirtyContextValue {
  const ctx = useContext(ModalDirtyContext);
  // eslint-disable-next-line react-hooks/rules-of-hooks -- ctx is stable per mount
  const fallback = useLocalDirty();
  return ctx ?? fallback;
}

// ---------- ModalForm wrapper ----------

export interface ModalFormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

/**
 * Form wrapper that auto-marks the enclosing ModalShell dirty on any change
 * event bubbling up from its inputs. Drop-in replacement for `<form>`.
 */
export function ModalForm({ onChange, children, ...rest }: ModalFormProps) {
  const ctx = useContext(ModalDirtyContext);
  return (
    <form
      {...rest}
      onChange={(event) => {
        ctx?.markDirty();
        onChange?.(event);
      }}
    >
      {children}
    </form>
  );
}

// ---------- Pure renderer (used by tests + the live component) ----------

export interface ModalShellProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Controlled dirty flag. When provided overrides any internal state. */
  dirty?: boolean;
  /** Skip the confirm prompt entirely (used for destructive flows that
   *  manage their own confirmation). */
  skipConfirm?: boolean;
  /** Optional className for the dialog panel. */
  className?: string;
  /** Optional aria-label override for the X close button. */
  closeLabel?: string;
}

/**
 * Pure rendering function. Returns the React element tree given fully
 * resolved props + stateful handlers. No hooks. Safe to call directly from
 * unit tests under vitest's node environment.
 */
export function renderModalShell(
  props: ModalShellProps & {
    titleId: string;
    descId: string;
    confirming: boolean;
    onRequestClose: () => void;
    onStay: () => void;
    onLeave: () => void;
  },
): ReactNode {
  const {
    open,
    title,
    description,
    children,
    footer,
    dirty,
    className,
    closeLabel = "Close",
    titleId,
    descId,
    confirming,
    onRequestClose,
    onStay,
    onLeave,
  } = props;

  if (!open) return null;

  const onBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onRequestClose();
  };

  const onPanelClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const onCloseButton = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onRequestClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        data-testid="modal-backdrop"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onBackdropClick}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        onClick={onPanelClick}
        className={cn(
          // Apple-iOS aesthetic: large rounded corners, soft shadow,
          // generous padding, comfortable max-width.
          "relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl",
          className,
        )}
      >
        {/* X close — top-right, always present, large touch target */}
        <button
          type="button"
          aria-label={closeLabel}
          data-testid="modal-close-x"
          onClick={onCloseButton}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-6 pt-6">
          <header className="mb-4 pr-10">
            <h2 id={titleId} className="text-lg font-semibold text-text">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            ) : null}
          </header>

          <div>{children}</div>

          {footer ? (
            <footer className="mt-6 flex items-center justify-end gap-2">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>

      {/*
        Confirm-leave scaffold. When the modal is dirty we always include
        this sub-tree (hidden until `confirming` flips true). Tests look
        for `modal-confirm-leave` to verify the scaffold exists.
      */}
      {dirty ? (
        <ConfirmLeaveDialog
          open={confirming}
          onStay={onStay}
          onLeave={onLeave}
        />
      ) : null}
    </div>
  );
}

// ---------- ModalShell (live component) ----------

/**
 * Live ModalShell component. Wires hooks (ids, dirty state, confirm state,
 * ESC handler) and delegates the React tree to `renderModalShell` so the
 * same rendering path is exercised in production and tests.
 */
export function ModalShell(props: ModalShellProps) {
  const {
    open,
    onOpenChange,
    dirty: dirtyProp,
    skipConfirm,
  } = props;

  const titleId = useId();
  const descId = useId();
  const local = useLocalDirty();
  const dirty = dirtyProp ?? local.dirty;

  const [confirming, setConfirming] = useState(false);
  const confirmingRef = useRef(confirming);
  confirmingRef.current = confirming;

  const onRequestClose = useCallback(() => {
    if (resolveCloseIntent({ dirty, skipConfirm }) === "close") {
      setConfirming(false);
      onOpenChange(false);
      return;
    }
    setConfirming(true);
  }, [dirty, skipConfirm, onOpenChange]);

  const onStay = useCallback(() => setConfirming(false), []);
  const onLeave = useCallback(() => {
    setConfirming(false);
    onOpenChange(false);
  }, [onOpenChange]);

  // ESC handling: routes through onRequestClose for the same confirm flow.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmingRef.current) {
        setConfirming(false);
        return;
      }
      onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onRequestClose]);

  // Reset confirming state if the modal is force-closed externally.
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  return (
    <ModalDirtyContext.Provider value={local}>
      {renderModalShell({
        ...props,
        dirty,
        titleId,
        descId,
        confirming,
        onRequestClose,
        onStay,
        onLeave,
      })}
    </ModalDirtyContext.Provider>
  );
}

// ---------- ConfirmLeaveDialog ----------

function ConfirmLeaveDialog({
  open,
  onStay,
  onLeave,
}: {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      data-testid="modal-confirm-leave"
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center p-4",
        open ? "pointer-events-auto" : "pointer-events-none opacity-0",
      )}
    >
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onStay}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-text">
          {CONFIRM_LEAVE_COPY.title}
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          {CONFIRM_LEAVE_COPY.description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            data-testid="modal-confirm-stay"
            onClick={onStay}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-medium text-text hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {CONFIRM_LEAVE_COPY.stay}
          </button>
          <button
            type="button"
            data-testid="modal-confirm-leave-action"
            onClick={onLeave}
            className="inline-flex h-10 items-center justify-center rounded-full bg-danger px-5 text-sm font-medium text-white hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
          >
            {CONFIRM_LEAVE_COPY.leave}
          </button>
        </div>
      </div>
    </div>
  );
}
