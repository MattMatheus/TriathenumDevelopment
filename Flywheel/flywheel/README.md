# flywheel

Flywheel is a configurable workflow harness for human+agent delivery.

It is optimized for explicit queue movement, reviewable markdown artifacts, and cycle closure with durable observer records.

It preserves a staged operating model:
- planning
- architect
- engineering
- qa
- pm
- cycle

The harness is intended to run either:
- in a new repository with Flywheel-owned directories
- inside an existing repository by mapping Flywheel paths in `flywheel.yaml`

When Flywheel is embedded in a larger host repository, non-workflow directories may coexist alongside Flywheel-managed surfaces. In that setup, agents and operators should treat the configured Flywheel paths as authoritative for software-delivery workflow state and should not infer artifact placement from the rest of the repo layout.

## Start
1. Review the local `flywheel.yaml`.
2. Read the harness `HUMANS.md`.
3. Read the harness `DEVELOPMENT_CYCLE.md`.
4. Read the stage prompts, process docs, and templates resolved by config.
5. Populate the configured prompt, role, process, template, and backlog paths.
6. Run the harness tools from the local harness `tools/` directory against the configured paths.

The stage launcher should tell you which config file, harness directory, prompt directory, and active lane it resolved before you begin substantive work.

## Typical Use

### Add Flywheel To An Existing Repo
1. Place `flywheel.yaml` next to the harness directory you want to use.
2. Copy the `flywheel/` harness directory into the repo.
3. Keep the default local paths if you want a self-contained workflow.
4. Edit `flywheel.yaml` only if you want Flywheel to point at existing repo directories.
5. Run the local harness `tools/run_doc_tests.sh`.

### Example Remap For An Existing Repo
If an existing project already has its own work directories, keep the Flywheel system in a self-contained harness directory and remap only the workflow-owned state:

```yaml
paths:
  prompts: "flywheel/prompts"
  roles: "flywheel/roles"
  process: "flywheel/process"
  templates: "flywheel/templates"
  artifacts:
    planning: "ops/planning"
    observer: "ops/observer"
    release: "ops/release"
  engineering:
    intake: "work/engineering/intake"
    ready: "work/engineering/ready"
    active: "work/engineering/active"
    qa: "work/engineering/qa"
    done: "work/engineering/done"
    blocked: "work/engineering/blocked"
    archive: "work/engineering/archive"
  architecture:
    intake: "work/architecture/intake"
    ready: "work/architecture/ready"
    active: "work/architecture/active"
    qa: "work/architecture/qa"
    done: "work/architecture/done"
    blocked: "work/architecture/blocked"
    archive: "work/architecture/archive"
```

This keeps the harness system contained while allowing backlog state and generated artifacts to live in project-native locations.

### Embedded Host Repo Pattern
Some host repositories contain important non-workflow surfaces such as product source trees, datasets, or domain substrates that should remain separate from Flywheel delivery state.

In that pattern:
- Flywheel still owns workflow behavior and artifact placement through `flywheel.yaml`
- planning notes still belong in `paths.artifacts.planning`
- observer reports still belong in `paths.artifacts.observer`
- architecture work belongs in the configured architecture backlog lanes unless the host repo explicitly defines additional architecture artifact locations
- host-repo domain content may inform planning and design, but it does not implicitly become a Flywheel artifact surface

### Use Flywheel As A Self-Contained Local Workflow
- backlog state lives under the harness `backlog/`
- planning notes live under the configured planning artifact path
- observer reports live under the configured observer artifact path
- prompts, roles, process docs, and templates stay under the harness directory
- tools run from the harness `tools/` directory

## Operating Expectations
- artifact readiness is explicit, not implied
- handoffs record evidence, risks, and next-state recommendation
- observer reports act as compact execution traces, not just end-of-cycle notes
- risky or sensitive actions require explicit approval and recorded outcome
- host-repo context does not override config-owned workflow locations

### Launch A Stage
- `./<harness>/tools/launch_stage.sh planning`
- `./<harness>/tools/launch_stage.sh architect`
- `./<harness>/tools/launch_stage.sh engineering`
- `./<harness>/tools/launch_stage.sh qa`
- `./<harness>/tools/launch_stage.sh pm`
- `./<harness>/tools/launch_stage.sh cycle`

### Close A Cycle
- `./<harness>/tools/run_observer_cycle.sh --cycle-id <cycle-id>`

### Optional Artifact Workflow
Flywheel can surface artifact-tool commands without making that tool part of the harness contract.

Enable `integrations.artifact_workflow.enabled` in `flywheel.yaml` and point `integrations.artifact_workflow.command` at a wrapper such as `/Users/foundry/AgenticDevelopment/Tools/artifacts/flywheel-artifacts`.

When enabled:
- `launch_stage.sh` prints stage-specific artifact selection and manifest commands
- `run_observer_cycle.sh` prints a cycle-closure manifest command after writing the observer report
- `artifact_workflow.sh --format json` returns the same hints in machine-readable form for wrappers or agent tooling
- `artifact_workflow_commands.sh --stage <stage> --phase <entry|exit>` returns only the commands for one phase, which is usually the simplest interface for agents

## Core Files
- `flywheel.yaml`
- `<harness>/CONFIG_SCHEMA.md`
- `<harness>/HUMANS.md`
- `<harness>/AGENTS.md`
- `<harness>/DEVELOPMENT_CYCLE.md`

## First-Pass Intent
- Keep the workflow generic.
- Remove product-specific payload.
- Resolve all workflow locations through config.
