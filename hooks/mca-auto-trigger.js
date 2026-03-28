#!/usr/bin/env node
// MCA Auto-Trigger — PostToolUse hook for W2 review and W4 bugfix suggestions
// Matcher: Bash|Write|Edit
// - After >=3 code file changes -> suggest W2 review
// - After build/test failure -> suggest W4 bugfix
// Uses tmpfile for state tracking (cooldown, change count)

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_FILE = path.join(os.tmpdir(), 'mca-auto-trigger-state.json');
const REVIEW_THRESHOLD = 5;    // suggest review after N code file changes
const REVIEW_COOLDOWN = 300;   // 5 minutes between review suggestions
const BUGFIX_COOLDOWN = 120;   // 2 minutes between bugfix suggestions

const CODE_EXTENSIONS = /\.(js|ts|jsx|tsx|py|go|rs|java|kt|swift|c|cpp|h|hpp|rb|php|vue|svelte)$/;
const CONFIG_EXTENSIONS = /\.(md|json|ya?ml|toml|css|scss|html|xml)$/;
const CONFIG_WEIGHT = 0.5; // config file changes count as 0.5 vs code's 1.0

const ERROR_PATTERNS = [
  /error\s*:/i,
  /Error:/,
  /FAIL/,
  /failed/i,
  /Cannot find/i,
  /not found/i,
  /compilation failed/i,
  /build failed/i,
  /test.*fail/i,
  /TypeError/,
  /SyntaxError/,
  /ReferenceError/,
  /panic:/,
  /FATAL/,
  /exit code [1-9]/i,
  /exit status [1-9]/,
];

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { codeChanges: 0, lastReviewSuggest: 0, lastBugfixSuggest: 0 };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {}
}

let input = '';
const timeout = setTimeout(() => process.exit(0), 3000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  clearTimeout(timeout);
  try {
    const data = JSON.parse(input);
    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};
    const toolOutput = data.tool_output?.output || '';

    const state = loadState();
    const now = Math.floor(Date.now() / 1000);

    // Track file changes (Write/Edit) — code files weight 1.0, config files weight 0.5
    if (toolName === 'Write' || toolName === 'Edit') {
      const filePath = toolInput.file_path || '';
      const isCode = CODE_EXTENSIONS.test(filePath);
      const isConfig = !isCode && CONFIG_EXTENSIONS.test(filePath);
      if (isCode || isConfig) {
        state.codeChanges += isCode ? 1 : CONFIG_WEIGHT;
        saveState(state);

        // Suggest review after threshold
        if (state.codeChanges >= REVIEW_THRESHOLD
            && (now - state.lastReviewSuggest) > REVIEW_COOLDOWN) {
          state.lastReviewSuggest = now;
          state.codeChanges = 0;
          saveState(state);
          process.stdout.write(
            `<mca-auto-review>\n`
            + `${REVIEW_THRESHOLD}+ code files modified. Consider running /mca:review for multi-persona code review.\n`
            + `</mca-auto-review>\n`
          );
        }
      }
      process.exit(0);
    }

    // Detect build/test failures (Bash)
    if (toolName === 'Bash') {
      const hasError = ERROR_PATTERNS.some(p => p.test(toolOutput));
      if (hasError && (now - state.lastBugfixSuggest) > BUGFIX_COOLDOWN) {
        state.lastBugfixSuggest = now;
        saveState(state);
        process.stdout.write(
          `<mca-auto-bugfix>\n`
          + `Build/test error detected. For multi-persona collaborative fix, run /mca:bugfix.\n`
          + `</mca-auto-bugfix>\n`
        );
      }
    }
  } catch {
    process.exit(0);
  }
});
