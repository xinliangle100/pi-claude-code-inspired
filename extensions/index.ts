import { getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { join } from "node:path";
import { completions, readDefaults, writeDefaults } from "./config.ts";
import { Type } from "typebox";
import { parallel, runDelegate } from "./delegate.ts";
import { masterWorkflow, roles, workflow } from "./sources.ts";
import { NONE, SELECTOR, selection, latestSelection, type Selection } from "./selector.ts";
import { todoTool } from "./todos.ts";
const OWN_TOOLS = ["feature_dev_agents", "feature_dev_todos"];
export default function featureDev(pi: ExtensionAPI): void {
  installFeatureDev(pi, join(getAgentDir(), "pi-claude-code-inspired.json"));
}
export function installFeatureDev(pi: ExtensionAPI, settingsPath: string): void {
  const running = new Set<AbortController>();
  let current: ExtensionContext | undefined;
  let visible = false;
  let promptBlocked = false;
  const cancel = () => { for (const controller of running) controller.abort(); running.clear(); };
  const authorized = (ctx: ExtensionContext) => selection(ctx).owner === "claude" && !promptBlocked;
  const stateLabel = (ctx: ExtensionContext) => {
    const value = selection(ctx);
    return promptBlocked ? "BLOCKED" : value.owner === "claude" ? value.mode === "master" ? "ON" : "MANUAL" : "OFF";
  };
  const display = (ctx: ExtensionContext) => {
    const defaults = readDefaults(settingsPath);
    const origin = latestSelection(ctx)?.inherited !== false ? "default" : "session";
    const state = stateLabel(ctx);
    if (ctx.hasUI) {
      const label = ctx.ui.theme.fg(state === "ON" || state === "MANUAL" ? "warning" : "dim", "Claude-inspired");
      ctx.ui.setWidget("claude-inspired", [`${label}: ${state} · ${origin}${defaults.error ? " · config error" : ""}`], { placement: "aboveEditor" });
    }
  };
  const refresh = (ctx: ExtensionContext) => {
    current = ctx;
    visible = authorized(ctx);
    display(ctx);
    // Equal-name refresh reprojects only our declarations; never removes tools/pending MCP names.
    pi.setActiveTools(pi.getActiveTools());
  };
  const select = (value: Selection, ctx: ExtensionContext, inherited = false) => {
    const previous = selection(ctx);
    if (previous.owner !== value.owner || previous.mode !== value.mode || latestSelection(ctx)?.inherited !== inherited) {
      pi.appendEntry(SELECTOR, inherited ? { ...value, source: "claude-default/v1" } : value);
      pi.events.emit(SELECTOR, value);
    }
    promptBlocked = false;
    refresh(ctx);
  };
  const inherit = (ctx: ExtensionContext) => {
    const defaults = readDefaults(settingsPath);
    if (defaults.error) ctx.ui.notify(defaults.error, "warning");
    cancel();
    select(defaults.enabled ? { version: 1, owner: "claude", mode: "master" } : NONE, ctx, true);
  };
  const syncDefaults = (ctx: ExtensionContext) => {
    if (latestSelection(ctx)?.inherited !== false) inherit(ctx);
  };
  const activate = () => pi.setActiveTools([...new Set([...pi.getActiveTools(), ...OWN_TOOLS])]);
  const guard = (ctx: ExtensionContext) => {
    if (!authorized(ctx)) throw new Error("Claude feature-dev is disabled or blocked. Use /claude-inspired on or /feature-dev <feature>.");
  };
  const prepareLoadout = () => visible ? undefined : { hiddenDeclarations: OWN_TOOLS };
  pi.events.on(SELECTOR, () => {
    if (current && selection(current).owner !== "claude") cancel();
    if (current) refresh(current);
  });
  pi.on("session_before_switch", async () => cancel());
  pi.on("session_before_fork", async () => cancel());
  pi.on("session_before_tree", async () => cancel());
  pi.on("session_shutdown", async (_event, ctx) => { cancel(); if (ctx.hasUI) ctx.ui.setWidget("claude-inspired", undefined); current = undefined; visible = false; });
  const restore = async (_event: unknown, ctx: ExtensionContext) => { cancel(); promptBlocked = false; syncDefaults(ctx); refresh(ctx); if (authorized(ctx)) activate(); };
  pi.on("session_start", restore);
  pi.on("session_tree", restore);
  pi.on("before_agent_start", async (event, ctx) => {
    promptBlocked = false;
    syncDefaults(ctx);
    if (selection(ctx).owner !== "claude") { refresh(ctx); return; }
    if (selection(ctx).mode === "master") {
      if (event.systemPromptOptions.forceSystemPrompt !== undefined) {
        promptBlocked = true;
        cancel();
        ctx.ui.notify("Claude master guidance was not injected: another extension supplied an opaque system-prompt override. Delegation is blocked for this run; resolve the conflicting override first.", "warning");
      } else {
        event.systemPromptOptions.sections.pi_claude_inspired = masterWorkflow();
      }
    }
    refresh(ctx);
    if (authorized(ctx)) activate();
  });
  const todos = todoTool();
  pi.registerTool({ ...todos, exposure: "deferred", defaultActive: false, prepareLoadout,
    async execute(id, args, signal, update, ctx) { guard(ctx); return todos.execute(id, args); },
  });
  pi.registerTool({
    name: "feature_dev_agents", label: "Official feature-dev parallel agents",
    description: "Run the original code-explorer/code-architect/code-reviewer agents in parallel. Exploration/architecture require 2–3 tasks; review requires exactly 3. Follow original phase order and approvals. Independent contexts: include the necessary feature, scope, findings and diff in each task.",
    exposure: "deferred", defaultActive: false, prepareLoadout,
    parameters: Type.Object({ role: Type.Union(roles.map(r => Type.Literal(r))), tasks: Type.Array(Type.Object({ prompt: Type.String({ minLength: 1 }) }), { minItems: 2, maxItems: 3 }) }),
    async execute(_id, args, signal, _update, ctx) {
      guard(ctx);
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (signal?.aborted) controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      running.add(controller);
      try {
        const results = await parallel(args.role, args.tasks, async (task, index) => {
          try { guard(ctx); return { index, ok: true, output: await runDelegate(args.role, task.prompt, ctx, controller.signal) }; }
          catch (e) { return { index, ok: false, error: String(e) }; }
        });
        guard(ctx);
        if (controller.signal.aborted) throw new Error("Delegation cancelled");
        if (results.some(r => !r.ok)) throw new Error(`Parallel batch incomplete; do not treat as completed or replace with main-agent work. Results: ${JSON.stringify(results)}`);
        return { content: [{ type: "text", text: JSON.stringify(results) }], details: { role: args.role, model: ctx.model?.id, results } };
      } finally { running.delete(controller); signal?.removeEventListener("abort", abort); }
    },
  });
  pi.registerCommand("claude-inspired", {
    description: "Claude-inspired: on | off | status | inherit | default on | default off. Current Pi model.",
    getArgumentCompletions: completions,
    handler: async (args, ctx) => {
      const command = args.trim() || "status";
      if (command === "default on" || command === "default off") {
        try { writeDefaults(settingsPath, command === "default on"); }
        catch (error) { ctx.ui.notify(String(error), "error"); return; }
        syncDefaults(ctx); refresh(ctx); if (authorized(ctx)) activate();
        ctx.ui.notify(`Claude global default ${command === "default on" ? "ON" : "OFF"}. New sessions inherit it; explicit session selections are retained. Use /claude-inspired inherit to follow the default here.`, "info");
      } else if (command === "inherit") {
        inherit(ctx); if (authorized(ctx)) activate();
        ctx.ui.notify("This session branch now follows the Claude global default.", "info");
      } else if (command === "on") {
        if (!ctx.model) { ctx.ui.notify("Select a Pi model first. No fallback is used.", "error"); return; }
        select({ version: 1, owner: "claude", mode: "master" }, ctx); activate();
        ctx.ui.notify("Claude-inspired ON. Feature requests use the pinned seven-phase workflow; greetings and unrelated questions do not. Children use your current Pi model/thinking.", "info");
      } else if (command === "off") {
        cancel(); promptBlocked = false;
        if (selection(ctx).owner !== "codex") select(NONE, ctx); else refresh(ctx);
        ctx.ui.notify("Claude-inspired OFF. No future workflow injection; delegated calls disabled. Existing conversation history remains. Other packages and host tools are unchanged.", "info");
      } else if (command === "status") {
        const value = selection(ctx), defaults = readDefaults(settingsPath);
        display(ctx);
        ctx.ui.notify(`Claude-inspired: ${stateLabel(ctx)}; workflow: ${value.owner === "claude" ? value.mode === "master" ? "feature-dev available (phase tracked in conversation)" : "manual feature-dev" : "inactive"}; selected: ${value.owner ?? "none"}/${value.mode ?? "none"}; model: ${ctx.model?.provider ?? "?"}/${ctx.model?.id ?? "none"}; thinking: ${ctx.thinkingLevel ?? "off"}; prompt blocked: ${promptBlocked}; global default: ${defaults.error ? "ERROR (off)" : defaults.enabled ? "ON" : "OFF"}; selection source: ${latestSelection(ctx)?.inherited !== false ? "global default" : "session override"}; settings: ${settingsPath}.`, "info");
      } else ctx.ui.notify("Usage: /claude-inspired on | off | status | inherit | default on | default off", "warning");
    },
  });
  pi.registerCommand("feature-dev", {
    description: "Run the pinned seven-phase feature workflow using your current Pi model. Legacy --map-sonnet-to-current is accepted.",
    handler: async (args, ctx) => {
      const flag = "--map-sonnet-to-current";
      const feature = (args === flag || args.startsWith(flag + " ") ? args.slice(flag.length) : args).trim();
      if (!ctx.model) { ctx.ui.notify("Select a Pi model first. No fallback is used.", "error"); return; }
      cancel();
      const value = selection(ctx);
      select({ version: 1, owner: "claude", mode: value.owner === "claude" && value.mode === "master" ? "master" : "manual" }, ctx);
      activate();
      pi.sendUserMessage(workflow(feature));
    },
  });
}
