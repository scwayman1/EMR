// EMR-013 — FHIR CapabilityStatement.
//
// FHIR clients hit /metadata first to discover what we support. This is
// the bare minimum that satisfies discovery + tells partners what
// resources our scaffold will accept.

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    resourceType: "CapabilityStatement",
    status: "draft",
    date: new Date().toISOString(),
    publisher: "LeafJourney",
    kind: "instance",
    software: {
      name: "LeafJourney EMR FHIR Adapter",
      version: "0.1.0-scaffold",
    },
    fhirVersion: "4.0.1",
    format: ["application/fhir+json"],
    rest: [
      {
        mode: "server",
        resource: [
          {
            type: "Patient",
            interaction: [{ code: "read" }, { code: "search-type" }],
            searchParam: [
              { name: "identifier", type: "token" },
              { name: "name", type: "string" },
            ],
          },
          {
            type: "Encounter",
            interaction: [{ code: "read" }, { code: "search-type" }],
            searchParam: [{ name: "patient", type: "reference" }],
          },
          {
            type: "Condition",
            interaction: [{ code: "read" }, { code: "search-type" }],
          },
          {
            type: "MedicationStatement",
            interaction: [{ code: "read" }, { code: "search-type" }],
          },
          {
            type: "Observation",
            interaction: [{ code: "read" }, { code: "search-type" }],
          },
          {
            type: "DocumentReference",
            interaction: [{ code: "read" }, { code: "create" }],
          },
        ],
        operation: [
          {
            name: "everything",
            definition: "/api/fhir/Patient/[id]/$everything",
          },
          {
            name: "import-ccd",
            definition: "/api/fhir/$import-ccd",
          },
        ],
      },
    ],
  });
}
