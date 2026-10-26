import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";
export function todoTool() {
  return {
    name: "feature_dev_todos", label: "Feature-dev todos",
    description: "TodoWrite compatibility: replace the complete progress list and return its current state. Not an approval or phase gate.",
    parameters: Type.Object({ todos: Type.Array(Type.Object({ content: Type.String(), status: Type.Union([Type.Literal("pending"), Type.Literal("in_progress"), Type.Literal("completed")]), activeForm: Type.Optional(Type.String()) })) }),
    async execute(_id: string, input: unknown) {
      const params = input as { todos: {content: string; status: string; activeForm?: string}[] };
      return { content: [{ type: "text" as const, text: JSON.stringify(params.todos) }], details: { todos: params.todos } };
    },
  } satisfies AgentTool;
}
