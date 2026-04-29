// EMR-304 — public surface for the guardrail layer.
// Every AI surface should import `evaluateGuardrails` and `buildSystemPreamble`
// from here, not from internal modules.

export type {
  AgentAudience,
  AgentSurface,
  GuardrailContext,
  GuardrailDecision,
  GuardrailTopic,
} from "./types";

export {
  evaluateGuardrails,
  buildSystemPreamble,
} from "./differentiation";

export { SCOPE_RULES } from "./scope-rules";

export {
  DIFFERENTIATION_EVAL_ROWS,
  type DifferentiationEvalRow,
} from "./eval-questions";
