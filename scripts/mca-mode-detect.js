#!/usr/bin/env node
// MCA Mode Detector — determines FULL/LITE/SOLO runtime mode
// stdin: Claude Code statusline JSON (model, rate_limits)
// stdout: JSON { mode, model, usage, reason }
//
// Mode rules:
//   FULL: Opus   -> all 9 personas
//   LITE: Sonnet  -> executor, reviewer, architect, scout
//   SOLO: Haiku   -> executor only
//
// Note: Usage-based degradation (60%/80% thresholds) is defined but
// rarely triggers in practice because Claude Code does not expose
// rate_limits data to scripts. Mode detection effectively operates
// on model type only.

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

    // Rate limits from Claude Code (may not be available)
    const usage5h = stdin.rate_limits?.five_hour?.used_percentage  ?? 0;
    const usage7d = stdin.rate_limits?.seven_day?.used_percentage  ?? 0;

    // Pro vs Max inference: Max has much higher limits
    const isLikelyPro = usage5h > 70 && usage7d > 50;

    // Model family detection
    const isOpus   = modelId.includes('opus');
    const isSonnet = modelId.includes('sonnet');
    const isHaiku  = modelId.includes('haiku');

    // Mode determination
    let mode, reason, personas;

    if (isHaiku || usage5h > 80) {
      mode = 'SOLO';
      reason = isHaiku
        ? 'Haiku model -> minimal persona set'
        : `Usage ${usage5h}% > 80% -> conserve tokens`;
      personas = ['executor'];
    } else if (isSonnet || usage5h >= 60 || isLikelyPro) {
      mode = 'LITE';
      reason = isLikelyPro
        ? 'Pro subscription detected -> limited persona set'
        : isSonnet
          ? 'Sonnet model -> standard persona set'
          : `Usage ${usage5h}% in 60-80% range -> reduced personas`;
      personas = ['executor', 'reviewer', 'architect', 'scout'];
    } else if (isOpus && usage5h < 60) {
      mode = 'FULL';
      reason = `Opus + usage ${usage5h}% < 60% -> full 9-persona pipeline`;
      personas = [
        'architect', 'executor', 'reviewer', 'adversary',
        'devil', 'scout', 'wildcard', 'pm', 'synthesizer',
      ];
    } else {
      // Fallback
      mode = 'LITE';
      reason = `Unknown model "${modelId}" -> default to LITE`;
      personas = ['executor', 'reviewer', 'architect', 'scout'];
    }

    const result = {
      mode,
      model: { id: modelId, name: modelName },
      usage: { five_hour: usage5h, seven_day: usage7d },
      is_likely_pro: isLikelyPro,
      personas,
      reason,
    };

    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch {
    process.stdout.write(JSON.stringify({
      mode: 'SOLO',
      reason: 'Parse error -> fallback to SOLO',
      personas: ['executor'],
    }) + '\n');
  }
});
