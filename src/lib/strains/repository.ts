// EMR-018 — Prisma adapter for strain queries.

import { prisma } from "@/lib/db/prisma";
import type { StrainRow } from "./finder";

export async function listActiveStrains(): Promise<StrainRow[]> {
  const rows = await prisma.strain.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      classification: true,
      thcPercent: true,
      cbdPercent: true,
      dominantTerpene: true,
      symptoms: true,
      effects: true,
      flavors: true,
      description: true,
    },
  });
  return rows as StrainRow[];
}

export async function getStrainBySlug(slug: string): Promise<StrainRow | null> {
  const row = await prisma.strain.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      classification: true,
      thcPercent: true,
      cbdPercent: true,
      dominantTerpene: true,
      symptoms: true,
      effects: true,
      flavors: true,
      description: true,
    },
  });
  return row as StrainRow | null;
}
