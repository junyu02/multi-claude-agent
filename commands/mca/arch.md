---
name: mca:arch
description: "W3 Architecture Debate — multi-way debate + consensus + wildcard -> synthesizer -> PM"
argument-hint: "<architecture question or design decision>"
---
<objective>
Conduct architecture debate using the MCA multi-persona workflow (W3). This is the deepest analysis workflow.

Architecture topic: $ARGUMENTS
</objective>

<workflow>
## Step 0: Mode Detection

Determine mode based on current model: Opus -> FULL, Sonnet -> LITE, Haiku -> SOLO.
- **FULL** -> Complete multi-way debate + wildcard + synthesizer + PM
- **LITE** -> architect + reviewer (simplified)
- **SOLO** -> W3 not supported

## Step 1: Intelligence Gathering

Launch `mca-scout` (haiku):
- Collect all codebase information related to the topic
- Dependencies, existing architecture, tech stack constraints

## Step 2: Multi-Way Debate (Parallel, FULL only)

Using scout's intelligence as shared context, **launch 4 agents in parallel:**

1. `mca-architect` (opus) — Propose architecture, favor maintainability
2. `mca-adversary` (sonnet) — Attack technical weaknesses of proposals
3. `mca-devil` (sonnet) — Challenge fundamental premises of proposals
4. `mca-scout` (haiku) — Supplementary research (if Step 1 info insufficient)

Wait for all to complete.

## Step 3: Consensus Detection + Wildcard

Analyze multi-way outputs:
- Extract core viewpoints from all personas
- Check if >= 3 personas converge

**If converging**: Call `~/.claude/scripts/mca-wildcard.js`
- Input: The converging consensus + the topic
- Get DeepSeek's counter-consensus perspective
- **If script fails** (timeout/API error/non-zero exit) -> Skip wildcard, continue with existing outputs

**If not converging**: Skip wildcard

## Step 4: Synthesis

Launch `mca-synthesizer` (opus):
- Input: All persona outputs (including wildcard if available)
- Weights: architect 0.35, adversary 0.25, devil 0.20, scout 0.10, wildcard 0.10
- Output: Consensus, disagreements, weighted recommendations, user decision points

## Step 5: PM Evaluation (FULL only)

Launch `mca-pm` (sonnet):
- Input: Synthesizer's recommended plan
- Evaluate: Is it worth doing, ROI, simplification potential

## Step 6: Present Results

Present complete debate report to user:
1. Core viewpoint comparison table for each side
2. Consensus and disagreements
3. Weighted recommendations
4. PM's ROI evaluation
5. Decision points requiring user input
</workflow>

<execution_context>
@$HOME/.claude/skills/mca/SKILL.md
</execution_context>
