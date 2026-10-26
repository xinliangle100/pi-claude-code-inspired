import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import type { ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { todoTool } from "./todos.ts";
import { body, compatibility, roles, source, type Role } from "./sources.ts";
export type Task = { prompt: string };
export function validateBatch(role: Role, tasks: Task[]): void {
  if (!roles.includes(role)) throw new Error("Unknown original agent role");
  const count = tasks.length;
  if (role === "code-reviewer" ? count !== 3 : count < 2 || count > 3)
    throw new Error("Upstream requires 2–3 explorers/architects or exactly 3 reviewers per parallel batch");
}
export async function parallel<T>(role: Role, tasks: Task[], run: (task: Task, index: number) => Promise<T>): Promise<T[]> {
  validateBatch(role, tasks);
  // All actual independent agent runs start before any result is awaited.
  // Preserve successful findings and make every failed child visible; no main-agent fallback.
  return Promise.all(tasks.map(run));
}
export function forwardedTools(ctx: ExtensionToolContext): AgentTool[] {
  return ctx.tools.filter(t => ["read", "find", "grep", "ls"].includes(t.name)).map(tool => ({
    ...tool,
    execute: async (_id, args, signal) => {
      const outcome = await ctx.executeTool(tool.name, args, { signal });
      if (outcome.isError) throw new Error(JSON.stringify(outcome.result.content));
      return outcome.result;
    },
  }));
}
export async function runDelegate(role: Role, prompt: string, ctx: ExtensionToolContext, signal?: AbortSignal): Promise<string> {
  if (!ctx.model) throw new Error("Select a Pi model first; no model fallback is allowed");
  if (!ctx.isProjectTrusted()) throw new Error("Project must be trusted in Pi before delegated tools run");
  const tools = [...forwardedTools(ctx), todoTool()];
  const missing = ["read", "find", "grep", "ls"].filter(n => !tools.some(t => t.name === n));
  const agent = new Agent({
    streamFn: (model, context, options) => ctx.modelRegistry.streamSimple(model, context, options),
    initialState: {
      model: ctx.model, thinkingLevel: ctx.thinkingLevel ?? "off", tools,
      systemPrompt: `${body(source(`agents/${role}.md`))}\n\n${compatibility}\nAvailable delegated tools: ${tools.map(t => t.name).join(", ")}. Missing mapped tools: ${missing.join(", ") || "none"}.`,
    },
  });
  const abort = () => agent.abort();
  if (signal?.aborted) throw new Error("Delegation cancelled");
  signal?.addEventListener("abort", abort, { once: true });
  try {
    await agent.prompt(prompt);
    if (signal?.aborted) throw new Error("Delegation cancelled");
    if (agent.state.errorMessage) throw new Error(agent.state.errorMessage);
    const last = [...agent.state.messages].reverse().find(m => m.role === "assistant");
    if (!last || last.role !== "assistant") throw new Error("Delegate produced no assistant response");
    if (last.stopReason === "error" || last.stopReason === "aborted") throw new Error(last.errorMessage || last.stopReason);
    return last.content.filter(c => c.type === "text").map(c => c.text).join("\n");
  } finally { signal?.removeEventListener("abort", abort); }
}
