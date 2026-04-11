# Cycle Navigation

## Flow
1. Confirm the current branch matches `workflow.required_branch`.
2. Resolve the local `flywheel.yaml` and harness location.
3. Run the required stage.
4. Read the selected prompt from `paths.prompts`.
5. Work only in configured backlog and artifact locations.
6. Move work through explicit queue states.
7. Close the cycle with an observer report and one cycle commit.

## Empty Queue Rule
If the configured engineering active queue is empty, report `no stories` and route work to planning or PM refinement.
