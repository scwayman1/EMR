import type { ModelClient } from "./types";

/**
 * Deterministic templated model client. Used in dev, tests, and CI — so the
 * agent harness is runnable with zero external dependencies.
 */
export class StubModelClient implements ModelClient {
  async complete(prompt: string, _options?: { maxTokens?: number; temperature?: number }) {
    // A very small set of heuristics to produce believable-ish output.
    const trimmed = prompt.trim().slice(0, 240);
    if (/summar(y|ize)/i.test(prompt)) {
      return `Summary draft (stub): ${trimmed}`;
    }
    if (/classify/i.test(prompt)) {
      return "other";
    }
    if (/note/i.test(prompt)) {
      return "Draft note (stub): see chart summary and recent outcome trends.";
    }
    return `[stub response] ${trimmed}`;
  }
}

/**
 * Claude model client. Lazily imports the SDK so it is not required for
 * local dev. Configured via ANTHROPIC_API_KEY.
 */
export class ClaudeModelClient implements ModelClient {
  async complete(prompt: string, options?: { maxTokens?: number; temperature?: number }) {
    // We deliberately do not import @anthropic-ai/sdk at module load so the
    // stub client works without the dep installed. Projects wiring this up
    // for real should add the SDK and replace this body.
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for ClaudeModelClient");
    }
    // Placeholder: real implementation would call the Messages API.
    // Kept minimal to avoid pulling the SDK into V1.
    return `[claude stub — wire SDK] ${prompt.slice(0, 120)}`;
  }
}

export function resolveModelClient(): ModelClient {
  const kind = process.env.AGENT_MODEL_CLIENT ?? "stub";
  if (kind === "claude") return new ClaudeModelClient();
  return new StubModelClient();
}
