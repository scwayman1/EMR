import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { PageShell } from "@/components/shell/PageHeader";
import { PatientSectionNav } from "@/components/shell/PatientSectionNav";
import { RecapView, type RecapData } from "./recap-view";

export const metadata = { title: "Weekly Recap" };

export default async function WeeklyRecapPage() {
  const user = await requireRole("patient");
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true },
  });

  if (!patient) redirect("/portal/intake");

  const since = new Date(Date.now() - 7 * 86400000);

  const [outcomeLogs, doseLogs] = await Promise.all([
    prisma.outcomeLog.findMany({
      where: { patientId: patient.id, loggedAt: { gte: since } },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.doseLog.findMany({
      where: { patientId: patient.id, loggedAt: { gte: since } },
      include: { regimen: { include: { product: true } } },
      orderBy: { loggedAt: "asc" },
    }),
  ]);

  // Bucket outcome logs by metric.
  const bucket = (metric: "pain" | "sleep" | "anxiety" | "mood") =>
    outcomeLogs
      .filter((l) => l.metric === metric)
      .map((l) => ({ at: l.loggedAt.toISOString(), value: l.value }));

  // Best day = day with the highest average mood
  const moodByDay = new Map<string, number[]>();
  for (const log of outcomeLogs) {
    if (log.metric !== "mood") continue;
    const day = log.loggedAt.toISOString().slice(0, 10);
    const arr = moodByDay.get(day) ?? [];
    arr.push(log.value);
    moodByDay.set(day, arr);
  }
  let bestDay: { date: string; avg: number } | null = null;
  for (const [day, vals] of moodByDay.entries()) {
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (!bestDay || avg > bestDay.avg) bestDay = { date: day, avg };
  }

  // Most-used product = doseLog count by regimen
  const productCounts = new Map<string, { name: string; count: number }>();
  for (const dose of doseLogs) {
    if (!dose.regimen) continue;
    const key = dose.regimen.product.id;
    const entry = productCounts.get(key) ?? {
      name: dose.regimen.product.name,
      count: 0,
    };
    entry.count++;
    productCounts.set(key, entry);
  }
  let mostUsedProduct: { name: string; count: number } | null = null;
  for (const v of productCounts.values()) {
    if (!mostUsedProduct || v.count > mostUsedProduct.count) mostUsedProduct = v;
  }

  // Longest sleep score in last 7 days
  const sleepValues = bucket("sleep").map((s) => s.value);
  const longestSleep = sleepValues.length > 0 ? Math.max(...sleepValues) : null;

  // "Days with logged dose" for streak win
  const dayKeys = new Set(
    doseLogs.map((d) => d.loggedAt.toISOString().slice(0, 10))
  );
  const consistentDays = dayKeys.size;

  // Average mood across the week
  const moodValues = bucket("mood").map((m) => m.value);
  const avgMood =
    moodValues.length > 0
      ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length
      : null;

  const data: RecapData = {
    rangeStart: since.toISOString(),
    rangeEnd: new Date().toISOString(),
    firstName: patient.firstName,
    avgMood,
    metrics: {
      pain: bucket("pain"),
      sleep: bucket("sleep"),
      anxiety: bucket("anxiety"),
    },
    highlights: {
      bestDay,
      mostUsedProduct,
      longestSleep,
    },
    wins: {
      doseDaysLogged: consistentDays,
      checkInsLogged: outcomeLogs.length,
    },
  };

  return (
    <PageShell maxWidth="max-w-[860px]">
      <PatientSectionNav section="health" />
      <RecapView data={data} />
    </PageShell>
  );
}
