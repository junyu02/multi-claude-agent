#!/usr/bin/env node
// MCA Wildcard — DeepSeek counter-consensus persona
// Called by orchestrator when >=3 Claude personas converge on same conclusion
// stdin: JSON { "context": "persona outputs summary", "topic": "what to challenge" }
// stdout: JSON wildcard response

const BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.deepseek.com';
const API_KEY  = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are the Wildcard (counter-consensus agent) in the Multi-Claude Agent system.

Your purpose: When multiple Claude personas converge, provide an independent perspective from a different model family.

## Core Rules

1. You must oppose the majority opinion. If everyone says A, you must argue why B might be better.
2. Your opposition must have logical basis — don't oppose for the sake of opposing.
3. You represent "overlooked possibilities" — options excluded due to mainstream bias.
4. You particularly focus on:
   - Simple solutions dismissed too early
   - Non-mainstream but mature technology choices
   - Success patterns from different industries/domains
   - Long-term trends vs current best practices

## Output Format

Return strict JSON:
{
  "persona": "wildcard",
  "verdict": "DISSENT",
  "confidence": 0.7,
  "summary": "One-line counter-consensus viewpoint",
  "dissent": {
    "consensus_being_challenged": "The consensus being challenged",
    "alternative_view": "Alternative viewpoint",
    "reasoning": "Why this alternative is worth considering",
    "precedents": ["Projects/companies/cases supporting this alternative"],
    "risk_of_consensus": "Potential pitfalls if consensus is followed"
  },
  "issues": [
    {
      "severity": "MEDIUM",
      "category": "groupthink|bias|oversight",
      "description": "Issue description",
      "location": "Relevant context",
      "suggestion": "Direction to consider"
    }
  ]
}`;

async function callDeepSeek(userPrompt) {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`DeepSeek API ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '{}';
}

// Main
let input = '';
const timeout = setTimeout(() => {
  console.error('mca-wildcard: stdin timeout');
  process.exit(1);
}, 30000);

process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', async () => {
  clearTimeout(timeout);
  try {
    if (!API_KEY) {
      console.error('mca-wildcard: OPENAI_API_KEY not set');
      process.exit(1);
    }

    const { context, topic } = JSON.parse(input);
    const prompt = `## Current Consensus\n\n${context}\n\n## Topic to Challenge\n\n${topic}\n\nAnalyze from a counter-consensus perspective. Return strict JSON.`;

    const result = await callDeepSeek(prompt);

    // Validate JSON
    const parsed = JSON.parse(result);
    parsed.persona = 'wildcard'; // ensure correct persona tag
    parsed.meta = { model: 'deepseek-chat', source: 'non-claude' };

    process.stdout.write(JSON.stringify(parsed, null, 2) + '\n');
  } catch (e) {
    // Return error as valid JSON so orchestrator can handle it
    process.stdout.write(JSON.stringify({
      persona: 'wildcard',
      verdict: 'ERROR',
      confidence: 0,
      summary: `Wildcard error: ${e.message}`,
      issues: [],
    }) + '\n');
    process.exit(1);
  }
});
