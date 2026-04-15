// BYOK — Bring Your Own Key / Model Selection
// Let practices configure their AI model provider and API key.

export type ModelProvider = "openrouter" | "openai" | "anthropic" | "local" | "stub";

export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  displayName: string;
  apiKeySet: boolean;
  isDefault: boolean;
  costPer1kTokens?: number;
  maxTokens: number;
  temperature: number;
}

export interface ProviderOption {
  provider: ModelProvider;
  label: string;
  description: string;
  models: { id: string; name: string; costPer1kTokens: number; recommended?: boolean }[];
  requiresApiKey: boolean;
}

// ── Available providers ────────────────────────────────

export const PROVIDERS: ProviderOption[] = [
  {
    provider: "openrouter",
    label: "OpenRouter",
    description: "Access 100+ models through a single API. Recommended for most practices.",
    requiresApiKey: true,
    models: [
      { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", costPer1kTokens: 0.0001, recommended: true },
      { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", costPer1kTokens: 0.003 },
      { id: "anthropic/claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", costPer1kTokens: 0.0008 },
      { id: "openai/gpt-4o", name: "GPT-4o", costPer1kTokens: 0.005 },
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", costPer1kTokens: 0.00015 },
      { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", costPer1kTokens: 0.0004 },
    ],
  },
  {
    provider: "anthropic",
    label: "Anthropic (Direct)",
    description: "Direct access to Claude models. Best quality for clinical documentation.",
    requiresApiKey: true,
    models: [
      { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", costPer1kTokens: 0.003, recommended: true },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", costPer1kTokens: 0.0008 },
      { id: "claude-opus-4-6", name: "Claude Opus 4.6", costPer1kTokens: 0.015 },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI (Direct)",
    description: "Direct access to GPT models.",
    requiresApiKey: true,
    models: [
      { id: "gpt-4o", name: "GPT-4o", costPer1kTokens: 0.005, recommended: true },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", costPer1kTokens: 0.00015 },
    ],
  },
  {
    provider: "local",
    label: "Local / Self-Hosted",
    description: "Connect to a locally hosted model (Ollama, vLLM, etc.). Data never leaves your network.",
    requiresApiKey: false,
    models: [
      { id: "local/default", name: "Local model", costPer1kTokens: 0 },
    ],
  },
  {
    provider: "stub",
    label: "Demo Mode (No AI)",
    description: "Deterministic responses for testing. No API key required.",
    requiresApiKey: false,
    models: [
      { id: "stub", name: "Stub model", costPer1kTokens: 0 },
    ],
  },
];

export function getDefaultConfig(): ModelConfig {
  return {
    provider: "openrouter",
    modelId: "google/gemini-2.0-flash-001",
    displayName: "Gemini 2.0 Flash (via OpenRouter)",
    apiKeySet: false,
    isDefault: true,
    costPer1kTokens: 0.0001,
    maxTokens: 1024,
    temperature: 0.3,
  };
}
