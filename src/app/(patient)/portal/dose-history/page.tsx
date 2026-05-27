import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Dose History" };

export default async function DoseHistoryPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
  });

  if (!patient) {
    return (
      <PageShell>
        <p className="text-text-muted">Patient profile not found.</p>
      </PageShell>
    );
  }

  // EMR-221: Fetch the dose logs, joined with regimen to get product names
  const doseLogs = await prisma.doseLog.findMany({
    where: { patientId: patient.id },
    orderBy: { loggedAt: "desc" },
    include: {
      regimen: {
        include: { product: true }
      }
    },
    take: 50, // Display the last 50 for V1
  });

  return (
    <PageShell maxWidth="max-w-[880px]">
      <PageHeader
        eyebrow="My Health"
        title="Dose History"
        description="A timeline of your cannabis usage and product check-ins."
      />
      <PatientSectionNav section="health" />

      {doseLogs.length === 0 ? (
        <Card tone="glass" className="text-center py-16 mt-8">
          <CardContent>
            <div className="text-4xl mb-4">📓</div>
            <h2 className="text-xl font-display font-medium text-text mb-2">No doses logged yet</h2>
            <p className="text-sm text-text-muted mb-6">
              Track your usage to help your care team dial in your optimal regimen.
            </p>
            <a href="/portal/log-dose" className="inline-flex bg-[var(--accent)] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors">
              Log your first dose
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 relative border-l border-[var(--border)] ml-4 pl-6 space-y-8">
          {doseLogs.map((log) => (
            <div key={log.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-1.5 w-3 h-3 bg-[var(--accent)] rounded-full ring-4 ring-[var(--bg)]" />
              
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-text">
                  {formatDate(log.loggedAt)}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(log.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              <Card tone="raised" className="mt-2">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-text text-lg">
                        {log.regimen?.product.name || "Unknown Product"}
                      </h4>
                      <p className="text-sm text-text-muted mt-0.5">
                        {log.actualVolume} {log.volumeUnit} {log.route ? `via ${log.route.replace('_', ' ')}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.estimatedThcMg && log.estimatedThcMg > 0 && (
                        <Badge tone="warning">THC {log.estimatedThcMg.toFixed(1)}mg</Badge>
                      )}
                      {log.estimatedCbdMg && log.estimatedCbdMg > 0 && (
                        <Badge tone="success">CBD {log.estimatedCbdMg.toFixed(1)}mg</Badge>
                      )}
                    </div>
                  </div>
                  {log.note && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      <p className="text-sm text-text-muted italic">"{log.note}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
