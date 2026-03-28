---
name: mca:feature
description: "W1 Full Feature Development — PM gate -> research+architecture -> red team+devil -> synthesis -> execution -> review"
argument-hint: "<feature description>"
---
<objective>
Complete feature development using the MCA multi-persona workflow. This is the most comprehensive workflow (W1).

User requirement: $ARGUMENTS
</objective>

<workflow>
## Step 0: Mode Detection

Determine mode based on current model: Opus -> FULL, Sonnet -> LITE, Haiku -> SOLO.

- **FULL** -> Execute complete 6-stage pipeline
- **LITE** -> Skip pm/adversary/devil/wildcard, execute scout+architect -> executor -> reviewer
- **SOLO** -> Executor only, skip to Step 5

## Step 1: PM Gate (FULL only)

Launch `mca-pm` agent:
- Input: User requirement description
- Verdict: GO / NO_GO / SIMPLIFY
- **NO_GO** -> Terminate workflow, explain to user why it's not worth doing
- **SIMPLIFY** -> Continue with simplified plan
- **GO** -> Continue

## Step 2: Research + Architecture (Parallel)

**Launch two agents in parallel:**
1. `mca-scout` (haiku) — Gather codebase information, dependencies, existing implementations
2. `mca-architect` (opus) — Analyze requirements, propose architecture

Wait for both to complete, collect JSON outputs.

## Step 3: Red Team + Devil (Parallel, FULL only)

Using the architecture proposal from Step 2 as input, **launch in parallel:**
1. `mca-adversary` (sonnet) — Attack technical vulnerabilities in the proposal
2. `mca-devil` (sonnet) — Challenge the premises and assumptions of the proposal

Wait for both to complete, collect JSON outputs.

### Wildcard Check

If >= 3 of architect + adversary + devil converge on the same viewpoint:
- Call `~/.claude/scripts/mca-wildcard.js` for a counter-consensus perspective
- **If script fails** (timeout/API error) -> Skip wildcard, continue
- Include wildcard output (if available) in next step

## Step 4: Synthesis (Only when FULL/LITE has multi-persona output)

Launch `mca-synthesizer` (opus):
- Input: All preceding persona JSON outputs
- Output: Consensus, disagreements, weighted recommendations, user decision points

**Present synthesizer results to user, wait for confirmation before continuing.**

## Step 5: Execution

Launch `mca-executor` (sonnet):
- Input: Synthesizer's recommended plan (or architect's plan in LITE/SOLO mode)
- Execute: Write code, write tests, run verification

## Step 6: Review

Launch `mca-reviewer` (opus):
- Input: Executor's changes
- Review: 7-dimension scoring
- **PASS** -> Workflow complete, present final report
- **FAIL** -> Executor fixes -> Reviewer re-reviews (max 3 rounds)
</workflow>

<execution_context>
@$HOME/.claude/skills/mca/SKILL.md
</execution_context>
