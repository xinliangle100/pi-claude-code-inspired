import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
/** Shared, branch-local protocol with pi-codex-inspired. Explicit selections win over package defaults. */
export const SELECTOR = "pi-inspired-selector/v1";
export type Selection = { version: 1; owner: "codex" | "claude" | null; mode: "master" | "manual" | null };
export const NONE: Selection = { version: 1, owner: null, mode: null };
export function selection(ctx: Pick<ExtensionContext, "sessionManager">): Selection {
  const entries = ctx.sessionManager.getBranch();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type !== "custom" || entry.customType !== SELECTOR) continue;
    const d = entry.data as Partial<Selection> | undefined;
    if (d?.version === 1 && ((d.owner === null && d.mode === null) ||
      ((d.owner === "codex" || d.owner === "claude") && (d.mode === "master" || d.mode === "manual")))) return d as Selection;
    return NONE; // Do not resurrect an older authorization after an unknown/corrupt entry.
  }
  return NONE;
}

/** Inspect only the latest shared selection: malformed entries also suppress defaults. */
export function latestSelection(ctx: Pick<ExtensionContext, "sessionManager">): { inherited: boolean } | undefined {
  const entries = ctx.sessionManager.getBranch();
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i];
    if (entry.type === "custom" && entry.customType === SELECTOR) {
      const d = entry.data as (Partial<Selection> & { source?: string }) | undefined;
      const valid = d?.version === 1 && ((d.owner === null && d.mode === null) ||
        ((d.owner === "codex" || d.owner === "claude") && (d.mode === "master" || d.mode === "manual")));
      return { inherited: Boolean(valid && d?.source === "claude-default/v1") };
    }
  }
  return undefined;
}
