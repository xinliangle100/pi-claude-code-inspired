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
The user explicitly maps the upstream sonnet agent model to the current Pi model and thinking level. This is not model equivalence.
Launch parallel agents through feature_dev_agents, using role and separate task prompts. The tool runs independent actual agents; it does not replace them with the main agent.
TodoWrite maps to feature_dev_todos. Read/Glob/Grep/LS map to read/find/grep/ls when available through the host. NotebookRead, WebFetch, WebSearch, KillShell and BashOutput have no adapter: report the missing capability; never claim they ran or silently substitute.
Delegated agents do not receive Bash, edit or write. In particular the upstream reviewer asks for git diff but its allowed-tools declaration does not include Bash: the main agent must provide the relevant diff in the review task if available, otherwise report the limitation.
The seven phases, questions, user approvals, agent counts and reviewer confidence threshold in the following source remain unchanged. These are prompt instructions, not a hard-coded phase/approval enforcement engine.`;
export function workflow(feature: string): string {
  return `${compatibility}\n\n${body(source("commands/feature-dev.md")).replace("$ARGUMENTS", () => feature)}`;
}
