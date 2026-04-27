"use client";

import { useEffect } from "react";

interface Row {
  id: string;
  timestamp: string;
  actorName: string;
  isAgent: boolean;
  action: string;
  subjectType: string;
  subjectId: string;
  metadata: string | null;
}

interface Filters {
  from?: string;
  to?: string;
  action?: string;
  subjectType?: string;
}

/**
 * Print-optimized client view. Auto-fires window.print() once the
 * page mounts so the user lands directly in the browser's
 * "Save as PDF" dialog. The print-only stylesheet hides the
 * on-screen header / "Print again" button when paper-rendering.
 */
export function AuditPdfClient({
  rows,
  orgName,
  filters,
}: {
  rows: Row[];
  orgName: string;
  filters: Filters;
}) {
  useEffect(() => {
    // Defer one tick so React has flushed the DOM before we trigger
    // the print dialog — otherwise Chrome can occasionally print
    // before fonts settle.
    const t = setTimeout(() => {
      window.print();
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const filterSummary = [
    filters.from && `From ${filters.from}`,
    filters.to && `To ${filters.to}`,
    filters.action && `Action: ${filters.action}`,
    filters.subjectType && `Subject: ${filters.subjectType}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 0.5in; size: letter; }
          body { background: #fff !important; }
        }
        .audit-pdf-root {
          font-family: "Inter", -apple-system, sans-serif;
          color: #1f2a24;
          padding: 24px 32px;
          background: #fff;
          max-width: 8.5in;
          margin: 0 auto;
        }
        .audit-pdf-root h1 {
          font-family: "Fraunces", Georgia, serif;
          font-size: 24px;
          font-weight: 500;
          letter-spacing: -0.01em;
          margin: 0 0 4px 0;
        }
        .audit-pdf-root table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-top: 16px;
        }
        .audit-pdf-root th {
          text-align: left;
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #6E6A60;
          border-bottom: 1px solid #1f2a24;
          padding: 6px 4px;
        }
        .audit-pdf-root td {
          border-bottom: 1px solid #EAE3D2;
          padding: 5px 4px;
          vertical-align: top;
          word-break: break-word;
        }
        .audit-pdf-root tr {
          page-break-inside: avoid;
        }
        .audit-pdf-root .meta {
          font-family: "JetBrains Mono", ui-monospace, monospace;
          font-size: 9px;
          color: #4A5651;
          background: #F5F0E3;
          padding: 4px 6px;
          border-radius: 3px;
          white-space: pre-wrap;
          margin-top: 3px;
        }
        .audit-pdf-root .agent-pill {
          display: inline-block;
          padding: 1px 4px;
          background: #F1E6F8;
          color: #5C4972;
          border-radius: 2px;
          font-family: "JetBrains Mono", monospace;
          font-size: 8.5px;
        }
        .audit-pdf-root .header-band {
          border-bottom: 2px solid #1F4D37;
          padding-bottom: 12px;
          margin-bottom: 8px;
        }
        .audit-pdf-root .legend {
          display: flex;
          gap: 16px;
          font-size: 9px;
          color: #6E6A60;
          margin-top: 6px;
        }
        .audit-pdf-root .footer-meta {
          margin-top: 24px;
          font-size: 9px;
          color: #6E6A60;
          text-align: center;
          border-top: 1px solid #EAE3D2;
          padding-top: 8px;
        }
      `}</style>

      <div className="audit-pdf-root">
        {/* On-screen toolbar (hidden in print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#F5F0E3",
            border: "1px solid #EAE3D2",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontSize: "12px", color: "#6E6A60" }}>
            Audit log report · {rows.length} entries · This page will
            auto-trigger your browser&apos;s print dialog. Choose
            &quot;Save as PDF&quot; as the destination.
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              background: "#1F4D37",
              color: "#FFF8E8",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Print again
          </button>
        </div>

        {/* Header */}
        <div className="header-band">
          <h1>Audit Log Report</h1>
          <p style={{ fontSize: "11px", color: "#6E6A60", margin: "4px 0 0" }}>
            {orgName} · Generated {generatedAt}
          </p>
          {filterSummary && (
            <p
              style={{
                fontSize: "10px",
                color: "#6E6A60",
                fontStyle: "italic",
                margin: "4px 0 0",
              }}
            >
              Filters: {filterSummary}
            </p>
          )}
          <p
            style={{
              fontSize: "10px",
              color: "#6E6A60",
              margin: "6px 0 0",
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            {rows.length.toLocaleString()} entries
          </p>
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <p
            style={{
              fontSize: "12px",
              color: "#6E6A60",
              textAlign: "center",
              padding: "40px",
            }}
          >
            No audit log entries match the current filters.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: "16%" }}>Timestamp</th>
                <th style={{ width: "18%" }}>Actor</th>
                <th style={{ width: "26%" }}>Action</th>
                <th style={{ width: "12%" }}>Subject</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {new Date(row.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    {row.isAgent ? (
                      <span className="agent-pill">{row.actorName}</span>
                    ) : (
                      <span style={{ fontWeight: 500 }}>{row.actorName}</span>
                    )}
                  </td>
                  <td
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: "9.5px",
                    }}
                  >
                    {row.action}
                  </td>
                  <td>
                    <span style={{ color: "#6E6A60" }}>{row.subjectType}</span>
                    {row.subjectId !== "—" && (
                      <div
                        style={{
                          fontFamily: '"JetBrains Mono", monospace',
                          fontSize: "8.5px",
                          color: "#8A8578",
                        }}
                      >
                        {row.subjectId.slice(0, 18)}
                      </div>
                    )}
                  </td>
                  <td>
                    {row.metadata && (
                      <div className="meta">
                        {row.metadata.length > 280
                          ? row.metadata.slice(0, 280) + "…"
                          : row.metadata}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="footer-meta">
          End of report · {rows.length.toLocaleString()} entries · Generated by
          Leafjourney EMR Mission Control
        </p>
      </div>
    </>
  );
}
