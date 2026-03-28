#!/usr/bin/env node
// MCA Classifier — L1 keyword workflow classifier
// Hook: UserPromptSubmit
// stdin: JSON { session_id, user_prompt, model, rate_limits, ... }
// stdout: MCA workflow suggestion (injected into conversation context)

const KEYWORDS = {
  W1: {
    name: 'Feature',
    command: '/mca:feature',
    patterns: [
      /\b(implement|add\s+feature|build|create|develop|new\s+feature|make\s+a|set\s*up)\b/i,
    ],
    weight: 1.0,
  },
  W2: {
    name: 'Review',
    command: '/mca:review',
    patterns: [
      /\b(review|check\s+code|audit|inspect|code\s+review|looks?\s+good)\b/i,
    ],
    weight: 1.0,
  },
  W3: {
    name: 'Architecture',
    command: '/mca:arch',
    patterns: [
      /\b(design|architecture|refactor|redesign|system\s+design|tech\s+choice|compare|trade.?off|which\s+one|optimiz|scal|migrat|moderniz)\b/i,
    ],
    weight: 1.0,
  },
  W4: {
    name: 'Bugfix',
    command: '/mca:bugfix',
    patterns: [
      /\b(fix|bug|error|broken|crash|issue|debug|failing|failed|doesn.?t\s+work|not\s+working)\b/i,
    ],
    weight: 1.2, // slightly prefer bugfix for ambiguous error messages
  },
  W5: {
    name: 'Quick',
    command: '/mca:quick',
    patterns: [
      /\b(quick|just\s+do|simple|small\s+change|tweak|rename|update\s+config|move|swap)\b/i,
    ],
    weight: 0.8,
  },
};

// Skip classification for these patterns
const SKIP_PATTERNS = [
  /^\/mca:/,                          // Already an MCA command
  /^\//,                              // Any slash command
  /^(hi|hello|hey)\b/i,              // Greetings
  /^(remember|forget)\b/i,           // Memory operations
];

function classifyL1(prompt) {
  const scores = {};
  let maxScore = 0;
  let bestWorkflow = null;

  for (const [wf, config] of Object.entries(KEYWORDS)) {
    let matchCount = 0;
    for (const pattern of config.patterns) {
      if (pattern.test(prompt)) matchCount++;
    }
    if (matchCount > 0) {
      const score = matchCount * config.weight;
      scores[wf] = score;
      if (score > maxScore) {
        maxScore = score;
        bestWorkflow = wf;
      }
    }
  }

  // Confidence: 0-1 based on match strength
  const confidence = maxScore > 0 ? Math.min(maxScore / 2, 1.0) : 0;

  return { bestWorkflow, confidence, scores };
}

function detectMode(stdin) {
  const modelId = stdin.model?.id || '';
  const usage5h = stdin.rate_limits?.five_hour?.used_percentage ?? 0;

  if (modelId.includes('haiku') || usage5h > 80) return 'SOLO';
  if (modelId.includes('sonnet') || usage5h >= 60) return 'LITE';
  if (modelId.includes('opus') && usage5h < 60) return 'FULL';
  return 'LITE';
}

const PIPELINES = {
  FULL: {
    W1: 'pm -> scout+architect -> adversary+devil -> synthesizer -> executor -> reviewer',
    W2: 'reviewer+adversary+devil -> synthesizer',
    W3: 'scout -> architect+adversary+devil -> wildcard? -> synthesizer -> pm',
    W4: 'scout -> executor -> reviewer',
    W5: 'executor',
  },
  LITE: {
    W1: 'scout+architect -> executor -> reviewer',
    W2: 'reviewer',
    W3: 'architect -> reviewer',
    W4: 'executor -> reviewer',
    W5: 'executor',
  },
  SOLO: {
    W1: 'executor',
    W4: 'executor',
    W5: 'executor',
  },
};

// Main
let input = '';
const timeout = setTimeout(() => process.exit(0), 5000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  clearTimeout(timeout);
  try {
    const stdin = JSON.parse(input);
    const prompt = stdin.user_prompt || '';

    // Skip short prompts
    if (prompt.trim().length < 2) process.exit(0);
    if (SKIP_PATTERNS.some(p => p.test(prompt.trim()))) process.exit(0);

    // Detect mode
    const mode = detectMode(stdin);

    // L1: Keyword classification
    let result = classifyL1(prompt);
    let source = 'L1-keywords';

    // No classification -> silent exit
    if (!result.bestWorkflow || result.confidence < 0.3) process.exit(0);

    const wf = result.bestWorkflow;
    const config = KEYWORDS[wf];

    // Check mode compatibility
    const pipeline = PIPELINES[mode]?.[wf];
    if (!pipeline) {
      // Workflow not available in this mode
      process.exit(0);
    }

    // Output suggestion
    const output = `<mca-workflow-suggestion>
MCA detected dev intent | Mode: ${mode} | Workflow: ${wf}-${config.name} | Confidence: ${(result.confidence * 100).toFixed(0)}% | Source: ${source}
Pipeline: ${pipeline}
Command: ${config.command}
To run the full MCA workflow, type ${config.command} or let me orchestrate automatically.
</mca-workflow-suggestion>`;

    process.stdout.write(output);
  } catch {
    process.exit(0);
  }
});
