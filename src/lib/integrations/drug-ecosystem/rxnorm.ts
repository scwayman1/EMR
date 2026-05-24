// RxNorm (NLM RxNav) client.
//
// RxNorm is the U.S. standard for medication terminology — every
// dispensable clinical drug has a unique RXCUI. Pharmacies prefer
// RXCUI over free-text drug names when receiving NCPDP SCRIPT
// messages because it resolves brand/generic/strength ambiguity.
//
// This module is a thin typed wrapper around the public RxNav REST
// API: https://lhncbc.nlm.nih.gov/RxNav/APIs/api-RxNorm.html
//
// We expose three operations the EMR needs:
//   • findRxcui(name)       — name → RXCUI (best match)
//   • lookupRxcui(rxcui)    — RXCUI → canonical name + related codes
//   • findInteractions(...) — Drug-drug interactions for one or more RXCUIs
//
// Cannabis caveat: most cannabis products do NOT have an RXCUI because
// they aren't FDA-approved. `findRxcui` will return `null` for those,
// which the caller should treat as expected — the NCPDP message can
// still carry a free-text description.

import { z } from "zod";

import type { FetchLike } from "../pharmacy/surescripts-client";

export interface RxNormClientConfig {
  endpoint?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

const DEFAULT_ENDPOINT = "https://rxnav.nlm.nih.gov/REST";
const DEFAULT_TIMEOUT_MS = 8_000;

const findResponseSchema = z.object({
  idGroup: z
    .object({
      rxnormId: z.array(z.string()).optional(),
      name: z.string().optional(),
    })
    .optional(),
});

const propertiesResponseSchema = z.object({
  properties: z
    .object({
      rxcui: z.string(),
      name: z.string(),
      synonym: z.string().optional(),
      tty: z.string().optional(),
      language: z.string().optional(),
    })
    .nullable()
    .optional(),
});

const allRelatedResponseSchema = z.object({
  allRelatedGroup: z
    .object({
      conceptGroup: z
        .array(
          z.object({
            tty: z.string(),
            conceptProperties: z
              .array(
                z.object({
                  rxcui: z.string(),
                  name: z.string(),
                  synonym: z.string().optional(),
                  tty: z.string(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

const interactionResponseSchema = z.object({
  fullInteractionTypeGroup: z
    .array(
      z.object({
        sourceName: z.string(),
        fullInteractionType: z
          .array(
            z.object({
              minConcept: z
                .array(z.object({ rxcui: z.string(), name: z.string() }))
                .optional(),
              interactionPair: z
                .array(
                  z.object({
                    severity: z.string().optional(),
                    description: z.string().optional(),
                  }),
                )
                .optional(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});

export interface RxNormConcept {
  rxcui: string;
  name: string;
  tty?: string;
  synonym?: string;
}

export interface RxNormLookupResult {
  rxcui: string;
  name: string;
  tty?: string;
  /** Related ingredient (IN), branded drug (BN), etc. */
  related: RxNormConcept[];
}

export interface RxNormInteraction {
  source: string;
  drugs: { rxcui: string; name: string }[];
  severity?: string;
  description?: string;
}

export class RxNormError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RxNormError";
  }
}

export class RxNormClient {
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(config: RxNormClientConfig = {}) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.fetchImpl = config.fetchImpl ?? defaultFetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Resolve a free-text drug name to an RXCUI. Returns null if no match. */
  async findRxcui(name: string): Promise<string | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const url = `${this.endpoint}/rxcui.json?name=${encodeURIComponent(trimmed)}&search=1`;
    const json = await this.get(url);
    const parsed = findResponseSchema.parse(json);
    return parsed.idGroup?.rxnormId?.[0] ?? null;
  }

  /** Look up a concept by RXCUI and return its canonical name + related codes. */
  async lookupRxcui(rxcui: string): Promise<RxNormLookupResult | null> {
    const propsUrl = `${this.endpoint}/rxcui/${encodeURIComponent(rxcui)}/properties.json`;
    const propsJson = await this.get(propsUrl);
    const propsParsed = propertiesResponseSchema.parse(propsJson);
    const properties = propsParsed.properties;
    if (!properties) return null;

    const relatedUrl = `${this.endpoint}/rxcui/${encodeURIComponent(rxcui)}/allrelated.json`;
    const relatedJson = await this.get(relatedUrl);
    const relatedParsed = allRelatedResponseSchema.parse(relatedJson);
    const related: RxNormConcept[] = [];
    for (const group of relatedParsed.allRelatedGroup?.conceptGroup ?? []) {
      for (const concept of group.conceptProperties ?? []) {
        related.push({
          rxcui: concept.rxcui,
          name: concept.name,
          tty: concept.tty,
          synonym: concept.synonym,
        });
      }
    }

    return {
      rxcui: properties.rxcui,
      name: properties.name,
      tty: properties.tty,
      related,
    };
  }

  /** Find drug-drug interactions for a set of RXCUIs. */
  async findInteractions(rxcuis: string[]): Promise<RxNormInteraction[]> {
    if (rxcuis.length < 2) return [];
    const url = `${this.endpoint}/interaction/list.json?rxcuis=${rxcuis.join("+")}`;
    const json = await this.get(url);
    const parsed = interactionResponseSchema.parse(json);
    const out: RxNormInteraction[] = [];
    for (const group of parsed.fullInteractionTypeGroup ?? []) {
      for (const full of group.fullInteractionType ?? []) {
        const drugs = (full.minConcept ?? []).map((c) => ({
          rxcui: c.rxcui,
          name: c.name,
        }));
        for (const pair of full.interactionPair ?? []) {
          out.push({
            source: group.sourceName,
            drugs,
            severity: pair.severity,
            description: pair.description,
          });
        }
      }
    }
    return out;
  }

  private async get(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        body: "",
        signal: controller.signal,
      });
      const text = await res.text();
      if (!res.ok) {
        throw new RxNormError(
          `RxNav returned ${res.status}`,
          res.status >= 500 ? "gateway_error" : "client_error",
          res.status,
        );
      }
      try {
        return JSON.parse(text);
      } catch {
        throw new RxNormError("RxNav response was not JSON", "unparseable");
      }
    } catch (err) {
      if (err instanceof RxNormError) throw err;
      if ((err as { name?: string }).name === "AbortError") {
        throw new RxNormError("RxNav request timed out", "timeout");
      }
      throw new RxNormError(
        `Network error: ${(err as Error).message}`,
        "network_error",
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

const defaultFetch: FetchLike = async (url, init) => {
  const res = await fetch(url, {
    method: init.method,
    headers: init.headers,
    // RxNav accepts GET only — body is dropped for GET requests.
    body: init.method === "GET" ? undefined : init.body,
    signal: init.signal,
  });
  return {
    ok: res.ok,
    status: res.status,
    text: () => res.text(),
    headers: res.headers,
  };
};

// ---------------------------------------------------------------------------
// Mock transport (matches the surescripts mock pattern).
// ---------------------------------------------------------------------------

export interface RxNormMockOptions {
  /** Map of name → RXCUI for findRxcui responses. */
  knownDrugs?: Record<string, string>;
  /** Map of RXCUI → lookup result. */
  knownConcepts?: Record<string, RxNormLookupResult>;
  /** Hard-coded interactions returned for /interaction/list requests. */
  interactions?: RxNormInteraction[];
}

export function createMockRxNormTransport(
  opts: RxNormMockOptions = {},
): FetchLike {
  return async (url) => {
    const u = new URL(url);
    if (u.pathname.endsWith("/rxcui.json")) {
      const name = u.searchParams.get("name") ?? "";
      const rxcui = opts.knownDrugs?.[name];
      const body = rxcui
        ? JSON.stringify({ idGroup: { rxnormId: [rxcui], name } })
        : JSON.stringify({ idGroup: { name } });
      return jsonResponse(body);
    }
    const propertiesMatch = u.pathname.match(/\/rxcui\/([^/]+)\/properties\.json$/);
    if (propertiesMatch) {
      const rxcui = decodeURIComponent(propertiesMatch[1]);
      const concept = opts.knownConcepts?.[rxcui];
      const body = concept
        ? JSON.stringify({
            properties: {
              rxcui: concept.rxcui,
              name: concept.name,
              tty: concept.tty,
            },
          })
        : JSON.stringify({ properties: null });
      return jsonResponse(body);
    }
    const allRelatedMatch = u.pathname.match(/\/rxcui\/([^/]+)\/allrelated\.json$/);
    if (allRelatedMatch) {
      const rxcui = decodeURIComponent(allRelatedMatch[1]);
      const concept = opts.knownConcepts?.[rxcui];
      const conceptGroup = concept
        ? [
            {
              tty: "ALL",
              conceptProperties: concept.related.map((c) => ({
                rxcui: c.rxcui,
                name: c.name,
                tty: c.tty ?? "IN",
                synonym: c.synonym,
              })),
            },
          ]
        : [];
      return jsonResponse(
        JSON.stringify({ allRelatedGroup: { conceptGroup } }),
      );
    }
    if (u.pathname.endsWith("/interaction/list.json")) {
      const grouped =
        (opts.interactions ?? []).length === 0
          ? []
          : [
              {
                sourceName:
                  opts.interactions?.[0]?.source ?? "ONCHigh",
                fullInteractionType: [
                  {
                    minConcept:
                      opts.interactions?.[0]?.drugs.map((d) => ({
                        rxcui: d.rxcui,
                        name: d.name,
                      })) ?? [],
                    interactionPair: (opts.interactions ?? []).map((i) => ({
                      severity: i.severity,
                      description: i.description,
                    })),
                  },
                ],
              },
            ];
      return jsonResponse(
        JSON.stringify({ fullInteractionTypeGroup: grouped }),
      );
    }
    return jsonResponse(JSON.stringify({}));
  };
}

function jsonResponse(body: string) {
  return {
    ok: true,
    status: 200,
    text: async () => body,
  };
}
