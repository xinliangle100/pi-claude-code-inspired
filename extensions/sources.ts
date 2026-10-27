import { readFileSync } from "node:fs";
export const roles = ["code-explorer", "code-architect", "code-reviewer"] as const;
export type Role = typeof roles[number];
export function source(path: string): string {
  return readFileSync(new URL(`../upstream/plugins/feature-dev/${path}`, import.meta.url), "utf8");
}
export function body(text: string): string {
  if (!text.startsWith("---\n")) throw new Error("Expected pinned frontmatter");
  return text.slice(text.indexOf("\n---\n", 4) + 5);
}
export const compatibility = `Pi compatibility adapter (not part of the upstream prompt):
User-requested Pi mapping: /claude-inspired on or /feature-dev selects the current host model and thinking level for child agents instead of upstream sonnet. The old --map-sonnet-to-current spelling remains an alias. This is not model equivalence; no model or credentials are changed.
Launch parallel agents through feature_dev_agents, using role and separate task prompts. The tool runs independent actual agents; it does not replace them with the main agent.
TodoWrite maps to feature_dev_todos. Read/Glob/Grep/LS map to read/find/grep/ls when available through the host. NotebookRead, WebFetch, WebSearch, KillShell and BashOutput have no adapter: report the missing capability; never claim they ran or silently substitute.
Delegated agents do not receive Bash, edit or write. In particular the upstream reviewer asks for git diff but its allowed-tools declaration does not include Bash: the main agent must provide the relevant diff in the review task if available, otherwise report the limitation.
The seven phases, questions, user approvals, agent counts and reviewer confidence threshold in the following source remain unchanged. These are prompt instructions, not a hard-coded phase/approval enforcement engine.`;
export function workflow(feature: string): string {
  return `${compatibility}\n\n${body(source("commands/feature-dev.md")).replace("$ARGUMENTS", () => feature)}`;
}

/** User-requested trigger adaptation, NOT an upstream Claude Code system prompt. */
export function masterWorkflow(): string {
  return `Pi master-mode routing adapter (user-requested; not upstream policy):
For a new feature/development request, use the exact feature-dev workflow below. For a follow-up, clarification, approval, or review-fix choice in an existing feature, continue its current phase using conversation/todos; do not restart Phase 1 on every message. Start again only for a genuinely new feature or explicit /feature-dev invocation. Do not treat a greeting, unrelated factual question, or switch/status question as a new development task. If task/phase context is missing, ask rather than invent progress or prior approval. Routing and phase continuity are model instructions, not a hard-coded classifier or phase machine.
This section does not replace host project rules, permissions, tools, or user configuration. It is the public feature-dev plugin workflow, not the unpublished full Claude Code base prompt.
\n${workflow("The current new feature request in the conversation; for follow-ups continue the existing feature, not a new request.")}`;
}
