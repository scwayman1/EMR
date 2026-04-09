import type { ModelClient } from "./types";

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

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: options?.maxTokens ?? 1024,
        temperature: options?.temperature ?? 0.3,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `OpenRouter error ${response.status}: ${body.slice(0, 500)}`
      );
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new Error("OpenRouter returned an empty response");
    }
    return content;
  }
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
