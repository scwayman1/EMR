// EMR-309 — public surface for the Ask Cindy agent.
export { askCindy, askCindyInput, type AskCindyInput, type AskCindyResult } from "./agent";
export {
  CINDY_HIGHLIGHTS,
  buildCindySystemPrompt,
  type CindyHighlight,
} from "./system-prompt";
