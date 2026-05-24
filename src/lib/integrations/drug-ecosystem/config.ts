// Drug ecosystem integration — runtime configuration.
//
// Reads Surescripts / RTPB / ePA credentials from environment variables
// and chooses the right endpoint per environment. Three environments
// are supported:
//
//   • sandbox      — local dev. Uses mock transports unless overridden.
//   • cert_tester  — Surescripts Certification Tester. Real wire format,
//                    test data only, requires real credentials.
//   • production   — live Surescripts gateway.
//
// Credentials live exclusively in env vars; this module never reads
// from the database, never logs the values, and exposes a `summarize()`
// helper for the integrations dashboard so we can show connection
// health without leaking secrets.

import {
  SURESCRIPTS_PRODUCTION_ENDPOINT,
  SURESCRIPTS_SANDBOX_ENDPOINT,
  type Environment as SurescriptsEnvironment,
} from "../pharmacy/surescripts-client";

/**
 * Surescripts Certification Tester endpoint. Used during pre-production
 * NCPDP SCRIPT certification — every certified EMR runs scripted
 * scenarios against this gateway before being granted production
 * credentials.
 *
 * See: https://surescripts.com/network-connections/certifications/
 */
export const SURESCRIPTS_CERT_TESTER_ENDPOINT =
  "https://certtester.surescripts.net/script/v2017071";

export type DrugEcosystemEnvironment =
  | "sandbox"
  | "cert_tester"
  | "production";

export interface DrugEcosystemConfig {
  environment: DrugEcosystemEnvironment;
  surescripts: {
    endpoint: string;
    accountId: string | null;
    prescriberSpi: string | null;
    apiKey: string | null;
    /** True when real credentials are present and the client should hit the wire. */
    configured: boolean;
  };
  /** Real-Time Prescription Benefit gateway (Surescripts RTPB / RTBC). */
  rtpb: {
    endpoint: string;
    apiKey: string | null;
    configured: boolean;
  };
  /** CoverMyMeds / Surescripts CompletEPA endpoint for electronic prior auth. */
  epa: {
    endpoint: string;
    apiKey: string | null;
    configured: boolean;
  };
  /** RxNav (NLM RxNorm) — public, no credentials required. */
  rxnorm: {
    endpoint: string;
  };
}

const DEFAULT_RTPB_ENDPOINTS: Record<DrugEcosystemEnvironment, string> = {
  sandbox: "https://sandbox.surescripts.net/rtpb/v1",
  cert_tester: "https://certtester.surescripts.net/rtpb/v1",
  production: "https://gateway.surescripts.net/rtpb/v1",
};

const DEFAULT_EPA_ENDPOINTS: Record<DrugEcosystemEnvironment, string> = {
  sandbox: "https://sandbox.covermymeds.com/api/v1",
  cert_tester: "https://certtester.covermymeds.com/api/v1",
  production: "https://api.covermymeds.com/api/v1",
};

const RXNORM_ENDPOINT = "https://rxnav.nlm.nih.gov/REST";

function readEnv(key: string): string | null {
  const v = process.env[key];
  return v && v.length > 0 ? v : null;
}

function resolveSurescriptsEndpoint(
  env: DrugEcosystemEnvironment,
  override: string | null,
): string {
  if (override) return override;
  switch (env) {
    case "production":
      return SURESCRIPTS_PRODUCTION_ENDPOINT;
    case "cert_tester":
      return SURESCRIPTS_CERT_TESTER_ENDPOINT;
    case "sandbox":
    default:
      return SURESCRIPTS_SANDBOX_ENDPOINT;
  }
}

function resolveEnvironment(): DrugEcosystemEnvironment {
  const raw = (readEnv("DRUG_ECOSYSTEM_ENV") ?? "").toLowerCase();
  if (raw === "production") return "production";
  if (raw === "cert_tester" || raw === "cert-tester" || raw === "cert") {
    return "cert_tester";
  }
  return "sandbox";
}

/** Load configuration from process.env. Call at request time, not module init. */
export function loadDrugEcosystemConfig(): DrugEcosystemConfig {
  const environment = resolveEnvironment();

  const accountId = readEnv("SURESCRIPTS_ACCOUNT_ID");
  const prescriberSpi = readEnv("SURESCRIPTS_PRESCRIBER_SPI");
  const apiKey = readEnv("SURESCRIPTS_API_KEY");
  const endpoint = resolveSurescriptsEndpoint(
    environment,
    readEnv("SURESCRIPTS_ENDPOINT"),
  );

  const rtpbEndpoint =
    readEnv("RTPB_ENDPOINT") ?? DEFAULT_RTPB_ENDPOINTS[environment];
  const rtpbApiKey = readEnv("RTPB_API_KEY");

  const epaEndpoint =
    readEnv("EPA_ENDPOINT") ?? DEFAULT_EPA_ENDPOINTS[environment];
  const epaApiKey = readEnv("EPA_API_KEY");

  return {
    environment,
    surescripts: {
      endpoint,
      accountId,
      prescriberSpi,
      apiKey,
      configured: Boolean(accountId && prescriberSpi && apiKey),
    },
    rtpb: {
      endpoint: rtpbEndpoint,
      apiKey: rtpbApiKey,
      configured: Boolean(rtpbApiKey),
    },
    epa: {
      endpoint: epaEndpoint,
      apiKey: epaApiKey,
      configured: Boolean(epaApiKey),
    },
    rxnorm: {
      endpoint: readEnv("RXNORM_ENDPOINT") ?? RXNORM_ENDPOINT,
    },
  };
}

/** Surescripts environment string compatible with the existing client. */
export function toSurescriptsEnvironment(
  env: DrugEcosystemEnvironment,
): SurescriptsEnvironment {
  // The legacy client only distinguishes sandbox vs production; cert_tester
  // is wire-compatible with production so we report it as "production".
  return env === "production" || env === "cert_tester"
    ? "production"
    : "sandbox";
}

/** Secret-free summary safe to surface on the integrations dashboard. */
export interface ConfigSummary {
  environment: DrugEcosystemEnvironment;
  surescripts: { endpoint: string; configured: boolean };
  rtpb: { endpoint: string; configured: boolean };
  epa: { endpoint: string; configured: boolean };
  rxnorm: { endpoint: string };
}

export function summarize(config: DrugEcosystemConfig): ConfigSummary {
  return {
    environment: config.environment,
    surescripts: {
      endpoint: config.surescripts.endpoint,
      configured: config.surescripts.configured,
    },
    rtpb: {
      endpoint: config.rtpb.endpoint,
      configured: config.rtpb.configured,
    },
    epa: {
      endpoint: config.epa.endpoint,
      configured: config.epa.configured,
    },
    rxnorm: { endpoint: config.rxnorm.endpoint },
  };
}
