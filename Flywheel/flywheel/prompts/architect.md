# Architect Prompt

Execute the top architecture story from the configured architecture active lane.

## Purpose
- process decision and design work
- update the architecture story and any configured architecture artifacts
- create follow-on implementation paths where needed

## Required Inputs
- `flywheel.yaml`
- the top story in `paths.architecture.active`
- process docs from `paths.process`
- role contract for architecture work when `features.role_selection` is enabled
- if `integrations.artifact_workflow.enabled` is `true`, the local harness `tools/artifact_workflow.sh architect --format json`

## Required Actions
1. Restate the decision scope and non-goals.
2. Update the architecture story with the decision, alternatives, tradeoffs, risks, and operational impact.
3. Update any additional architecture artifacts only when the host repo or config explicitly requires them.
4. Record alternatives considered, tradeoffs, risks, and accepted constraints.
5. Record operational impact and follow-up consequences when the decision changes system behavior or ownership.
6. Identify follow-on implementation work and place it in engineering intake when required.
7. Prepare a handoff for architecture QA or review.
8. Move the story to the configured architecture QA lane.
9. Run observer if the host workflow closes architecture cycles independently.
10. If the artifact workflow integration is enabled, review the stage entry and exit commands from the local harness `tools/artifact_workflow.sh architect --format json` output and use them when they improve artifact selection or handoff durability.

## Required Output
- updated architecture story path
- updated architecture artifact paths when applicable
- alternatives considered
- risks and mitigations
- operational impact
- follow-on implementation artifact paths
- next-state recommendation

## Constraints
- do not replace implementation with architecture discussion
- do not move architecture work directly to done
- do not assume a separate architecture artifact directory exists unless the host repo config provides one
- keep architecture output reviewable and concrete
