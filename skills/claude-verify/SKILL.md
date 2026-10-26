---
name: claude-verify
description: Review a change for concrete regressions and project-rule violations, then verify its requested behavior against the current working state. Produce actionable source-backed findings and honest test status without issue quotas, speculative redesigns, or claims that model confidence proves correctness.
---

# Review the change, then verify the claim

Establish the requested scope, current diff or equivalent evidence, and applicable project rules. Include relevant staged, unstaged, and new files; do not silently assume one diff view covers the whole task. Preserve unrelated work. Review-only requests do not authorize fixes.

## Apply distinct review lenses

Consider correctness, project conventions, and unnecessary complexity. For each suspected issue, inspect the affected caller and execution/data path. Find the triggering input or state, the resulting behavior, and the requirement or invariant it violates. Compare with the previous behavior when determining whether it is a regression.

A different design is not automatically wrong. A stylistic preference is not a project rule. Distinguish a new defect, a pre-existing issue, and a risk not yet established. Do not require a minimum number of findings or rewrite sound code to make a review look useful.

For a material finding provide:

- Exact location and affected behavior.
- A concrete reproduction, affected path, or applicable rule with supporting evidence.
- Impact and the conditions under which it occurs.
- A focused fix or next diagnostic step within scope.

Prioritize actionable issues over speculative warnings. If evidence is incomplete, label the uncertainty instead of presenting it as a confirmed regression. A model-generated confidence number is not a calibrated probability. An empty review means no supported findings in the reviewed scope, not proof that the code meets every standard.

Optional independent reviewers can separate these lenses for consequential work. Give them the requirement and real change, deduplicate findings, and personally validate the evidence before requesting rework. Main-agent review remains a valid default.

## Exercise the behavior that matters

Start with a focused reproduction or test that actually reaches the changed path. Inspect test entry points; a green command does not establish relevant coverage. Run applicable project-required checks and expand coverage for changed boundaries or unresolved risks. Include meaningful failure cases and compatibility checks when affected.

Before running commands, consider their effects on snapshots, files, databases, or external services. Testing does not authorize installing a framework, changing configuration, publishing, or mutating external systems. Use existing checks where sufficient.

Record the command/action, its scope, observed outcome, and working state tested. A running process has not passed. Source inspection and expected behavior are not executed tests. Relevant changes after a check invalidate the affected result: rerun or explicitly mark it unverified. HEAD alone cannot identify uncommitted working state; account for checks that modify files themselves.

Distinguish regression, pre-existing failure, and environment blockage using evidence. Fix and recheck only within authority; never alter the test command just to hide failure. Report **passed**, **failed**, **not run**, or **blocked**, with the smallest useful next action for unresolved items.

## Close the context → action → verification loop

If evidence contradicts the approach, return to the relevant source or design decision rather than repeatedly patching symptoms. If the task is complete, summarize changed behavior and integration, actual completed checks and their coverage, and remaining material risks. Keep routine details brief; do not claim broader assurance than the evidence supports.

This skill is advisory. It is not an automatic test gate, a security sandbox, or a guarantee that all defects will be found.
