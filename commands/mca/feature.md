---
name: mca:feature
description: "W1 Feature Development — Defaults to LITE (scout+arch->exec->review), --full enables full 9-persona pipeline"
argument-hint: "<feature description> [--full]"
---
<objective>
Complete feature development using the MCA multi-persona workflow. This is the most comprehensive workflow (W1).

User requirement: $ARGUMENTS
</objective>

<workflow>
## Step 0: Mode Detection

1. Check if arguments contain `--full`
2. Determine base mode from current model: Opus -> FULL/LITE, Sonnet -> LITE, Haiku -> SOLO

**W1 special rule**: Even on Opus, W1 defaults to the **LITE** path. Only when the user explicitly passes `--full` does it run the full 9-persona pipeline.

- **FULL** (`--full` + Opus) -> Execute complete 6-stage pipeline
- **LITE** (default) -> scout+architect -> executor -> reviewer
- **SOLO** (Haiku) -> Executor only, skip to Step 5

**Model override**: In LITE mode, do not pass the `model` parameter to Agent tool calls — agents inherit the orchestrator's model.

## Step 1: PM Gate (FULL only)

Launch `mca-pm` agent (model="sonnet"):
- Input: User requirement description
- Verdict: GO / NO_GO / SIMPLIFY
- **NO_GO** -> Terminate workflow, explain to user why it's not worth doing
- **SIMPLIFY** -> Continue with simplified plan
- **GO** -> Continue

## Step 2: Research + Architecture (Parallel)

**Launch two agents in parallel:**
1. `mca-scout` — Gather codebase information, dependencies, existing implementations
2. `mca-architect` — Analyze requirements, propose architecture

(FULL mode passes recommended model, LITE mode omits model param)

Wait for both to complete, collect JSON outputs.

## Step 3: Red Team + Devil (Parallel, FULL only)

Using the architecture proposal from Step 2 as input, **launch in parallel:**
1. `mca-adversary` (model="sonnet") — Attack technical vulnerabilities in the proposal
2. `mca-devil` (model="sonnet") — Challenge the premises and assumptions of the proposal

Wait for both to complete, collect JSON outputs.

## Step 4: Synthesis (Only when FULL/LITE has multi-persona output)

Launch `mca-synthesizer`:
- Input: All preceding persona JSON outputs
- Weights (W1): architect 0.35, adversary 0.25, devil 0.20, scout 0.10, pm 0.10
- Output: Consensus, disagreements, weighted recommendations, user decision points

### Wildcard Check (FULL only)

If synthesizer returns `verdict: "CONSENSUS"` AND `confidence >= 0.8`:
- Call `~/.claude/scripts/mca-wildcard.js` to challenge the strong consensus
- **If script fails** (timeout/API error) -> Skip wildcard, continue
- If wildcard output available -> Synthesizer re-synthesizes (incorporating wildcard)

**Present synthesizer results to user, wait for confirmation before continuing.**

## Step 5: Execution

Launch `mca-executor`:
- Input: Synthesizer's recommended plan (or architect's plan in LITE/SOLO mode)
- Execute: Write code, write tests, run verification

## Step 6: Review

Launch `mca-reviewer`:
- Input: Executor's changes
- Review: 7-dimension scoring
- **PASS** -> Workflow complete, present final report
- **FAIL** -> Executor fixes -> Reviewer re-reviews (max 3 rounds)
</workflow>

<execution_context>
@$HOME/.claude/skills/mca/SKILL.md
</execution_context>
