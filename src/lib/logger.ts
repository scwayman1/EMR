import pino from "pino";

// Define strict redaction paths for PHI (Protected Health Information)
// and PII (Personally Identifiable Information).
const redactPaths = [
  // Authentication & Secrets
  "req.headers.authorization",
  "req.headers.cookie",
  "password",
  "token",
  "secret",
  
  // PII & PHI Identifiers
  "email",
  "userEmail",
  "patientEmail",
  "ssn",
  "phoneNumber",
  "patientName",
  "firstName",
  "lastName",
  
  // Clinical Data
  "diagnosis",
  "vitals",
  "symptoms",
  "medications",
  
  // Nested paths
  "req.body.patient",
  "*.patient.*",
];

const isProduction = process.env.NODE_ENV === "production";

// Create the core logger instance
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // Aggressively strip sensitive fields before they ever hit stdout/Render logs
  redact: {
    paths: redactPaths,
    censor: "[REDACTED PHI/PII]",
  },
  // In local dev, use pino-pretty for readable logs.
  // In production, emit raw JSON so Datadog/Render can parse it efficiently.
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }),
});
