#!/usr/bin/env bash
set -euo pipefail

# MCA — Multi-Claude Agent Installer
# Installs agents, commands, skills, scripts, and hooks into ~/.claude/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${HOME}/.claude"

echo "=== Multi-Claude Agent (MCA) Installer ==="
echo ""

# Create directories
mkdir -p "${CLAUDE_DIR}/agents"
mkdir -p "${CLAUDE_DIR}/commands/mca"
mkdir -p "${CLAUDE_DIR}/skills/mca"
mkdir -p "${CLAUDE_DIR}/scripts"
mkdir -p "${CLAUDE_DIR}/hooks"

# Install agents
echo "[1/5] Installing agent definitions..."
cp "${SCRIPT_DIR}/agents"/mca-*.md "${CLAUDE_DIR}/agents/"
echo "  -> 8 agent personas installed"

# Install commands
echo "[2/5] Installing slash commands..."
cp "${SCRIPT_DIR}/commands/mca"/*.md "${CLAUDE_DIR}/commands/mca/"
echo "  -> 5 workflow commands installed (/mca:feature, /mca:review, /mca:arch, /mca:bugfix, /mca:quick)"

# Install skill
echo "[3/5] Installing skill definition..."
cp "${SCRIPT_DIR}/skills/mca/SKILL.md" "${CLAUDE_DIR}/skills/mca/"
echo "  -> MCA orchestration skill installed"

# Install scripts
echo "[4/5] Installing scripts..."
cp "${SCRIPT_DIR}/scripts"/mca-*.js "${CLAUDE_DIR}/scripts/"
chmod +x "${CLAUDE_DIR}/scripts"/mca-*.js
echo "  -> 2 scripts installed (wildcard, mode-detect)"

# Install hooks
echo "[5/5] Installing hooks..."
cp "${SCRIPT_DIR}/hooks"/mca-*.js "${CLAUDE_DIR}/hooks/"
chmod +x "${CLAUDE_DIR}/hooks"/mca-*.js
echo "  -> 2 hooks installed (classifier, auto-trigger)"

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo ""
echo "  1. Configure hooks in ~/.claude/settings.json:"
echo ""
echo '     "hooks": {'
echo '       "UserPromptSubmit": ['
echo '         {'
echo '           "type": "command",'
echo '           "command": "node ~/.claude/hooks/mca-classifier.js",'
echo '           "timeout": 5000'
echo '         }'
echo '       ],'
echo '       "PostToolUse": ['
echo '         {'
echo '           "type": "command",'
echo '           "command": "node ~/.claude/hooks/mca-auto-trigger.js",'
echo '           "matcher": "Bash|Write|Edit",'
echo '           "timeout": 3000'
echo '         }'
echo '       ]'
echo '     }'
echo ""
echo "  2. (Optional) For wildcard persona, set DeepSeek API credentials:"
echo "     export OPENAI_BASE_URL=https://api.deepseek.com"
echo "     export OPENAI_API_KEY=your-api-key"
echo ""
echo "  3. Restart Claude Code to pick up new agent definitions."
echo ""
echo "  4. Try it out:"
echo "     /mca:feature implement user authentication"
echo "     /mca:review"
echo "     /mca:arch should we use microservices or monolith"
echo ""
