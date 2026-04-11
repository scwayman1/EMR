import type { ModelClient } from "./types";

/**
 * A structured model error. Carries a stable `code` so the UI can render a
 * friendly message without needing to parse provider JSON.
 *
 * Codes:
 *   credit_limit   — 402 / account is out of credits or over budget
 *   rate_limited   — 429 / too many requests
 *   unauthorized   — 401 / bad API key
 *   bad_request    — 400 / malformed prompt or params
 *   server_error   — 5xx / provider hiccup
 *   empty_response — provider returned 200 but no content
 *   network        — fetch itself failed
 *   unknown        — fallback
 */
export type ModelErrorCode =
  | "credit_limit"
  | "rate_limited"
  | "unauthorized"
  | "bad_request"
  | "server_error"
  | "empty_response"
  | "network"
  | "unknown";

export class ModelError extends Error {
  readonly code: ModelErrorCode;
  readonly status: number | null;
  /** Short, user-friendly message suitable for surfacing in the UI. */
  readonly friendly: string;
  /** Raw provider body, if any. Safe to log, not safe to render. */
  readonly providerBody: string | null;

  constructor(opts: {
    code: ModelErrorCode;
    status?: number | null;
    friendly: string;
    providerBody?: string | null;
  }) {
    super(opts.friendly);
    this.name = "ModelError";
    this.code = opts.code;
    this.status = opts.status ?? null;
    this.friendly = opts.friendly;
    this.providerBody = opts.providerBody ?? null;
  }
}

/** Type guard: `err instanceof ModelError` isn't reliable across RSC boundaries. */
export function isModelError(err: unknown): err is ModelError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "ModelError" &&
    typeof (err as { code?: unknown }).code === "string" &&
    typeof (err as { friendly?: unknown }).friendly === "string"
  );
}

/**
 * Deterministic templated model client. Used in dev, tests, and CI — so the
 * agent harness is runnable with zero external dependencies.
 */
export class StubModelClient implements ModelClient {
  async complete(prompt: string, _options?: { maxTokens?: number; temperature?: number }) {
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
 * OpenRouter model client.
 *
 * OpenRouter exposes a single OpenAI-compatible endpoint that can route to
 * dozens of providers (Anthropic, OpenAI, Meta, Google, etc.). That keeps
 * the agent harness provider-agnostic and the model choice driven by env.
 *
 * Configure with:
 *   OPENROUTER_API_KEY   — required
 *   OPENROUTER_MODEL     — optional, defaults to anthropic/claude-sonnet-4.5
 *   OPENROUTER_SITE_URL  — optional, for OpenRouter attribution
 *   OPENROUTER_APP_NAME  — optional, for OpenRouter attribution
 */
export class OpenRouterModelClient implements ModelClient {
  private readonly endpoint = "https://openrouter.ai/api/v1/chat/completions";
  private readonly model: string;
  private readonly apiKey: string;
  private readonly siteUrl: string | undefined;
  private readonly appName: string;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY is required for OpenRouterModelClient");
    }
    this.apiKey = apiKey;
    this.model = process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";
    this.siteUrl = process.env.OPENROUTER_SITE_URL;
    this.appName = process.env.OPENROUTER_APP_NAME ?? "Cannabis Care Platform";
  }

  async complete(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": this.appName,
    };
    // OpenRouter recommends these attribution headers but they are optional.
    if (this.siteUrl) headers["HTTP-Referer"] = this.siteUrl;

    let response: Response;
    try {
      response = await fetch(this.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: options?.maxTokens ?? 1024,
          temperature: options?.temperature ?? 0.3,
        }),
      });
    } catch (err) {
      throw new ModelError({
        code: "network",
        friendly:
          "Couldn't reach the AI provider. Check your connection and try again.",
        providerBody: err instanceof Error ? err.message : String(err),
      });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw classifyOpenRouterError(response.status, body);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new ModelError({
        code: "empty_response",
        friendly:
          "The AI provider returned an empty response. Try again — if it keeps happening, try a different refinement mode.",
      });
    }
    return content;
  }
}

/**
 * Turn an OpenRouter HTTP error into a structured ModelError with a
 * user-friendly message. We deliberately do NOT leak provider JSON into
 * the `friendly` field — that's rendered to clinicians and should read
 * like a human wrote it.
 */
function classifyOpenRouterError(status: number, body: string): ModelError {
  // Best-effort parse of the provider error message for the log trail.
  let providerMessage: string | null = null;
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; code?: number };
    };
    if (parsed?.error?.message) providerMessage = parsed.error.message;
  } catch {
    providerMessage = body.slice(0, 500) || null;
  }

  if (status === 402) {
    return new ModelError({
      code: "credit_limit",
      status,
      friendly:
        "AI is temporarily unavailable — the account has reached its credit limit. Drafting still works, just without inline AI refinements right now.",
      providerBody: providerMessage,
    });
  }
  if (status === 429) {
    return new ModelError({
      code: "rate_limited",
      status,
      friendly:
        "The AI provider is rate-limited right now. Wait a few seconds and try again.",
      providerBody: providerMessage,
    });
  }
  if (status === 401 || status === 403) {
    return new ModelError({
      code: "unauthorized",
      status,
      friendly:
        "AI is temporarily unavailable — the provider credentials need attention. An admin has been notified.",
      providerBody: providerMessage,
    });
  }
  if (status === 400) {
    return new ModelError({
      code: "bad_request",
      status,
      friendly:
        "AI couldn't process this request. Try a different refinement mode, or shorten the section before retrying.",
      providerBody: providerMessage,
    });
  }
  if (status >= 500) {
    return new ModelError({
      code: "server_error",
      status,
      friendly:
        "The AI provider had a hiccup. Try again in a moment.",
      providerBody: providerMessage,
    });
  }
  return new ModelError({
    code: "unknown",
    status,
    friendly:
      "AI refinement failed. Try again in a moment.",
    providerBody: providerMessage,
  });
}

/**
 * Resolve the active model client based on environment. Defaults to the
 * deterministic stub so the harness is always runnable, even without keys.
 */
export function resolveModelClient(): ModelClient {
  const kind = (process.env.AGENT_MODEL_CLIENT ?? "stub").toLowerCase();
  if (kind === "openrouter") return new OpenRouterModelClient();
  return new StubModelClient();
}
