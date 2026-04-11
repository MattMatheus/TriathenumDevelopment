---
cycle_id: proto-003
kind: planning_note
ready: true
stage: planning
status: ready-for-architect
tags: [retrieval, grounding, refinement, actor-reaction]
title: Retrieval And Grounding Refinement
---

# Retrieval And Grounding Refinement

## Objective

Define the next planning slice after the first end-to-end actor reaction workflow, focusing on improving retrieval quality and grounding fidelity before investing in more sophisticated response generation.

## What We Learned

The first implementation wave proved the following:

- the end-to-end actor reaction workflow is viable and responsive
- a narrow local-first architecture was sufficient for the first slice
- visible citations, uncertainty, and canon basis materially improve trust
- even thin character notes can produce useful output when linked political context is available

The first slice also exposed the clearest next leverage point:

- response quality is currently constrained more by retrieval and grounding quality than by UI or transport shape

## Problem Statement

The current retrieval path is intentionally simple and deterministic, but it is also shallow.

Current limitations:

- filesystem scan only
- title-heavy actor resolution
- simple heuristic note ranking
- link-driven relationships
- no ObsidianMCP integration
- no SQLite FTS5 integration
- no distinction between stronger and weaker sources beyond loose ordering

If we improve generation before improving evidence assembly, we risk polishing answers that are still grounded in incomplete or weak context.

## Goals For The Next Slice

- improve actor resolution beyond exact-title or loose-title matching
- improve note ranking and context selection
- distinguish source roles more explicitly inside the grounding bundle
- integrate stronger retrieval adapters such as ObsidianMCP and SQLite FTS5
- preserve deterministic, inspectable grounding behavior

## Product Rationale

This slice supports the product principles already established:

- canon first
- human authority
- grounding is visible
- markdown first
- low overwhelm by default

Improving retrieval should raise answer quality across many future workflows:

- actor reaction
- multi-actor comparison
- consistency review
- canon query

## Design Questions To Resolve

- How should direct links, actor-note matches, and broader indexed search results be ranked against one another?
- What source-role distinctions should the grounding bundle expose?
- How should ambiguity be surfaced when entity resolution is uncertain?
- Where should ObsidianMCP and SQLite FTS5 sit relative to the current filesystem adapter?
- Which retrieval improvements belong in shared modules under `Source/` versus operator utilities under `Tools/`?

## Risks

- retrieval sophistication could become opaque if ranking rules are not inspectable
- introducing multiple adapters could blur authority if source precedence is unclear
- stronger search without stronger ranking could increase noise instead of quality
- deeper retrieval may expose vault content gaps that require domain authoring work, especially for thin character notes

## Assumptions

- the current first slice is stable enough that deeper retrieval is the highest-value next engineering investment
- the user will continue enriching some character and institutional notes over time
- ObsidianMCP and SQLite FTS5 are available enough to inform the next architecture decision

## Candidate Outputs

- architecture decision for retrieval adapter layering and ranking strategy
- explicit grounding source-role model
- follow-on engineering stories for:
  - adapter integration
  - ranking refinement
  - ambiguity handling
  - grounding-bundle enrichment

## Next State Recommendation

Proceed to architect work to define the next retrieval and grounding architecture slice, including adapter layering, ranking strategy, ambiguity handling, and bundle enrichment.
