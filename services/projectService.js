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

  if (!process.env.OPENAI_API_KEY) {
    return localGenerateProject([skill1, skill2].filter(Boolean), normalizedLevel);
  }

  try {
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

    return parseProjectResponse(content, skill1, skill2, normalizedLevel);
  } catch (err) {
    console.warn('Project generation with OpenAI failed, using local fallback:', err?.message || err);
    return localGenerateProject([skill1, skill2].filter(Boolean), normalizedLevel);
  }
}

/**
 * Local fallback project generation when OpenAI is unavailable.
 */
function localGenerateProject(skills, difficulty) {
  const skillLabel = skills.length > 1 ? `${skills[0]} and ${skills[1]}` : skills[0] || 'Software development';
  const title = `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${skillLabel} project`;

  const description = `Build a ${difficulty} project using ${skillLabel} that demonstrates key skills, practical implementation, and clear documentation.`;

  const requirementTemplate = {
    beginner: [
      `Create a simple ${skillLabel} app with a clean user interface`,
      `Implement at least one form or input flow`,
      `Use a local data store or JSON file for persistence`,
      `Write a short README with setup instructions`,
    ],
    intermediate: [
      `Build a ${skillLabel} application with multiple connected screens or routes`,
      `Implement reusable components or modules`,
      `Connect to a backend or simulated API for data exchange`,
      `Include validation, error handling, and user feedback`,
      `Document installation and usage in a README`,
    ],
    advanced: [
      `Design and implement a scalable ${skillLabel} solution`,
      `Use authentication or secure data handling where appropriate`,
      `Integrate a database or third-party service`,
      `Add automated testing or validation for key workflows`,
      `Provide deployment instructions and architecture notes`,
    ],
  };

  const deliverablesTemplate = {
    beginner: [
      `${title} source code`,
      'A working demo with basic UI',
      'README file with setup steps',
    ],
    intermediate: [
      `${title} source code`,
      'A functional app with multiple pages/features',
      'API or data integration layer',
      'README with architecture and usage',
    ],
    advanced: [
      `${title} source code`,
      'A scalable application architecture',
      'Testing or quality checks',
      'Deployment/readme documentation',
      'A short demo or presentation summary',
    ],
  };

  return {
    title: title.replace(/([a-z])/g, (m) => m.toUpperCase()),
    description,
    requirements: requirementTemplate[difficulty] || requirementTemplate.intermediate,
    deliverables: deliverablesTemplate[difficulty] || deliverablesTemplate.intermediate,
    difficulty,
    skills,
  };
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
