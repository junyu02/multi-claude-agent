---
name: mca:bugfix
description: "W4 Quick Fix — scout locates -> executor fixes -> reviewer verifies"
argument-hint: "<bug description or error message>"
---
<objective>
Quick bug fix using the MCA multi-persona workflow (W4).

Bug description: $ARGUMENTS
</objective>

<workflow>
## Step 0: Mode Detection

Determine mode based on current model: Opus -> FULL, Sonnet -> LITE, Haiku -> SOLO.
- **FULL/LITE** -> scout + executor + reviewer (3 steps)
- **SOLO** -> Executor fixes directly, skip to Step 2

## Step 1: Locate (scout)

Launch `mca-scout` (haiku):
- Search related code based on bug description
- Analyze error logs, stack traces
- Identify probable root cause locations
- Output: Relevant files, call chains, suspicious code segments

## Step 2: Fix (executor)

Launch `mca-executor` (sonnet):
- Input: Scout's findings + original bug description
- Fix the bug (minimal change principle)
- Write/update regression tests
- Run tests to verify fix works
- Ensure no new issues introduced

## Step 3: Verify (reviewer)

Launch `mca-reviewer` (opus):
- Review fix for correctness and completeness
- Focus checks:
  - Was the root cause fixed (not just symptoms)?
  - Were any new bugs introduced?
  - Are regression tests adequate?
- **PASS** -> Complete
- **FAIL** -> Back to Step 2, executor re-fixes (max 3 rounds)
</workflow>

<execution_context>
@$HOME/.claude/skills/mca/SKILL.md
</execution_context>
