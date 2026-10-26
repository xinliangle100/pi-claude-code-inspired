---
name: claude-plan
description: Design a nontrivial feature around verified project conventions, explicit component responsibilities, integration points, and data flow. Compare design perspectives only for genuine tradeoffs, then recommend a concrete implementation and validation sequence; keep routine changes lightweight.
---

# Turn feature understanding into a buildable decision

Read the decisive source files yourself, including those highlighted by exploration. Establish the relevant project conventions and an analogous implementation before claiming how the system works. A plausible exploration summary is not a substitute for the actual definitions.

Capture the goal, non-goals, compatibility requirements, and behavioral acceptance conditions. Distinguish verified constraints from assumptions and user preferences. Resolve code facts by inspection; ask focused questions only when unresolved intent changes the outcome or authorization is missing.

## Use perspectives when they change the decision

For consequential choices, consider how a minimal-change design, a boundary-focused design, and a practical compromise would differ. These are lenses, not a requirement to invent three proposals. Identify the actual tension: reuse versus new lifecycle needs, compatibility versus a new interface, or local simplicity versus duplicated ownership.

For each serious alternative, identify the concrete consequences in this codebase, not generic virtues such as “clean” or “scalable.” Favor the established extension point when it meets the constraints. A new abstraction, moved responsibility, or parallel path needs a source-backed explanation of why the existing design is insufficient.

Choose and recommend one approach. State the remaining assumption most likely to invalidate it and the cheapest authorized probe that could resolve that assumption before substantial implementation. Do not optimize for imaginary future requirements or promise never to refactor again.

The main agent owns the synthesis and implementation. Optional design reviewers may explore distinct tradeoffs, but their agreement, confidence, or number does not establish correctness. Verify their decisive evidence yourself.

## Make the handoff executable

For a nontrivial change, describe:

- Existing patterns and source references that constrain the design.
- Chosen approach, important rejected alternatives, and reasons.
- Affected components/files, responsibilities, interfaces, and registration sites.
- Input-to-output data flow, state ownership, side effects, and relevant failure behavior.
- Implementation order and observable acceptance checks, with the riskiest assumption tested early.

Include migration, concurrency, security, rollback, and performance only where they materially affect this task. Resolve decisions that would force an implementer to guess, but avoid exhaustive blueprints for a small edit. A familiar local change may need only the affected symbol and a check.

## Keep authority and decisions current

A request for a plan or analysis does not authorize implementation. If implementation is already authorized, do not add a generic approval ceremony; pause only for a real unresolved choice or required permission. Never treat silence as approval. Continue independent authorized work when possible.

Keep the decision concise in conversation. If an available, enabled checkpoint mechanism is used, preserve goal, constraints, rationale, open questions, evidence, and actual verification status. Do not claim it saved unless the tool confirmed success, and do not write a repository decision file without authorization. Latest user direction and current source supersede stale notes.

Revise the plan when evidence changes. Completion follows actual work and checks, not a marked checklist. This skill does not enable Claude Code Plan mode, enforce read-only tools, or automatically run a design-review workflow.
