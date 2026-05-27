import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { PageHeader, PageShell } from "@/components/shell/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MENU_VERSION,
  menuCourses,
} from "@/lib/platform/licensing-menu";
import { MODULE_CATALOG } from "@/lib/platform/modules";

export const metadata = { title: "Licensing menu" };

const STARS = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 3 - n));

export default async function LicensingMenuPage() {
  await requireUser();
  const courses = menuCourses();

  return (
    <PageShell maxWidth="max-w-[960px]">
      <PageHeader
        eyebrow={`Edition ${MENU_VERSION}`}
        title="Licensing menu — Michelin-style"
        description="Three stars: production ready. Two stars: battle-tested in pilots. One star: preview. Best paired with each course noted below."
        actions={
          <div className="flex gap-2">
            <Link href="/api/platform/licensing/menu.html" target="_blank">
              <Button variant="secondary">Print HTML</Button>
            </Link>
            <Link href="/api/platform/licensing/menu.json" target="_blank">
              <Button variant="secondary">Raw JSON</Button>
            </Link>
            <Link href="/licensing" target="_blank">
              <Button>Public menu</Button>
            </Link>
          </div>
        }
      />

      {courses.map((course) => (
        <section key={course.pillar} className="mb-10">
          <header className="mb-3">
            <h2 className="font-display text-2xl tracking-tight">{course.pillarLabel}</h2>
            <p className="italic text-text-muted text-sm mt-1">{course.blurb}</p>
          </header>

          <div className="space-y-3">
            {course.modules.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>
                        {m.name}{" "}
                        <span
                          className="text-[color:var(--highlight-hover)] ml-2"
                          aria-label={m.starsLabel}
                          title={m.starsLabel}
                        >
                          {STARS(m.stars)}
                        </span>
                      </CardTitle>
                      <CardDescription>{m.tagline}</CardDescription>
                    </div>
                    <Badge tone="neutral">{m.priceDisplay}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-text-muted leading-relaxed">{m.description}</p>
                  {m.pairsWith.length > 0 && (
                    <p className="text-[11px] text-text-subtle mt-3">
                      Best paired with:{" "}
                      {m.pairsWith
                        .map((p) =>
                          MODULE_CATALOG.find((mm) => mm.id === p)?.name ?? p,
                        )
                        .join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      <p className="text-[11px] text-text-subtle italic text-center mt-6">
        All prices are list per provider, per month, billed annually.
      </p>
    </PageShell>
  );
}
