---
name: mca:quick
description: "W5 Quick Execute — executor only, no review process"
argument-hint: "<task description>"
---
<objective>
Execute task directly using the simplest MCA workflow (W5). No review, no debate — for simple, clear tasks.

Task: $ARGUMENTS
</objective>

<workflow>
## Execute

Launch `mca-executor` (sonnet) directly:
- Input: User task description
- Execute: Analyze -> Implement -> Test
- Output: Change report

No other personas involved. Suitable for:
- Simple code modifications
- Well-defined small tasks
- Configuration changes
- Documentation updates

If executor encounters a situation requiring architectural decisions, suggest user switch to `/mca:feature`.
</workflow>

<execution_context>
@$HOME/.claude/skills/mca/SKILL.md
</execution_context>
