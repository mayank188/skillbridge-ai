const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/**
 * Resolve top 2 skill names from input (array of strings or array of { name } objects).
 * @param {Array<string|{ name: string }>} skills
 * @returns {[string, string]}
 */
function getTopTwoSkillNames(skills) {
  const list = Array.isArray(skills) ? skills : [];
  const names = list
    .slice(0, 2)
    .map((s) => (typeof s === 'string' ? s : s?.name))
    .filter(Boolean);
  const [first = 'Programming', second = 'Problem solving'] = names;
  return [first, second];
}

/**
 * Generate a real-world mini project brief via OpenAI.
 *
 * @param {Array<string|{ name: string }>} skills - Top 2 skills (e.g. ["JavaScript", "React"] or from User.skills)
 * @param {string} difficulty - "beginner" | "intermediate" | "advanced"
 * @returns {Promise<{
 *   title: string,
 *   description: string,
 *   requirements: string[],
 *   deliverables: string[],
 *   difficulty: string,
 *   skills: string[]
 * }>}
 */
async function generateProject(skills, difficulty = 'intermediate') {
  const level = String(difficulty ?? 'intermediate').toLowerCase().trim();
  const normalizedLevel = VALID_DIFFICULTIES.includes(level) ? level : 'intermediate';

  const [skill1, skill2] = getTopTwoSkillNames(skills);
  const skillLabel = skill1 === skill2 ? skill1 : `${skill1} and ${skill2}`;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const prompt = `Generate a real-world mini project for a developer skilled in ${skill1} and ${skill2}.

Difficulty level: ${normalizedLevel}

Return a valid JSON object only, with no other text. Use this exact structure:
{
  "title": "Project title (short, clear)",
  "description": "2-4 sentences describing the project and what the developer will build",
  "requirements": ["Requirement 1", "Requirement 2", "Requirement 3", "..."],
  "deliverables": ["Deliverable 1", "Deliverable 2", "..."]
}

- requirements: array of 4-6 specific technical or functional requirements
- deliverables: array of 3-5 concrete outcomes (e.g. "REST API with GET/POST endpoints", "README with setup instructions")
Match scope and complexity to ${normalizedLevel} level.`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_PROJECT_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You output only valid JSON objects. No markdown, no explanation.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('No content in OpenAI response for project generation.');

  const parsed = parseProjectResponse(content, skill1, skill2, normalizedLevel);
  return parsed;
}

/**
 * Parse and normalize OpenAI project JSON.
 */
function parseProjectResponse(content, skill1, skill2, difficulty) {
  let data;
  try {
    const raw = content.replace(/^```json\s*|\s*```$/g, '').trim();
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse project JSON: ${e.message}`);
  }

  const requirements = Array.isArray(data.requirements)
    ? data.requirements.map((r) => String(r).trim()).filter(Boolean)
    : [];
  const deliverables = Array.isArray(data.deliverables)
    ? data.deliverables.map((d) => String(d).trim()).filter(Boolean)
    : [];

  return {
    title: String(data.title ?? 'Mini Project').trim(),
    description: String(data.description ?? '').trim(),
    requirements,
    deliverables,
    difficulty,
    skills: [skill1, skill2].filter(Boolean),
  };
}

module.exports = {
  generateProject,
  getTopTwoSkillNames,
};
