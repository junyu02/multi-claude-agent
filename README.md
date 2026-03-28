# Multi-Claude Agent (MCA)

**[中文文档](README.zh-CN.md)**

> Multi-persona orchestration system for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Simulates team collaboration with 9 specialized AI personas, 5 workflow pipelines, and 3 runtime modes.

## What is MCA?

MCA turns a single Claude Code session into a simulated development team. Instead of one AI doing everything, MCA orchestrates multiple specialized personas — each with different priorities, constraints, and perspectives — to produce higher-quality output through structured debate and review.

**Key insight from real-world testing**: 3 precise perspectives (reviewer + adversary + devil) produce more value than 9 overlapping roles. MCA provides the full 9-persona system when you want depth, and automatically degrades to fewer personas based on your model tier.

## Architecture

```
User Request
     |
     v
[L1 Classifier] ──> Suggests workflow (W1-W5)
     |
     v
[Mode Detection] ──> FULL / LITE / SOLO
     |
     v
[Workflow Pipeline]
     |
     ├── W1: PM -> Scout+Architect -> Adversary+Devil -> Synthesizer -> Executor -> Reviewer
     ├── W2: Reviewer + Adversary + Devil -> Synthesizer
     ├── W3: Scout -> 4-way Debate -> Wildcard? -> Synthesizer -> PM
     ├── W4: Scout -> Executor -> Reviewer
     └── W5: Executor (direct)
```

## 9 Personas

| Persona | Model | Role | Decision Priority |
|---------|-------|------|-------------------|
| **Architect** | Opus | System design, tech choices | Maintainability > Performance > Speed |
| **Executor** | Sonnet | Code implementation | Correctness > Minimal Changes > Coverage |
| **Reviewer** | Opus | 7-dimension quality scoring | Weighted avg >= 7.0, no dim <= 3 |
| **Adversary** | Sonnet | Red team — finds vulnerabilities | Must find >= 3 issues |
| **Devil** | Sonnet | Devil's advocate — challenges premises | Never says "I agree" |
| **Scout** | Haiku | Intelligence gathering | Reports facts only, no opinions |
| **PM** | Sonnet | Product gate — is it worth doing? | GO / NO_GO / SIMPLIFY |
| **Synthesizer** | Opus | Conflict arbitration | Weighted consensus |
| **Wildcard** | DeepSeek | Counter-consensus from non-Claude model | Triggered when >= 3 personas converge |

## 5 Workflows

| Command | Pipeline | Best For |
|---------|----------|----------|
| `/mca:feature` | Full 6-stage pipeline | New features, complex implementations |
| `/mca:review` | 3-way parallel review | Code quality audits |
| `/mca:arch` | Multi-way debate + wildcard | Architecture decisions, tech choices |
| `/mca:bugfix` | Scout -> fix -> verify | Bug fixes, error resolution |
| `/mca:quick` | Executor only | Simple, well-defined tasks |

## 3 Runtime Modes

| Mode | Condition | Available Personas |
|------|-----------|-------------------|
| **FULL** | Opus model | All 9 personas |
| **LITE** | Sonnet model | executor, reviewer, architect, scout |
| **SOLO** | Haiku model | executor only |

Mode is determined automatically by the current model. Workflows degrade gracefully:

| Workflow | FULL | LITE | SOLO |
|----------|------|------|------|
| W1 Feature | pm->scout+arch->adv+devil->synth->exec->review | scout+arch->exec->review | exec |
| W2 Review | review+adv+devil->synth | review | - |
| W3 Architecture | scout->arch+adv+devil->wildcard?->synth->pm | arch->review | - |
| W4 Bugfix | scout->exec->review | exec->review | exec |
| W5 Quick | exec | exec | exec |

## Installation

```bash
git clone https://github.com/OscarWolf/multi-claude-agent.git
cd multi-claude-agent
chmod +x install.sh
./install.sh
```

Then add hooks to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node ~/.claude/hooks/mca-classifier.js",
        "timeout": 5000
      }
    ],
    "PostToolUse": [
      {
        "type": "command",
        "command": "node ~/.claude/hooks/mca-auto-trigger.js",
        "matcher": "Bash|Write|Edit",
        "timeout": 3000
      }
    ]
  }
}
```

Restart Claude Code to pick up new agent definitions.

### Optional: Wildcard Persona (DeepSeek)

The wildcard persona calls DeepSeek for a non-Claude counter-consensus perspective. To enable:

```bash
export OPENAI_BASE_URL=https://api.deepseek.com
export OPENAI_API_KEY=your-deepseek-api-key
```

Or add to `~/.claude/settings.json` under `"env"`. If not configured, wildcard is silently skipped.

## Usage

### Manual

```
/mca:feature implement JWT authentication with refresh tokens
/mca:review src/auth/
/mca:arch should we use Redis or PostgreSQL for session storage
/mca:bugfix TypeError: Cannot read property 'id' of undefined in user.ts
/mca:quick rename getUserById to findUserById across the codebase
```

### Auto-Trigger

MCA automatically suggests workflows based on context:

- **Keyword detection**: When your prompt matches development intent patterns, MCA suggests the appropriate workflow
- **Code change tracking**: After 5+ file modifications, suggests `/mca:review`
- **Error detection**: After build/test failures, suggests `/mca:bugfix`

## File Structure

```
~/.claude/
├── agents/
│   ├── mca-architect.md      # System design persona
│   ├── mca-executor.md       # Code implementation persona
│   ├── mca-reviewer.md       # Quality review persona
│   ├── mca-adversary.md      # Red team persona
│   ├── mca-devil.md          # Devil's advocate persona
│   ├── mca-scout.md          # Intelligence gathering persona
│   ├── mca-pm.md             # Product manager persona
│   └── mca-synthesizer.md    # Conflict arbitration persona
├── commands/mca/
│   ├── feature.md             # W1 workflow
│   ├── review.md              # W2 workflow
│   ├── arch.md                # W3 workflow
│   ├── bugfix.md              # W4 workflow
│   └── quick.md               # W5 workflow
├── skills/mca/
│   └── SKILL.md               # Orchestration skill definition
├── scripts/
│   ├── mca-wildcard.js        # DeepSeek counter-consensus
│   └── mca-mode-detect.js     # Runtime mode detection
└── hooks/
    ├── mca-classifier.js      # L1 keyword classifier
    └── mca-auto-trigger.js    # Post-edit review trigger
```

## Design Decisions

### Self-Review Avoidance

When reviewing MCA's own definition files, the corresponding persona is excluded to prevent self-evaluation bias:

| File Under Review | Excluded | Substitute |
|-------------------|----------|------------|
| mca-reviewer.md | reviewer | adversary |
| mca-adversary.md | adversary | devil |
| mca-architect.md | architect | pm |

**Limitation**: Substitutes share the same underlying model weights. Different system prompts provide role differentiation but not truly independent review.

### Wildcard Resilience

The wildcard persona (DeepSeek) is designed to fail gracefully:
- If API key is not set: silently skipped
- If API times out (30s): returns error JSON, orchestrator skips and continues
- If API returns invalid response: falls back to error JSON

Wildcard never blocks the workflow pipeline.

### Why Not Usage-Based Mode Detection?

Claude Code does not expose `rate_limits` data to hook scripts. Mode detection is effectively model-based only (Opus/Sonnet/Haiku). The usage threshold logic is preserved in `mca-mode-detect.js` for future compatibility if this API becomes available.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI or desktop app
- Claude Max subscription (recommended for FULL mode with Opus)
- Node.js >= 18 (for hooks and scripts)
- (Optional) DeepSeek API key for wildcard persona

## License

MIT
