import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { parallel, runDelegate } from "./delegate.ts";
import { roles, workflow } from "./sources.ts";
import { todoTool } from "./todos.ts";
export default function featureDev(pi: ExtensionAPI): void {
  let mapped = false;
  const clearMapping = async () => { mapped = false; };
  pi.on("session_start", clearMapping);
  pi.on("session_tree", clearMapping);
  pi.on("session_before_fork", clearMapping);
  pi.on("session_before_switch", clearMapping);
  pi.registerTool({ ...todoTool(), exposure: "deferred", defaultActive: false });
  pi.registerTool({
    name: "feature_dev_agents", label: "Official feature-dev parallel agents",
    description: "Run the original code-explorer/code-architect/code-reviewer agents in parallel. Exploration/architecture require 2–3 tasks; review requires exactly 3. Follow original phase order and approvals. Independent contexts: include the necessary feature, scope, findings and diff in each task.",
    exposure: "deferred", defaultActive: false,
    parameters: Type.Object({ role: Type.Union(roles.map(r => Type.Literal(r))), tasks: Type.Array(Type.Object({ prompt: Type.String({ minLength: 1 }) }), { minItems: 2, maxItems: 3 }) }),
    async execute(_id, args, signal, _update, ctx) {
      if (!mapped) throw new Error("Run /feature-dev --map-sonnet-to-current <feature> to explicitly authorize model mapping first");
      const results = await parallel(args.role, args.tasks, async (task, index) => {
        try { return { index, ok: true, output: await runDelegate(args.role, task.prompt, ctx, signal) }; }
        catch (e) { return { index, ok: false, error: String(e) }; }
      });
      if (results.some(r => !r.ok)) throw new Error(`Parallel batch incomplete; do not treat as completed or replace with main-agent work. Results: ${JSON.stringify(results)}`);
      return { content: [{ type: "text", text: JSON.stringify(results) }], details: { role: args.role, model: ctx.model?.id, results } };
    },
  });
  pi.registerCommand("feature-dev", {
    description: "Official seven-phase workflow. Required explicit model mapping: --map-sonnet-to-current <feature>",
    handler: async (args, ctx) => {
      const flag = "--map-sonnet-to-current";
      if (!(args === flag || args.startsWith(flag + " "))) {
        ctx.ui.notify("Usage: /feature-dev --map-sonnet-to-current <feature>. Original agents specify sonnet; this flag explicitly selects your current Pi model instead. No workflow started.", "warning"); return;
      }
      if (!ctx.model) { ctx.ui.notify("Select a Pi model first. No fallback is used.", "error"); return; }
      mapped = true;
      // Add only; never remove/restore/replace the user's existing active tools.
      pi.setActiveTools([...new Set([...pi.getActiveTools(), "feature_dev_agents", "feature_dev_todos"])]);
      pi.sendUserMessage(workflow(args.slice(flag.length).trim()));
    },
  });
}
