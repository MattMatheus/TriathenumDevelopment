# AGENTS

Agent operating guide for the Flywheel workflow harness.

## Mission
Execute work through the configured Flywheel stages without relying on product-specific assumptions.

When Flywheel is embedded inside a larger host repository, treat Flywheel onboarding as mandatory before using any repo-specific layout cues.

## First 5 Minutes
1. Read `flywheel.yaml`.
2. Read the local harness `HUMANS.md`.
3. Read the local harness `DEVELOPMENT_CYCLE.md`.
4. Read the stage prompt from `paths.prompts`.
5. Read the relevant role contract from `paths.roles` when role selection is enabled.
6. If `integrations.artifact_workflow.enabled` is `true`, read the local harness `tools/artifact_workflow.sh <stage> --format json` output for stage-specific artifact guidance.
7. Only after Flywheel onboarding, read any host-repo guidance that layers domain boundaries or product context on top of Flywheel.

## Stage Prompts
Flywheel expects stage prompts for:
- planning
- architect
- engineering
- qa
- pm
- cycle

These should be resolved from `paths.prompts`.

## Mandatory Rules
- Respect `workflow.required_branch`.
- Use only the configured backlog and artifact paths.
- Treat configured paths as authoritative even when the host repository contains other attractive markdown or document locations.
- Respect explicit backlog state transitions.
- Do not fabricate work when the active lane is empty.
- Do not commit during intermediate stage transitions.
- Use one commit per completed cycle.
- Generate an observer artifact through the local harness `tools/run_observer_cycle.sh` at cycle closure.
- Treat QA as a gate, not a suggestion.
- Treat artifact readiness as explicit, not implied.
- Record evidence, risks, and next-state recommendation in stage handoffs.
- Treat the artifact tool as an optional integration and use it only when the repo config enables it.
- When the artifact workflow integration is enabled, treat the local harness `tools/artifact_workflow.sh --format json` output as the canonical machine-readable source for stage entry and exit artifact guidance.
- Interpret the JSON output consistently:
  - `entry` commands help you discover or read the artifact inputs for the current stage.
  - `exit` commands help you write durable handoff or cycle-closure records after the stage work is complete.
- If you only need one phase, prefer the local harness `tools/artifact_workflow_commands.sh --stage <stage> --phase <entry|exit>` helper to avoid reparsing the full JSON payload.
- Use the smallest useful action model:
  - `read`
  - `local write`
  - `risky write`
  - `sensitive or production`
- Require explicit human approval for `risky write` and `sensitive or production` actions.
- Record approval outcome when approval-governed work occurs.
- If no dedicated architecture artifact location is configured, treat the architecture story in the configured architecture lane as the primary reviewable decision artifact.

## Required Sync
When workflow behavior changes, update together:
- `flywheel/HUMANS.md`
- `flywheel/AGENTS.md`
- `flywheel/DEVELOPMENT_CYCLE.md`
- the affected prompts
- the affected process docs
- any affected tool behavior

In an embedded install, interpret those paths as files inside the local harness directory rather than assuming a repo-root `flywheel/` path.

## Scope
Flywheel defines workflow behavior, not product strategy.

If a host repository needs product planning, release management, metrics, or additional governance, those should be layered on top of Flywheel rather than embedded into the core harness.

If a host repository contains a separate domain corpus, knowledge base, or operational system, use it as task context only after Flywheel determines the correct workflow location for the resulting work product.
