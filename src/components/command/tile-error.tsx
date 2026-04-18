/**
 * Standardized fallback body rendered inside a Command-Center tile's
 * Shell when its data fetch throws. The Shell keeps the tile's grid
 * slot (span / tone / header) intact so the surrounding layout doesn't
 * reflow, and the clinician sees something calm + honest instead of a
 * crash of the whole dashboard.
 *
 * The actual error is logged server-side with console.error — visible
 * in Render logs alongside the Next.js request digest — so the team
 * can diagnose without the clinician having to copy anything.
 */
export function TileErrorBody({ label }: { label: string }) {
  return (
    <div className="h-full flex items-center justify-center text-center p-4">
      <p className="text-xs text-text-muted italic max-w-[220px] leading-relaxed">
        Couldn&rsquo;t load {label} right now. The other tiles still work —
        we&rsquo;ve logged the error for the team.
      </p>
    </div>
  );
}
