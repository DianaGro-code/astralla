import Anthropic from '@anthropic-ai/sdk';

const ANGLE_MEANINGS = {
  MC:  'Midheaven — career, public life, reputation, calling',
  IC:  'Imum Coeli — home, roots, inner life, ancestry',
  AC:  'Ascendant — identity, physical vitality, how others see you',
  DC:  'Descendant — relationships, partnerships, what you attract',
};

const PLANET_MEANINGS = {
  sun:     'the Sun (identity, vitality, purpose, the self)',
  moon:    'the Moon (emotions, instinct, home, nourishment)',
  mercury: 'Mercury (mind, communication, learning, movement)',
  venus:   'Venus (beauty, love, pleasure, aesthetics, abundance)',
  mars:    'Mars (drive, courage, conflict, sexuality, action)',
  jupiter: 'Jupiter (expansion, luck, wisdom, opportunity, growth)',
  saturn:  'Saturn (discipline, structure, mastery, limitation, karma)',
  uranus:  'Uranus (liberation, innovation, disruption, awakening)',
  neptune: 'Neptune (dreams, spirituality, dissolution, illusion, mysticism)',
  pluto:   'Pluto (transformation, power, death/rebirth, the underworld)',
};

function formatInfluences(influences) {
  if (!influences.length) return 'None detected within 15° of longitude.';

  const groups = { exact: [], strong: [], moderate: [], mild: [] };
  for (const inf of influences) groups[inf.strength]?.push(inf);

  const lines = [];
  if (groups.exact.length) {
    lines.push('EXACT (within 2°, most powerful):');
    groups.exact.forEach(i => lines.push(`  • ${i.planetLabel} ${i.angle} line — ${i.distance.toFixed(1)}° from city (${ANGLE_MEANINGS[i.angle]})`));
  }
  if (groups.strong.length) {
    lines.push('STRONG (2–5°):');
    groups.strong.forEach(i => lines.push(`  • ${i.planetLabel} ${i.angle} line — ${i.distance.toFixed(1)}°`));
  }
  if (groups.moderate.length) {
    lines.push('MODERATE (5–10°):');
    groups.moderate.forEach(i => lines.push(`  • ${i.planetLabel} ${i.angle} line — ${i.distance.toFixed(1)}°`));
  }
  if (groups.mild.length) {
    lines.push('MILD (10–15°):');
    groups.mild.forEach(i => lines.push(`  • ${i.planetLabel} ${i.angle} line — ${i.distance.toFixed(1)}°`));
  }
  return lines.join('\n');
}

function formatParans(parans) {
  if (!parans.length) return 'No parans within 2.5° of this latitude.';
  return parans.map(p =>
    `  • ${p.planetALabel} ${p.angleA} / ${p.planetBLabel} ${p.angleB} paran — ` +
    `at ${p.paranLatitude.toFixed(1)}°, city is at ${p.cityLatitude.toFixed(1)}° (diff: ${p.latDistance.toFixed(2)}°)`
  ).join('\n');
}

export async function generateReading(chart, city, influences, parans) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Birth data: born ${chart.birth_date} at ${chart.birth_time} in ${chart.birth_place}.
Target location: ${city.displayName} (${city.lat.toFixed(2)}°N, ${city.lng.toFixed(2)}°E)

ACTIVE PLANETARY LINES:
${formatInfluences(influences)}

PARANS AT THIS LATITUDE (${city.lat.toFixed(1)}°):
${formatParans(parans)}

PLANET KEY:
${Object.entries(PLANET_MEANINGS).map(([,v]) => `  ${v}`).join('\n')}

WRITING STYLE — this is critical:
- Punchy, direct sentences. No throat-clearing. Lead with the most interesting thing.
- Dry wit is welcome — a light touch of humor, never goofy. Think sharp magazine astrology column, not a horoscope generator.
- Name the actual planets and angles every time. Never write "celestial energy" or "the cosmos" or "your journey" — those are filler. Write "your Venus DC line" or "Saturn sitting on your Midheaven."
- Concrete over vague. Instead of "you may find love here," write "Venus is draped over your Descendant — you will be noticed, probably by someone unavailable."
- Short sentences hit hard. Mix them with longer ones for rhythm.
- Still serious and accurate — the humor comes from precision and confidence, not jokes.

Return ONLY a valid JSON object — no markdown, no code fences, no text outside the JSON — with exactly these keys:

- "overview": 2–3 punchy sentences. The dominant planetary story of ${city.displayName.split(',')[0]} for this person. No generic openers.
- "overallRating": integer 1–5 reflecting how activated and favorable this location is (5 = highly charged and positive, 1 = minimal activation)
- "love", "career", "inner", "vitality", "growth": each 3–4 sentences on that domain. Lead with the sharpest observation. Name specific planets and angles.
- "loveRating", "careerRating", "innerRating", "vitalityRating", "growthRating": integer 1–5 for each domain (5 = strongly activated, 1 = little influence)

{"overview":"...","overallRating":3,"love":"...","loveRating":4,"career":"...","careerRating":3,"inner":"...","innerRating":2,"vitality":"...","vitalityRating":5,"growth":"...","growthRating":3}

Theme meanings:
- love: romantic relationships, partnerships, attraction, intimacy
- career: career, professional calling, reputation, public life
- inner: emotional world, inner life, sense of home, roots, wellbeing
- vitality: physical vitality, identity, presence, how others experience you
- growth: personal growth, transformation, spiritual evolution, deeper purpose`;

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 3000,
    system: 'You are a sharp, witty astrocartographer who writes like a great magazine columnist — precise, confident, occasionally funny, never fluffy. You know your planets cold. Respond with ONLY valid JSON — no markdown, no code fences, no text outside the JSON object.',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}
