"use client";

// ConfirmDialog + useConfirm — UX confirmation primitive
// -----------------------------------------------------------------------------
//
// A higher-level pattern on top of the canonical <Dialog> primitive (see
// src/components/ui/dialog.tsx + PR #461) for the dozens of destructive /
// irreversible flows scattered across the EMR. Replaces:
//
//   - window.confirm("…")            ← inaccessible, ugly, ignores theme
//   - bespoke <div> overlays         ← drifty copy, drifty visual language
//   - one-off Modal({onClose,...})   ← e.g. /ops/api-keys keys-view.tsx
//
// Three severity tiers with consistent visual language:
//
//   • info     — blue accent + Info icon          (Cancel / Continue)
//   • warning  — amber accent + AlertTriangle      (Cancel / Continue)
//                e.g. "Discard unsaved changes?"
//   • danger   — red accent + Trash2/AlertTriangle (Cancel / Delete)
//                e.g. archive patient, revoke API key, delete chart task
//
// Optional Stripe / GitHub-style typed-confirmation: pass
// `requireTypedConfirmation="Acme Clinic"` and the confirm button stays
// disabled until the user types that string verbatim (trimmed, case-insensitive).
//
// Two ways to use it:
//   1. Declarative   — <ConfirmDialog open={…} onConfirm={…} … /> in JSX.
//   2. Imperative    — `const ok = await useConfirm()({ … })` for one-shot
//                      destructive prompts triggered from event handlers
//                      (context menus, bulk-action bars, dropdown items).
//
// Behaviors inherited from Dialog (PR #461):
//   - focus trap, focus restore on close (a11y: WCAG 2.4.3)
//   - Esc dismisses
//   - click backdrop = Cancel (NOT confirm — destructive defaults to
//     non-destructive on accidental click-out)
//
// Behaviors specific to ConfirmDialog:
//   - typed-confirmation gate
//   - severity-driven icon + accent colors + button variant
//   - confirm button auto-focuses (or the typed-confirmation input does
//     when present, so keyboard users land on the gating control)
//   - Esc / backdrop / Cancel all resolve to `false`, only the confirm
//     button resolves to `true` — useConfirm() relies on this.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type ConfirmSeverity = "info" | "warning" | "danger";

export interface ConfirmDialogProps {
  /** Controls visibility. */
  open: boolean;
  /** Called for any non-confirm dismissal (Esc, backdrop, Cancel button). */
  onClose: () => void;
  /** Called when the user confirms (and typed-confirmation passes, if required). */
  onConfirm: () => void;
  /** Short, sentence-case title. e.g. "Archive Maya Reyes?" */
  title: string;
  /**
   * One- or two-sentence description. State the concrete consequence —
   * "This kills active sessions" beats "Are you sure?". May be a string
   * or a ReactNode if you need to embed strong tags / patient names.
   */
  description: ReactNode;
  /** Visual + tonal severity. Default "info". */
  severity?: ConfirmSeverity;
  /** Confirm button copy. Defaults: info/warning="Continue", danger="Delete". */
  confirmLabel?: string;
  /** Cancel button copy. Default "Cancel". */
  cancelLabel?: string;
  /**
   * When provided, the confirm button stays disabled until the user types
   * this string exactly (trim + case-insensitive). Use for high-blast-radius
   * actions — Stripe / GitHub repo-delete pattern.
   */
  requireTypedConfirmation?: string;
  /**
   * When the confirm action is async (e.g. fetch) the caller can set this
   * to keep the dialog open and show a pending state on the confirm button.
   */
  busy?: boolean;
}

const SEVERITY_STYLES: Record<
  ConfirmSeverity,
  {
    icon: typeof Info;
    iconWrapClass: string;
    iconClass: string;
    confirmVariant: "primary" | "danger";
    defaultConfirmLabel: string;
    accentBorder: string;
  }
> = {
  info: {
    icon: Info,
    iconWrapClass: "bg-accent/10",
    iconClass: "text-accent",
    confirmVariant: "primary",
    defaultConfirmLabel: "Continue",
    accentBorder: "",
  },
  warning: {
    icon: AlertTriangle,
    iconWrapClass: "bg-amber-100 dark:bg-amber-900/30",
    iconClass: "text-amber-600 dark:text-amber-400",
    confirmVariant: "primary",
    defaultConfirmLabel: "Continue",
    accentBorder: "",
  },
  danger: {
    icon: Trash2,
    iconWrapClass: "bg-red-100 dark:bg-red-900/30",
    iconClass: "text-danger",
    confirmVariant: "danger",
    defaultConfirmLabel: "Delete",
    // Subtle red hairline to visually flag the modal as destructive at a
    // glance — matches the Emergency revoke dialog (EMR-727) styling.
    accentBorder: "border-danger/40",
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  severity = "info",
  confirmLabel,
  cancelLabel = "Cancel",
  requireTypedConfirmation,
  busy = false,
}: ConfirmDialogProps) {
  const styles = SEVERITY_STYLES[severity];
  const IconComponent = styles.icon;
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const descId = useId();

  // Reset the typed-confirmation field whenever the dialog re-opens — a
  // stale value from a previous open would otherwise enable the destructive
  // button before the operator re-states intent.
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  // Park focus on the gating control: typed-confirmation input if present,
  // else the confirm button. Without this Dialog's auto-focus heuristic
  // can land on the Cancel button (the second focusable), which feels
  // weird for a single-action confirm and steals the keyboard "Enter to
  // confirm" muscle memory.
  useEffect(() => {
    if (!open) return;
    // Defer one tick so Dialog's own focus-into runs first; otherwise
    // we'd race it and lose.
    const id = window.setTimeout(() => {
      if (requireTypedConfirmation && inputRef.current) {
        inputRef.current.focus();
      } else if (confirmRef.current && !confirmRef.current.disabled) {
        confirmRef.current.focus();
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, requireTypedConfirmation]);

  const typedOk =
    !requireTypedConfirmation ||
    typed.trim().toLowerCase() ===
      requireTypedConfirmation.trim().toLowerCase();
  const canConfirm = typedOk && !busy;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
  };

  // Enter inside the typed-confirmation input should fire confirm so the
  // keyboard flow is one continuous motion (type → Enter).
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canConfirm) {
      event.preventDefault();
      handleConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) return;
        // Block close mid-flight so an async confirm can't be torn down by
        // an accidental Esc / backdrop.
        if (busy) return;
        onClose();
      }}
    >
      <DialogContent
        className={cn("max-w-md", styles.accentBorder)}
        aria-describedby={descId}
        // Override the standard p-6 to give the icon+title row a tighter
        // hug.
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
              styles.iconWrapClass,
            )}
            aria-hidden
          >
            <IconComponent className={cn("h-5 w-5", styles.iconClass)} />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            {/* We render an <h2> manually rather than using DialogTitle so
                the icon row reads as a single visual unit. DialogContent
                uses its own titleId for aria-labelledby — we wire it up by
                also passing aria-describedby on the description below. */}
            <h2 className="text-base font-semibold text-text leading-snug">
              {title}
            </h2>
            <div
              id={descId}
              className="mt-1.5 text-sm text-text-muted leading-relaxed"
            >
              {description}
            </div>
          </div>
        </div>

        {requireTypedConfirmation && (
          <div className="mt-4">
            <label
              htmlFor={`${descId}-typed`}
              className="block text-xs font-medium uppercase tracking-wide text-text-muted"
            >
              Type{" "}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-text">
                {requireTypedConfirmation}
              </code>{" "}
              to confirm
            </label>
            <input
              ref={inputRef}
              id={`${descId}-typed`}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={requireTypedConfirmation}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={typed.length > 0 && !typedOk ? true : undefined}
              className={cn(
                "mt-1 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-text",
                "focus:outline-none focus:ring-2",
                severity === "danger"
                  ? "focus:border-danger focus:ring-danger/20"
                  : severity === "warning"
                    ? "focus:border-amber-500 focus:ring-amber-500/20"
                    : "focus:border-accent focus:ring-accent/20",
              )}
            />
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (busy) return;
              onClose();
            }}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={styles.confirmVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
          >
            {busy
              ? "Working…"
              : (confirmLabel ?? styles.defaultConfirmLabel)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// useConfirm() — imperative API
// -----------------------------------------------------------------------------
//
// Mounts a single ConfirmDialog per provider and exposes a function that
// returns a Promise<boolean>. Resolves true on confirm, false on any
// other dismissal (Esc, backdrop, Cancel). Sample:
//
//   const confirm = useConfirm();
//   const ok = await confirm({
//     title: "Archive Maya Reyes?",
//     description: "They'll drop off the active roster. The chart stays.",
//     severity: "danger",
//     confirmLabel: "Archive",
//   });
//   if (!ok) return;
//   doArchive();
//
// The provider is mounted once in src/app/layout.tsx alongside ToastProvider.

export type ConfirmOptions = Omit<
  ConfirmDialogProps,
  "open" | "onClose" | "onConfirm" | "busy"
>;

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmContextValue>((options) => {
    return new Promise<boolean>((resolve) => {
      setState({ options, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    setState((current) => {
      current?.resolve(false);
      return null;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((current) => {
      current?.resolve(true);
      return null;
    });
  }, []);

  // Memoize so consumers that destructure `confirm` don't see a new
  // reference on every parent render.
  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state && (
        <ConfirmDialog
          {...state.options}
          open
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      )}
    </ConfirmContext.Provider>
  );
}

/**
 * Imperative confirmation hook. Returns a function that opens the shared
 * ConfirmDialog and resolves to `true` on confirm or `false` on any
 * dismissal. Throws if used outside <ConfirmProvider>.
 */
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error(
      "useConfirm() must be used inside <ConfirmProvider>. Mount it once in src/app/layout.tsx.",
    );
  }
  return ctx;
}
