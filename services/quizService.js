const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MCQ_PER_SKILL = 3;
const TOP_SKILLS_LIMIT = 5;

/**
 * Get top N skills by confidence (descending).
 * @param {Array<{ name: string, category?: string, confidence: number }>} skills
 * @param {number} limit
 * @returns {Array}
 */
function getTopSkills(skills, limit = TOP_SKILLS_LIMIT) {
  if (!Array.isArray(skills) || skills.length === 0) return [];
  return [...skills]
    .filter((s) => s && typeof s.confidence === 'number')
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
}

/**
 * Call OpenAI to generate 3 MCQs for a single skill.
 * @param {string} skillName
 * @param {number} count
 * @returns {Promise<Array<{ question: string, options: string[], correctAnswer: string, skill: string }>>}
 */
async function generateMCQsForSkill(skillName, count = MCQ_PER_SKILL) {
  const prompt = `Generate exactly ${count} multiple choice questions (MCQs) to assess knowledge of the skill: "${skillName}".

Return a valid JSON array only, no other text. Each item must have:
- question: string (clear question text)
- options: array of exactly 4 strings (A, B, C, D choices)
- correctAnswer: string (the exact text of the correct option, must match one of the options)
- skill: string ("${skillName}")

Example format:
[{"question":"...","options":["A...","B...","C...","D..."],"correctAnswer":"A...","skill":"${skillName}"}]`;

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_QUIZ_MODEL ?? 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You output only valid JSON arrays. No markdown, no explanation.' },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
  });

  const content = response.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error(`No content in OpenAI response for skill: ${skillName}`);

  const parsed = parseMCQResponse(content, skillName);
  return Array.isArray(parsed) ? parsed.slice(0, count) : [];
}

/**
 * Parse OpenAI response into MCQ array. Handles json_object wrapper if present.
 */
function parseMCQResponse(content, skillName) {
  let data;
  try {
    const raw = content.replace(/^```json\s*|\s*```$/g, '').trim();
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse MCQ JSON for skill ${skillName}: ${e.message}`);
  }

  let list = Array.isArray(data) ? data : (data.mcqs ?? data.questions ?? data);
  if (!Array.isArray(list) && data && typeof data === 'object') list = Object.values(data);
  if (!Array.isArray(list)) throw new Error(`Expected array of MCQs for skill ${skillName}`);

  return list.map((item) => ({
    question: String(item.question ?? '').trim() || 'Question',
    options: Array.isArray(item.options) ? item.options.map((o) => String(o).trim()) : [],
    correctAnswer: String(item.correctAnswer ?? '').trim(),
    skill: String(item.skill ?? skillName).trim(),
  })).filter((q) => q.question && q.options.length >= 2 && q.correctAnswer);
}

/**
 * Generate MCQs for top candidate skills via OpenAI.
 * @param {Array<{ name: string, category?: string, confidence: number }>} skills - Candidate skills array
 * @param {Object} options
 * @param {number} options.topSkills - Max number of top skills to use (default 5)
 * @param {number} options.mcqPerSkill - MCQs per skill (default 3)
 * @returns {Promise<Array<{ question: string, options: string[], correctAnswer: string, skill: string }>>}
 */
async function generateMCQsFromSkills(skills, options = {}) {
  const topN = Math.max(1, Math.min(10, options.topSkills ?? TOP_SKILLS_LIMIT));
  const perSkill = Math.max(1, Math.min(5, options.mcqPerSkill ?? MCQ_PER_SKILL));

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const topSkills = getTopSkills(skills, topN);
  if (topSkills.length === 0) {
    return [];
  }

  const results = [];
  for (const s of topSkills) {
    const name = s.name || s.skill || 'General';
    try {
      const mcqs = await generateMCQsForSkill(name, perSkill);
      results.push(...mcqs);
    } catch (err) {
      console.error(`Quiz generation failed for skill "${name}":`, err.message);
      // continue with other skills
    }
  }

  return results;
}

module.exports = {
  generateMCQsFromSkills,
  getTopSkills,
  generateMCQsForSkill,
};
