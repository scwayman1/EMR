/**
 * Standardized fallback body rendered inside a Command-Center tile's
 * Shell when its data fetch throws. The Shell keeps the tile's grid
 * slot (span / tone / header) intact so the surrounding layout doesn't
 * reflow, and the clinician sees something calm + honest instead of a
 * crash of the whole dashboard.
 *
 * When an `error` is passed in, we render its message + first stack
 * line right in the tile. This is a temporary diagnostic surface —
 * production normally masks error messages via Next's error boundary,
 * but these tiles catch in their own code path, so we can safely
 * expose the details to whoever's looking at the page. Once the
 * Command Center is stable, the error prop can be dropped and this
 * reverts to the generic message.
 */
export function TileErrorBody({
  label,
  error,
}: {
  label: string;
  error?: unknown;
}) {
  const message = formatError(error);
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-2">
      <p className="text-xs text-text-muted italic max-w-[240px] leading-relaxed">
        Couldn&rsquo;t load {label} right now. The other tiles still work —
        we&rsquo;ve logged the error for the team.
      </p>
      {message && (
        <pre className="mt-1 w-full max-w-full overflow-auto rounded border border-border/60 bg-surface-muted px-2 py-1.5 text-left text-[10px] leading-snug text-text-subtle tabular-nums whitespace-pre-wrap break-words">
          {message}
        </pre>
      )}
    </div>
  );
}

function formatError(err: unknown): string | null {
  if (!err) return null;
  if (err instanceof Error) {
    // Keep it short — one line for name+message, first frame of the
    // stack so the tile doesn't dominate the tile body.
    const firstFrame = err.stack?.split("\n").slice(1, 2).join("").trim();
    return `${err.name}: ${err.message}${firstFrame ? `\n${firstFrame}` : ""}`;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
