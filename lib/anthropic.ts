import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const SCORING_PROMPT = `You are an expert speech coach and evaluator. Analyze the following conversation where the user was practicing for {scenario_type}.

Score them 0-100 on these categories:
- Clarity: How clear, articulate, and easy to understand they were
- Confidence: How assured, decisive, and authoritative they sounded
- Structure: How well-organized their responses were (STAR method, logical flow, etc.)
- Engagement: Active listening, rapport-building, follow-up quality

Return ONLY valid JSON with no markdown, no explanation, no code blocks. Just the raw JSON object:
{
  "overall": <number>,
  "clarity": <number>,
  "confidence": <number>,
  "structure": <number>,
  "engagement": <number>,
  "strengths": ["<specific strength referencing what they said>", "<specific strength>"],
  "improvements": ["<specific improvement with example>", "<specific improvement>"],
  "summary": "<2-3 sentence honest but encouraging overall assessment referencing specific moments>"
}

Be honest and specific. Reference actual things the user said. If they did poorly, reflect that. If they did well, celebrate it.`
