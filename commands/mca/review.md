---
name: mca:review
description: "W2 Code Review — reviewer+adversary+devil parallel -> synthesizer"
argument-hint: "[file or git diff range]"
---
<objective>
Perform code review using the MCA multi-persona workflow (W2).

Review scope: $ARGUMENTS (if not specified, use `git diff` to check recent changes)
</objective>

<workflow>
## Step 0: Mode Detection

Determine mode based on current model: Opus -> FULL, Sonnet -> LITE, Haiku -> SOLO.
- **FULL** -> 3-persona parallel review + synthesizer
- **LITE** -> Reviewer only
- **SOLO** -> W2 not supported, suggest using /mca:quick

## Step 1: Get Change Scope

- If user specified files/range -> Use specified scope
- Otherwise -> `git diff HEAD~1` or `git diff --staged`
- Read complete changed files (not just diffs)

## Step 2: Three-Way Parallel Review (FULL only)

**Launch 3 agents in parallel**, each receiving the change content:

1. `mca-reviewer` (opus) — 7-dimension quality scoring
2. `mca-adversary` (sonnet) — Security vulnerabilities, failure modes
3. `mca-devil` (sonnet) — Design premises, architectural assumptions

Wait for all to complete, collect JSON.

## Step 3: Synthesis

Launch `mca-synthesizer` (opus) with structured input:
```
{
  "reviewer": <reviewer's JSON output>,
  "adversary": <adversary's JSON output>,
  "devil": <devil's JSON output>
}
```
- Weights (W2): reviewer 0.40, adversary 0.35, devil 0.25
- Integrate 3 review reports
- Output: Consensus issues, disagreements, priority ranking

## Step 4: Present Results

Present to user:
1. Reviewer's 7-dimension score table
2. Combined issues list (CRITICAL -> HIGH -> MEDIUM -> LOW)
3. Questions requiring user decision

If CRITICAL/HIGH issues exist, suggest user fix and re-run `/mca:review`.
</workflow>

<execution_context>
@$HOME/.claude/skills/mca/SKILL.md
</execution_context>
