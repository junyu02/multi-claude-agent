# Multi-Claude Agent (MCA) — Orchestration Skill

Multi-persona workflow orchestration system for Claude Code. Simulates team collaboration using different personas, maximizing Claude Max subscription value.

## Quick Reference

| Command | Workflow | Purpose |
|---------|----------|---------|
| `/mca:feature` | W1 | Feature development (defaults to LITE path, `--full` enables full 9-persona pipeline) |
| `/mca:review` | W2 | Code review (reviewer+adversary+devil->synthesizer) |
| `/mca:arch` | W3 | Architecture debate (multi-way debate+wildcard->synthesizer->pm) |
| `/mca:bugfix` | W4 | Quick fix (scout->executor->reviewer) |
| `/mca:quick` | W5 | Direct execution (executor only) |

## Runtime Modes

| Mode | Condition | Available Personas |
|------|-----------|-------------------|
| **FULL** | Opus + explicit `--full` flag | All 9 |
| **LITE** | Opus/Sonnet (default) | executor, reviewer, architect, scout |
| **SOLO** | Haiku | executor only |

Mode is determined by current model. **W1 defaults to the LITE path** even on Opus; only `--full` enables the full 9-persona pipeline. W2/W3/W4 select FULL/LITE automatically based on model.

## 9 Personas

| Persona | Agent File | Recommended Model | Decision Priority |
|---------|-----------|-------------------|-------------------|
| architect | `mca-architect` | Opus | Maintainability > Performance > Speed |
| executor | `mca-executor` | Sonnet | Correctness > Minimal Changes > Coverage |
| reviewer | `mca-reviewer` | Opus | 7-dimension scoring |
| adversary | `mca-adversary` | Sonnet | Find vulnerabilities, >= 3 |
| devil | `mca-devil` | Sonnet | Challenge premises, never "agree" |
| scout | `mca-scout` | Haiku | Collect only, no recommendations |
| wildcard | DeepSeek script | DeepSeek | Counter-consensus |
| pm | `mca-pm` | Sonnet | Is it worth doing? |
| synthesizer | `mca-synthesizer` | Opus | Conflict arbitration |

## Orchestration Rules

### Model Override Rule (CRITICAL)

The `model` field in agent definitions is a **preference**, not a hard constraint:

- **FULL mode**: Use the agent's recommended model (e.g., architect -> opus)
- **LITE mode**: **Omit** the `model` parameter from Agent tool calls. All agents inherit the orchestrator's current model (Sonnet/Opus). Do not pass `model` param.
- **SOLO mode**: Executor only, inherits current model

```
# FULL: Pass recommended model
Agent(subagent_type="mca-architect", prompt="...", model="opus")

# LITE: Omit model, inherit from orchestrator
Agent(subagent_type="mca-architect", prompt="...")
```

### Persona Invocation

**Claude personas (8)**: Use Agent tool (follow Model Override Rule above)

**Wildcard (DeepSeek)**: Use Bash
```bash
echo '{"context":"...","topic":"..."}' | node ~/.claude/scripts/mca-wildcard.js
```

### Parallel vs Sequential

- **Parallelizable**: Independent personas in the same stage (e.g., adversary + devil)
- **Must be sequential**: Stages with data dependencies (e.g., architect's output is executor's input)
- Use Agent tool's parallel invocation: launch multiple Agent calls in a single message

### Data Passing

Each persona returns standard JSON (see individual agent definitions). The orchestrator is responsible for:
1. Collecting all persona JSON outputs from the previous stage
2. Extracting key information to assemble the next stage's prompt
3. Presenting synthesizer's final output to the user

### Synthesizer Weights

**W1 Feature** (when multi-persona output is available):

| Persona | Weight | Rationale |
|---------|--------|-----------|
| architect | 0.35 | Technical solution lead |
| adversary | 0.25 | Security and risk gating |
| devil | 0.20 | Logical completeness |
| scout | 0.10 | Information foundation |
| pm | 0.10 | Value judgment |

**W2 Review**:

| Persona | Weight | Rationale |
|---------|--------|-----------|
| reviewer | 0.40 | Quality scoring lead |
| adversary | 0.35 | Security vulnerabilities prioritized |
| devil | 0.25 | Design premise validation |

**W3 Architecture**:

| Persona | Weight | Rationale |
|---------|--------|-----------|
| architect | 0.35 | Technical solution lead |
| adversary | 0.25 | Security and risk cannot be ignored |
| devil | 0.20 | Logical completeness assurance |
| scout | 0.10 | Information foundation |
| wildcard | 0.10 | Diversity value |

### Timeouts

| Model | Timeout |
|-------|---------|
| Haiku | 15s |
| Sonnet | 45s |
| Opus | 90s |
| DeepSeek | 30s |

### Retries

- reviewer FAIL -> executor fixes -> reviewer re-reviews
- Maximum 3 rounds
- After 3 rounds still FAIL -> Present issues to user for decision

### Wildcard Trigger

**Deterministic trigger condition** (replaces the previous fuzzy ">= 3 converge" check):
- Synthesizer returns `verdict: "CONSENSUS"` **AND** `confidence >= 0.8`
- i.e., wildcard challenge is only triggered when synthesizer confirms strong consensus
- Maximum 2 triggers per session
- After wildcard output, synthesizer must re-synthesize (incorporating wildcard)
- **Failure handling**: Script timeout/API error/non-zero exit -> Skip wildcard, continue with existing outputs. Do not block workflow.

### Self-Review Avoidance (CRITICAL)

#### Single-File Review

When the review target includes an MCA persona's own definition file, that persona **must be excluded** from the review pipeline:

| File Under Review | Excluded Persona | Substitute |
|-------------------|-----------------|------------|
| mca-reviewer.md | reviewer | adversary |
| mca-adversary.md | adversary | devil |
| mca-devil.md | devil | reviewer |
| mca-architect.md | architect | pm |
| mca-executor.md | executor | reviewer |

#### Multi-File Review

When changes involve **2 or more** mca-*.md files, the substitution chain may become circular. In this case:
- **Do not rely on persona substitution**
- **Force human confirmation**: Present the change diff to the user, tagged with `[MCA System Self-Change — Requires Human Review]`

#### Limitation Note

Substitute personas share the same underlying model weights as original personas. Different system prompts provide role differentiation but not truly independent review. **For ANY changes to the MCA system itself, human confirmation is always recommended.**

## Mode Degradation

| Workflow | FULL | LITE (default) | SOLO |
|----------|------|----------------|------|
| W1 Feature | pm->scout+arch->adv+devil->synth->exec->review | scout+arch->exec->review | exec |
| W2 Review | review+adv+devil->synth | review | - |
| W3 Architecture | scout->arch+adv+devil->wildcard?->synth->pm | arch->review | - |
| W4 Bugfix | scout->exec->review | exec->review | exec |
| W5 Quick | exec | exec | exec |

**W1 note**: Even on Opus, W1 defaults to the LITE path. Only `/mca:feature --full` enables the full 9-persona pipeline. Other workflows (W2-W5) select FULL/LITE automatically based on model.

SOLO mode supports W1 (exec only), W4, and W5.

## Trigger Mechanisms

### Auto-Trigger (L1 Hook)

UserPromptSubmit hook suggests workflows via keyword matching.
Classifier: `~/.claude/hooks/mca-classifier.js`

### Manual Trigger

User directly inputs `/mca:<workflow>`.
W1 supports appending `--full` to enable the full pipeline.

### Event-Driven

- After code modification (PostToolUse Write/Edit) -> Suggest W2
- After build/test failure (PostToolUse Bash detects error) -> Suggest W4

## Output Format

After orchestration completes, present to user:

```markdown
## MCA Results [W1-Feature] [LITE]

### Consensus
- ...

### Disagreements
| Topic | For | Against | Weighted Recommendation |
|-------|-----|---------|----------------------|
| ... | ... | ... | ... |

### Decisions Needed
1. ...
2. ...

### Next Steps
- ...
```
