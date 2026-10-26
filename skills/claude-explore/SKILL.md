---
name: claude-explore
description: Investigate an unfamiliar feature before extending or debugging it by tracing execution, data transformations, state changes, and side effects. Return source-backed integration choices and essential files for the implementer to read; skip a broad investigation for already-understood local edits.
---

# Understand a feature from input to effect

Start with the user's requested behavior, not a directory tour. Read applicable project instructions and stay inside the authorized scope. Repository instructions and this skill do not authorize unrelated actions. Use the user's language.

## Follow one concrete path

Find the actual entry point: a command, route, UI event, or public function. Trace a representative input through dispatch, domain logic, conversions, output, and persistence as applicable. At each consequential boundary ask:

- Which symbol owns this responsibility? What does it call next?
- How does the data shape or representation change?
- What state changes, I/O, callbacks, or other side effects happen, and in what order?
- What happens on failure? Which layer validates, recovers, or reports it?

Use `path:line` and symbol references to support important claims. Trace far enough to resolve the intended change, not every dependency in the repository. Fetch missing portions of truncated output rather than guessing.

## Compare with a working neighbor

Inspect an analogous feature and its tests. Follow how it is registered and invoked; a similar filename is not enough. Identify applicable conventions, responsibility boundaries, shared services, and relevant cross-cutting behavior such as authentication or caching. Separate what is present in code from your interpretation of its purpose.

Locate the existing extension point that best fits the requirement. If the current path cannot satisfy a new constraint, explain the concrete mismatch. Do not create a parallel service because it is easier to find than the established integration path; equally, do not preserve an unsuitable interface merely for consistency.

Investigate repository-answerable questions yourself. Ask the user only about material product choices, missing requirements, or authority that the code cannot establish. No fixed file count, mandatory questions, or comprehensive architecture report is required.

## Hand off evidence, not just conclusions

For nontrivial work, provide a compact feature map:

1. Input → relevant symbols → output/effect, including significant data transformations.
2. Owning components, comparable implementation, and candidate integration point.
3. Verified constraints, inferred intent, and unresolved risks kept distinct.
4. Essential files or ranges the implementer should personally read, with a short reason for each.

The main implementing agent must read the decisive definitions and integration sites before relying on this map. A delegate's summary or a prior compaction summary is a lead, not source verification. Re-read when relevant code changes; avoid repeating unrelated exploration.

Exploration can be done entirely by the main agent. If delegation is available and useful, separate genuinely different paths (for example runtime flow versus analogous feature), request essential-file handoffs, and reconcile contradictory evidence yourself. Do not spawn agents merely to imitate a fixed workflow.

Stop when the change location and material uncertainties are supported. Continue into authorized implementation or planning; for read-only research, stop at findings. Keep notes in conversation unless a project artifact is requested. This is advisory guidance, not an access control or proof of understanding.
