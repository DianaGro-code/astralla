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

const INTENT_PROMPTS = {
  love:     'The person is specifically asking about love, romance, and relationships in this city. Weight the love and partnership themes heavily. Be especially direct about what Venus, the Moon, and the Descendant mean here.',
  career:   'The person is asking about career, ambition, and success in this city. Weight professional calling and public reputation themes heavily. Be especially direct about the Sun, Saturn, Jupiter, and the Midheaven.',
  escape:   'The person is looking for rest, reset, and escape. They want to know if this city is healing or draining. Weight the inner life, emotional safety, and vitality themes. Be honest if the city is too activating for rest.',
  creative: 'The person is asking about creative inspiration and artistic energy in this city. Weight Mercury, Venus, Neptune, and how the city affects self-expression and beauty.',
  change:   'The person wants transformation — real, deep change. Weight Pluto, Uranus, and Saturn. Be honest about what this city will cost them. Transformation is never comfortable.',
};

const WRITING_STYLE = `WRITING STYLE — follow every one of these:
- Lead with the consequence, not the planet. Not "Venus on the Descendant" — "You will fall in love here. Or at least think you have."
- Name the city like it has a personality. Give it agency. "Paris doesn't care what you came for. It will give you something else."
- Use contrast. "This city will make you rich. It will also make you lonely." Tension is memorable.
- Short sentences for impact. One sentence that lands hard, then explain. Never explain first.
- End every theme section with a question or a dare. "The question is whether you're ready to be that visible."
- Dry wit is welcome — a light touch, never goofy. Think sharp magazine astrology column.
- Name the actual planets and angles every time. Never write "celestial energy" or "the cosmos" — say "Venus DC" or "Saturn MC."
- Concrete over vague. Not "you may find opportunities" — "Jupiter is on your Midheaven. Someone in this city will hand you something."`;

export async function generateReading(chart, city, influences, parans, intent) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Birth data: born ${chart.birth_date} at ${chart.birth_time} in ${chart.birth_place}.
Target location: ${city.displayName} (${city.lat.toFixed(2)}°N, ${city.lng.toFixed(2)}°E)

ACTIVE PLANETARY LINES:
${formatInfluences(influences)}

PARANS AT THIS LATITUDE (${city.lat.toFixed(1)}°):
${formatParans(parans)}

PLANET KEY:
${Object.entries(PLANET_MEANINGS).map(([,v]) => `  ${v}`).join('\n')}

${intent && INTENT_PROMPTS[intent] ? `READER'S INTENT — important context:\n${INTENT_PROMPTS[intent]}\n\n` : ''}${WRITING_STYLE}

Return ONLY a valid JSON object — no markdown, no code fences, no text outside the JSON — with exactly these keys:

- "overview": 2–3 punchy sentences. The dominant planetary story of ${city.displayName.split(',')[0]} for this person. Lead with consequence. No generic openers.
- "overallRating": integer 1–5 reflecting how activated and favorable this location is (5 = highly charged and positive, 1 = minimal activation)
- "dreamOrComfort": "dream" if this city pushes, challenges, or costs something significant; "comfort" if it nourishes, heals, or feels like home; "both" if genuinely both; "neither" if mostly neutral
- "cost": 1–2 sentences. What does this city ask of the person? What's the price of its activation? Honest, not scary.
- "love", "career", "inner", "vitality", "growth": each 3–4 sentences on that domain. Lead with the sharpest observation. Name specific planets and angles. End with a question or dare.
- "loveRating", "careerRating", "innerRating", "vitalityRating", "growthRating": integer 1–5 for each domain

{"overview":"...","overallRating":3,"dreamOrComfort":"dream","cost":"...","love":"...","loveRating":4,"career":"...","careerRating":3,"inner":"...","innerRating":2,"vitality":"...","vitalityRating":5,"growth":"...","growthRating":3}

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

// ── Travel Transits ───────────────────────────────────────────────────────────

const ANGLE_MEANINGS_SHORT = {
  MC: 'Midheaven (career, public life)',
  IC: 'IC (home, inner life)',
  AC: 'Ascendant (identity, vitality)',
  DC: 'Descendant (relationships)',
};

function formatTransitLines(lines) {
  if (!lines.length) return 'No significant transiting lines through this city during the travel window.';
  return lines.map(l =>
    `  • Transiting ${l.planetLabel} ${l.angle} line — ${l.distance.toFixed(1)}° from city (peaks around ${l.peakDate}) — ${ANGLE_MEANINGS_SHORT[l.angle]}`
  ).join('\n');
}

function formatTransitAspects(aspects) {
  if (!aspects.length) return 'No major transit-to-natal aspects during this window.';
  return aspects.map(a =>
    `  • Transiting ${a.transitLabel} ${a.symbol} natal ${a.natalLabel} (orb ${a.exactOrb.toFixed(1)}°, peak ${a.peakDate})`
  ).join('\n');
}

export async function generateTransitReading(chart, city, startDate, endDate, transitData) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const tripDays = transitData.totalDays || 1;

  const prompt = `Birth data: born ${chart.birth_date} at ${chart.birth_time} in ${chart.birth_place}.
Travel window: ${startDate} → ${endDate} (${tripDays} days) in ${city.displayName}.

TRANSITING PLANETARY LINES THROUGH ${city.displayName.split(',')[0].toUpperCase()} DURING THIS TRIP:
${formatTransitLines(transitData.lines)}

TRANSIT-TO-NATAL ASPECTS ACTIVE DURING THIS WINDOW:
${formatTransitAspects(transitData.aspects)}

${WRITING_STYLE}

You are writing practical travel guidance — what this trip will actually feel like and what to do with it. Lead with lived experience, not planetary mechanics.

RULES FOR THIS READING:
- Never open with a planet name or aspect. Open with what the person will feel or experience.
- Highlights must be actionable. Tell the person what to DO, not what the planets are doing.
- "Book the meeting." "Stay in — you'll want to." "Say yes to the invitation." "Don't make the big decision yet."
- One dry, sharp observation per highlight. Treat it like advice from a very well-informed friend.
- Planetary names may appear briefly as supporting detail, never as the lead.

Return ONLY valid JSON with exactly these keys:

- "overview": 2 sentences max. What will this trip actually feel like? What's the dominant energy the person will notice? No planet names in this field.
- "tripEnergy": "high" | "medium" | "low" — overall activation level for this window
- "highlights": array of 2–4 objects, each with "title" (3–5 words, action-oriented) and "text" (2 sentences max: one observation + one concrete action or dare).
- "watchFor": 1 sentence. One honest practical heads-up — something to watch or avoid, phrased as lived advice not astrology.
- "timing": 1 sentence. When in the trip (early/mid/late days) is the peak energy — and what to do with it.

{"overview":"...","tripEnergy":"medium","highlights":[{"title":"...","text":"..."}],"watchFor":"...","timing":"..."}`;

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: 'You are a sharp astrocartographer who writes like a magazine columnist. Respond with ONLY valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw     = response.content[0].text.trim();
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

// ── Solar Return ──────────────────────────────────────────────────────────────

function formatSRInfluences(influences) {
  if (!influences.length) return 'No significant SR planet lines through this city.';
  return influences.map(i =>
    `  • SR ${i.planetLabel} ${i.angle} line — ${i.distance.toFixed(1)}° from city (${ANGLE_MEANINGS_SHORT[i.angle]})`
  ).join('\n');
}

function formatSRPlanets(planets) {
  return planets.map(p => `  ${p.label}: ${p.zodiac}`).join('\n');
}

function formatSRToNatal(aspects) {
  if (!aspects.length) return 'No tight SR-to-natal aspects.';
  return aspects.slice(0, 12).map(a =>
    `  • SR ${a.srLabel} ${a.symbol} natal ${a.natalLabel} (orb ${a.exactOrb.toFixed(1)}°)`
  ).join('\n');
}

function formatMonthlyData(months) {
  if (!months || !months.length) return 'No monthly transit data.';
  return months.map(m => {
    const asp = m.aspects.length
      ? m.aspects.map(a => `${a.transitLabel} ${a.symbol} SR ${a.srLabel} (${a.exactOrb.toFixed(1)}°)`).join(', ')
      : 'no tight aspects';
    return `  ${m.month}: ${asp}`;
  }).join('\n');
}

export async function generateSolarReturnReading(chart, city, srData) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const cityName = city.displayName.split(',')[0];

  const prompt = `Birth data: born ${chart.birth_date} at ${chart.birth_time} in ${chart.birth_place}.
Solar Return year: ${srData.targetYear}, celebrated in ${city.displayName}.
SR moment: ${srData.srLocalDate}

SR PLANETARY LINES THROUGH ${cityName.toUpperCase()}:
${formatSRInfluences(srData.srInfluences)}

SR-TO-NATAL ASPECTS:
${formatSRToNatal(srData.srToNatal)}

SR PLANET POSITIONS:
${formatSRPlanets(srData.srPlanets)}

MONTHLY TRANSIT ASPECTS (transiting planets to SR chart at mid-month):
${formatMonthlyData(srData.monthlyData)}

${WRITING_STYLE}

You are interpreting a Solar Return chart for ${srData.targetYear}.

CRITICAL FRAMING: Spending the birthday in ${cityName} sets the SR chart — it determines which planetary themes dominate the whole year. But the person will NOT necessarily stay in ${cityName}. The monthly themes describe how these energies move through their LIFE over the year — their inner world, moods, circumstances, decisions — regardless of where they physically are.

ABSOLUTE RULE FOR THE MONTHS ARRAY: Do NOT mention "${cityName}" anywhere — not in theme titles, not in text, not as atmosphere, not as context. Do not say "the ${cityName} energy", "what ${cityName} set in motion", "the themes from ${cityName}", or any variation. The city name must be completely absent from every single month object. Each monthly text should read as if describing a universal season of the person's inner life. The reader should not be able to tell which city was used.

Return ONLY valid JSON with exactly these keys:

- "yearTheme": One phrase (3–7 words). The title of this year. E.g. "The Year of the Reckoning."
- "overview": Exactly 2 punchy sentences. What does ${srData.targetYear} hold for this person? What is the dominant energy the birthday in ${cityName} sets in motion? Lead with consequence.
- "overallRating": integer 1–5
- "cost": Exactly 1 sentence. What does spending the birthday in ${cityName} demand or activate?
- "months": Array of exactly 12 objects in order, one per month. Each object has:
  - "month": the month string exactly as given (e.g. "April 2025")
  - "theme": 2–4 word theme title (e.g. "Push for Visibility", "Emotional Reckoning", "Money Moves")
  - "text": Exactly 2 sentences. Describe the energy the person will feel and what to do with it. No city references. Write as if describing a season of their inner life.

Return JSON now.`;

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: 'You are a sharp astrocartographer who writes like a magazine columnist. Respond with ONLY valid JSON — no markdown, no code fences.',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw     = response.content[0].text.trim();
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}

const INTENT_LABELS = {
  love:     'love & relationships',
  career:   'career & ambition',
  escape:   'rest & escape',
  creative: 'creativity & inspiration',
  change:   'transformation & reinvention',
};

export async function generateTopCitiesReading(chart, top3, intent) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const intentLabel = INTENT_LABELS[intent] || intent;

  const cityDescriptions = top3.map(({ city, influences }, i) => {
    const topLines = influences.slice(0, 5)
      .map(inf => `${inf.planetLabel} ${inf.angle} (${inf.strength}, ${inf.distance.toFixed(1)}°)`)
      .join(', ');
    return `City ${i + 1}: ${city.name}\nKey lines: ${topLines || 'minor influences only'}`;
  }).join('\n\n');

  const prompt = `Birth data: born ${chart.birth_date} at ${chart.birth_time} in ${chart.birth_place}.
The person is seeking: ${intentLabel}

These are their top 3 cities by planetary activation for that intent:

${cityDescriptions}

Write a short reading for each city. Follow every rule exactly:
- Lead with the consequence, not the planet. "You will fall in love here" not "Venus on the Descendant."
- Name the city like it has a personality. Give it agency. "Lisbon doesn't wait for you to be ready."
- Use contrast. What the city gives AND what it costs.
- Short sentences for impact. One sentence that lands hard, then explain.
- End the verdict with a question or a dare.
- Be honest. Some of these cities will be difficult. Say so.

Return ONLY valid JSON — no markdown, no fences — with this exact structure:
{
  "cities": [
    {
      "name": "City name, Country",
      "hook": "One consequence-first sentence that makes you need to go. Max 20 words.",
      "why": "2–3 sentences on WHY this city activates this intent for them. Name planets/angles. Include the tradeoff.",
      "cost": "One honest sentence on what this city asks of them.",
      "verdict": "One sentence. A dare or a question. Make it land."
    }
  ]
}`;

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: 'You are a sharp astrocartographer who writes like a magazine columnist. Respond with ONLY valid JSON — no markdown, no code fences.',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed = JSON.parse(cleaned);

  return parsed.cities.map((c, i) => ({
    ...c,
    cityName: top3[i].city.name,
    lat: top3[i].city.lat,
    lng: top3[i].city.lng,
    score: top3[i].score,
  }));
}

// ── Weekly Reading ─────────────────────────────────────────────────────────────

export async function generateWeeklyReading(chart, city, weekStart, weekEnd, transitData) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Birth data: born ${chart.birth_date} at ${chart.birth_time} in ${chart.birth_place}.
Current location: ${city.displayName}
This week: ${weekStart} → ${weekEnd}

TRANSITING PLANETARY LINES THROUGH ${city.displayName.split(',')[0].toUpperCase()} THIS WEEK:
${formatTransitLines(transitData.lines)}

TRANSIT-TO-NATAL ASPECTS ACTIVE THIS WEEK:
${formatTransitAspects(transitData.aspects)}

${WRITING_STYLE}

You are writing a WEEKLY horoscope — but one grounded in where this person actually is RIGHT NOW, not a generic sun-sign forecast. The transiting lines tell you which planetary energies are physically activated at their city this week. The transit-to-natal aspects tell you what's stirring internally.

Write this like a sharp, intimate weekly column — the kind someone saves and re-reads on Thursday. Make it feel personal and specific to their location.

Return ONLY valid JSON with exactly these keys:

- "headline": One punchy sentence (under 12 words) that captures the week's energy. No planet names — just the consequence.
- "overview": 2–3 sentences. What is the sky saying about THIS week for THIS person in THIS city? What's the dominant theme? Lead with consequence.
- "energy": "high" | "medium" | "low" — overall activation level this week
- "themes": array of 2–3 objects, each with "title" (short label, 2–4 words) and "text" (2–3 sentences). Cover the most significant influences for the week. Name specific planets and angles. End at least one with a question or a dare.
- "watchFor": 1–2 sentences. One honest heads-up — a friction point, blind spot, or thing this week will demand.
- "bestDays": 1 sentence. Name the specific days of the week (Monday, Tuesday, etc.) when the energy peaks or is most useful — e.g. "Tuesday and Wednesday carry the strongest momentum, with Friday softening for reflection."

{"headline":"...","overview":"...","energy":"medium","themes":[{"title":"...","text":"..."}],"watchFor":"...","bestDays":"..."}`;

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: 'You are a sharp astrocartographer who writes weekly columns like a magazine editor. Respond with ONLY valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const raw     = response.content[0].text.trim();
  const cleaned = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(cleaned);
}
