# Stage Contracts

## Planning
- produce planning notes or intake artifacts
- place planning notes in the configured planning artifact directory and intake items in the configured backlog lanes
- make scope, constraints, assumptions, risks, and next-state recommendation explicit
- recommend the next stage
- do not implement changes

## Architect
- produce architecture decisions or updates
- keep the decision output reviewable in the architecture story itself unless the host repo config defines an additional architecture artifact surface
- make the decision, alternatives, tradeoffs, and operational impact explicit
- identify follow-on implementation work
- move work to architecture QA

## Engineering
- implement the selected story
- update validation evidence
- prepare handoff with explicit QA focus areas and open risks
- move work to engineering QA

## QA
- produce explicit verdict with evidence quality call
- file bugs when required
- move work to `done` or back to `active`
- close the cycle

## PM
- refine intake
- maintain active queue order with bounded and testable work items
- keep work bounded and testable

## Cycle
- alternate engineering and QA until the active queue is empty
