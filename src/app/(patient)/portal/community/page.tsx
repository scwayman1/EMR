import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell, PageHeader } from "@/components/shell/PageHeader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LeafSprig, EditorialRule } from "@/components/ui/ornament";
import {
  findResources,
  detectCategories,
} from "@/lib/domain/community-resources";

export const metadata = { title: "Community Resources" };

// ---------------------------------------------------------------------------
// EMR-086: Community Resource Connector
// ---------------------------------------------------------------------------

export default async function CommunityPage() {
  const user = await requireRole("patient");

  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      chartSummary: true,
    },
  });

  if (!patient) redirect("/portal/intake");

  // Build the search input from chart context
  const conditionText = [
    patient.presentingConcerns ?? "",
    patient.chartSummary?.summaryMd ?? "",
  ].join(" ");

  const categories = detectCategories(conditionText);
  const matches = findResources({
    state: patient.state,
    city: patient.city,
    zip: patient.postalCode,
    conditionText,
    categories,
  });

  const localMatches = matches.filter(
    (m) => m.resource.state === patient.state || m.resource.region,
  );
  const nationalMatches = matches.filter((m) => m.resource.national);

  // Show top 8 by score
  const topMatches = matches.slice(0, 8);

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PageHeader
        eyebrow="Community"
        title="Resources near you"
        description={
          patient.city || patient.state
            ? `Trusted community organizations matched to your conditions${patient.city ? ` near ${patient.city}` : patient.state ? ` in ${patient.state}` : ""}.`
            : "Trusted community organizations matched to your medical needs."
        }
      />

      {/* Detected categories */}
      {categories.length > 0 && (
        <Card tone="ambient" className="mb-8">
          <CardContent className="py-5">
            <div className="flex items-start gap-3">
              <LeafSprig size={18} className="text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-text">
                  Based on your chart, we&apos;re looking for resources that
                  help with:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {categories.map((c) => (
                    <Badge key={c} tone="accent" className="text-[10px]">
                      {c.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match list */}
      {topMatches.length === 0 ? (
        <EmptyState
          title="No community matches yet"
          description="Once your intake is complete and your care team adds a diagnosis, we'll match you with local organizations that can help."
        />
      ) : (
        <div className="space-y-4">
          {topMatches.map(({ resource, matchScore, matchedOn }) => (
            <Card key={resource.id} tone="raised" className="card-hover">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">
                      {resource.name}
                    </CardTitle>
                    <CardDescription>
                      {resource.organization}
                      {resource.city && resource.state && (
                        <>
                          {" · "}
                          {resource.city}, {resource.state}
                        </>
                      )}
                      {resource.national && " · National"}
                    </CardDescription>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`inline-flex items-center justify-center h-9 w-9 rounded-full text-white text-xs font-display ${
                        matchScore >= 80
                          ? "bg-accent"
                          : matchScore >= 60
                            ? "bg-highlight"
                            : "bg-border-strong"
                      }`}
                    >
                      {matchScore}
                    </div>
                    <p className="text-[9px] text-text-subtle mt-1">match</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-muted leading-relaxed mb-3">
                  {resource.description}
                </p>

                <div className="rounded-lg bg-accent/[0.04] border border-accent/15 p-3 mb-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-accent mb-1">
                    What to expect when you reach out
                  </p>
                  <p className="text-xs text-text leading-relaxed">
                    {resource.whatToExpect}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge
                    tone={resource.feeStructure === "free" ? "success" : "neutral"}
                    className="text-[9px]"
                  >
                    {resource.feeStructure === "free"
                      ? "Free"
                      : resource.feeStructure === "sliding_scale"
                        ? "Sliding scale"
                        : resource.feeStructure === "fee_based"
                          ? "Fee-based"
                          : "Varies"}
                  </Badge>
                  {matchedOn.slice(0, 3).map((reason) => (
                    <Badge key={reason} tone="neutral" className="text-[9px]">
                      {reason}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <a
                    href={resource.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline font-medium"
                  >
                    Visit website &rarr;
                  </a>
                  {resource.phone && (
                    <a
                      href={`tel:${resource.phone.replace(/\D/g, "")}`}
                      className="text-text-muted hover:text-text"
                    >
                      {resource.phone}
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditorialRule className="my-10" />

      <Card tone="raised">
        <CardContent className="py-6">
          <div className="flex items-start gap-3">
            <LeafSprig size={18} className="text-accent mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-text">
                These are independent organizations
              </p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Green Path Health doesn&apos;t run these resources — we just
                connect you to them. Each organization has its own enrollment,
                policies, and confidentiality practices. If you have questions
                about whether one is right for you, message your care team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
