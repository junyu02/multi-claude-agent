#!/usr/bin/env node
// MCA Mode Detector — determines FULL/LITE/SOLO runtime mode
// stdin: JSON with model info (e.g., { model: { id: "claude-opus-4-..." } })
// stdout: JSON { mode, model, personas, reason }
//
// Mode is determined solely by model family:
//   FULL: Opus   -> all 9 personas
//   LITE: Sonnet  -> executor, reviewer, architect, scout
//   SOLO: Haiku   -> executor only

let input = '';
const timeout = setTimeout(() => process.exit(0), 3000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  clearTimeout(timeout);
  try {
    const stdin = JSON.parse(input);
    const modelId   = stdin.model?.id || '';
    const modelName = stdin.model?.display_name || modelId;

    const isOpus   = modelId.includes('opus');
    const isSonnet = modelId.includes('sonnet');
    const isHaiku  = modelId.includes('haiku');

    let mode, reason, personas;

    if (isHaiku) {
      mode = 'SOLO';
      reason = 'Haiku model -> minimal persona set';
      personas = ['executor'];
    } else if (isSonnet) {
      mode = 'LITE';
      reason = 'Sonnet model -> standard persona set';
      personas = ['executor', 'reviewer', 'architect', 'scout'];
    } else if (isOpus) {
      mode = 'FULL';
      reason = 'Opus model -> full 9-persona pipeline';
      personas = [
        'architect', 'executor', 'reviewer', 'adversary',
        'devil', 'scout', 'wildcard', 'pm', 'synthesizer',
      ];
    } else {
      mode = 'LITE';
      reason = `Unknown model "${modelId}" -> default to LITE`;
      personas = ['executor', 'reviewer', 'architect', 'scout'];
    }

    process.stdout.write(JSON.stringify({
      mode,
      model: { id: modelId, name: modelName },
      personas,
      reason,
    }, null, 2) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({
      mode: 'SOLO',
      reason: 'Parse error -> fallback to SOLO',
      personas: ['executor'],
    }) + '\n');
  }
});
