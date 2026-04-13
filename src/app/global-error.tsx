"use client";

/**
 * Global error boundary — catches unhandled errors in server components.
 * Shows a friendly message instead of raw stack traces. NEVER exposes
 * internal error details to the user.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#FEFCF6",
          color: "#2C3E2D",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "420px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌿</div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: "0.95rem",
              color: "#6B7D6E",
              lineHeight: 1.6,
              marginBottom: "1.5rem",
            }}
          >
            We hit an unexpected issue. Your data is safe — this is a
            display problem, not a data problem. Try refreshing, or
            contact your care team if it keeps happening.
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "0.5rem",
              border: "1px solid #3A8560",
              backgroundColor: "#3A8560",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "1.5rem",
                fontSize: "0.7rem",
                color: "#9CA89E",
              }}
            >
              Error reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
