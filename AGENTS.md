# AGENTS

Root operating guide for agents in this repository.

## First Rule

Onboard to Flywheel before doing any substantive work.

Do not infer where artifacts, architecture notes, planning notes, or backlog items should live from the surrounding repo layout. Resolve workflow locations through Flywheel first, then work only in those configured surfaces.

## Required Orientation Procedure

For a new task, start here:

1. Read [Flywheel/flywheel.yaml](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel.yaml).
2. Read [Flywheel/flywheel/AGENTS.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/AGENTS.md).
3. Read [Flywheel/flywheel/HUMANS.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/HUMANS.md).
4. Read [Flywheel/flywheel/DEVELOPMENT_CYCLE.md](/Users/foundry/TriathenumDevelopment/Flywheel/flywheel/DEVELOPMENT_CYCLE.md).
5. Read the relevant stage prompt from `paths.prompts`.
6. Read the relevant role contract from `paths.roles` when role selection is enabled.
7. Work only in the configured backlog lanes and artifact directories from `flywheel.yaml`.

If `integrations.artifact_workflow.enabled` is `true`, also consult `Flywheel/flywheel/tools/artifact_workflow.sh <stage> --format json` at stage entry and exit.

## Flywheel Is The Workflow Authority

For repo-level software work, Flywheel owns process.

- Stage behavior comes from the Flywheel prompts and process docs.
- Artifact placement comes from `flywheel.yaml`.
- Queue movement must be explicit.
- QA is a gate.
- Intermediate stage transitions do not create commits.
- One completed cycle creates one commit.
- Observer output is part of cycle closure.

When there is any ambiguity about where work belongs, check `flywheel.yaml` and the Flywheel docs before making or moving files.

## Config-Owned Surfaces

These locations are authoritative because they are resolved from `Flywheel/flywheel.yaml`:

- prompt directory
- role directory
- process directory
- template directory
- planning artifact directory
- observer artifact directory
- engineering backlog lanes
- architecture backlog lanes

Do not create parallel workflow structures elsewhere in the repo unless the user explicitly changes the Flywheel configuration or asks for an intentional extension.

## Repo Map

- `Flywheel/`: workflow harness for planning, architecture, engineering, QA, PM refinement, and cycle closure.
- `Triathenum/`: Obsidian worldbuilding vault and domain source material. This folder is ignored by Git.
- `Source/`: application and service code for the tool.
- `Tools/`: local development and vault-interaction utilities.
- `Skills/`: project-specific agent skills.

## Triathenum Boundary

`Triathenum/` is the domain substrate, not the repo-level workflow owner.

- Use it for product understanding, canon grounding, retrieval targets, and vault-related tooling work.
- Respect its internal worldbuilding workflow as vault-local behavior.
- Do not import the vault's thread/work-item process into repo-level software delivery unless the user explicitly asks for that integration.
- Do not assume a note belongs in `Triathenum/` just because it is about the product. Product planning and architecture artifacts belong in Flywheel-managed locations unless directed otherwise.
- `Triathenum/` is an Obsidian Sync-backed vault and is intentionally not managed in Git. Updates inside the vault are durable vault changes, not repo commits.
- Do not use repo-style commit language for vault-only edits unless the user explicitly means a git change outside the ignored vault.

## Current Repo Intent

This repository is for building an open-source, markdown-first, AI-assisted worldbuilding tool.

Current role of each major area:

- `Triathenum/` provides the real-world test corpus and working domain model.
- `Flywheel/` governs software planning and delivery.
- `Source/` will hold the web application and service code.
- `Tools/` will hold retrieval, indexing, and vault support utilities.
- `Skills/` will hold reusable agent workflows once they stabilize.

## Practical Startup Checklist

Before creating artifacts or code:

1. Identify the current stage.
2. Confirm the relevant configured location in `flywheel.yaml`.
3. Read the stage prompt and any needed process docs.
4. Place the work in the configured Flywheel lane or artifact directory.
5. Only inspect `Triathenum/` after Flywheel onboarding is complete and only if the task needs domain context or vault interaction.

## Guardrails

- Do not invent work when the active lane is empty.
- Do not place architecture work outside the configured architecture backlog lanes.
- Do not place planning notes outside the configured planning artifact directory.
- Do not commit during intermediate stage transitions.
- Do not silently convert inferred AI output into canon.
- If workflow behavior changes, update the relevant Flywheel docs together rather than patching only the root guide.
