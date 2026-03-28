# Multi-Claude Agent (MCA) — Orchestration Skill

Multi-persona workflow orchestration system for Claude Code. Simulates team collaboration using different personas, maximizing Claude Max subscription value.

## Quick Reference

| Command | Workflow | Purpose |
|---------|----------|---------|
| `/mca:feature` | W1 | Full feature development (pm->scout->architect->adversary->devil->synthesizer->executor->reviewer) |
| `/mca:review` | W2 | Code review (reviewer+adversary+devil->synthesizer) |
| `/mca:arch` | W3 | Architecture debate (multi-way debate+wildcard->synthesizer->pm) |
| `/mca:bugfix` | W4 | Quick fix (scout->executor->reviewer) |
| `/mca:quick` | W5 | Direct execution (executor only) |

## Runtime Modes

| Mode | Condition | Available Personas |
|------|-----------|-------------------|
| **FULL** | Opus | All 9 |
| **LITE** | Sonnet | executor, reviewer, architect, scout |
| **SOLO** | Haiku | executor only |

Mode is determined by current model. Usage-based degradation is not available as Claude Code does not expose rate_limits API.

## 9 Personas

| Persona | Agent File | Model | Decision Priority |
|---------|-----------|-------|-------------------|
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

### Persona Invocation

**Claude personas (8)**: Use Agent tool
```
Agent(subagent_type="mca-architect", prompt="...", model="opus")
```

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

- Condition: >= 3 Claude personas converge on the same topic
- Maximum 2 triggers per session
- Cooldown: After wildcard output, synthesizer must incorporate it
- **Failure handling**: Script timeout/API error/non-zero exit -> Skip wildcard, continue with existing outputs. Do not block workflow.

### Self-Review Avoidance (CRITICAL)

When the review target includes an MCA persona's own definition file, that persona **must be excluded** from the review pipeline:

| File Under Review | Excluded Persona | Substitute |
|-------------------|-----------------|------------|
| mca-reviewer.md | reviewer | adversary |
| mca-adversary.md | adversary | devil |
| mca-devil.md | devil | reviewer |
| mca-architect.md | architect | pm |
| mca-executor.md | executor | reviewer |

**Limitation note**: Substitute personas share the same underlying model weights as original personas. Different system prompts provide role differentiation but not truly independent review. For significant changes to the MCA system itself, human confirmation is recommended.

## Mode Degradation

When mode is not FULL, workflows automatically degrade:

| Workflow | FULL | LITE | SOLO |
|----------|------|------|------|
| W1 Feature | pm->scout+arch->adv+devil->synth->exec->review | scout+arch->exec->review | exec |
| W2 Review | review+adv+devil->synth | review | - |
| W3 Architecture | scout->arch+adv+devil->wildcard?->synth->pm | arch->review | - |
| W4 Bugfix | scout->exec->review | exec->review | exec |
| W5 Quick | exec | exec | exec |

SOLO mode supports W1 (exec only), W4, and W5.

## Trigger Mechanisms

### Auto-Trigger (L1 Hook)

UserPromptSubmit hook suggests workflows via keyword matching.
Classifier: `~/.claude/hooks/mca-classifier.js`

### Manual Trigger

User directly inputs `/mca:<workflow>`.

### Event-Driven

- After code modification (PostToolUse Write/Edit) -> Suggest W2
- After build/test failure (PostToolUse Bash detects error) -> Suggest W4

## Output Format

After orchestration completes, present to user:

```markdown
## MCA Results [W1-Feature] [FULL]

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
