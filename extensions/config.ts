import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
export type Defaults = { enabled: boolean; error?: string };
/** Package-owned settings only. Never reads or rewrites Pi settings/authentication files. */
export function readDefaults(path: string): Defaults {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (value?.version !== 1 || typeof value.enabled !== "boolean") throw new Error("expected version 1 and boolean enabled");
    return { enabled: value.enabled };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { enabled: false };
    return { enabled: false, error: `Cannot read Claude defaults: ${String(error)}` };
  }
}
export function writeDefaults(path: string, enabled: boolean): void {
  const existing = readDefaults(path);
  if (existing.error) throw new Error(`${existing.error}. Repair/remove the package settings file before changing defaults.`);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify({ version: 1, enabled }, null, 2) + "\n", { flag: "wx" });
    renameSync(temporary, path);
  } finally { try { unlinkSync(temporary); } catch {} }
}
export const completions = (prefix: string) => {
  const choices = ["on", "off", "status", "inherit", "default on", "default off"];
  return choices.filter(value => value.startsWith(prefix)).map(value => ({ value, label: value }));
};
