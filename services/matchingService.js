const SKILL_WEIGHT = 0.4;
const TEST_WEIGHT = 0.35;
const PROJECT_WEIGHT = 0.25;

/**
 * Normalize skill name for comparison (trim, lowercase).
 * @param {string} s
 * @returns {string}
 */
function normalizeSkill(s) {
  return String(s ?? '').trim().toLowerCase();
}

/**
 * Get candidate skill names (from User model or array of strings).
 * @param {Array<string|{ name: string }>} candidateSkills
 * @returns {Set<string>}
 */
function getCandidateSkillSet(candidateSkills) {
  const list = Array.isArray(candidateSkills) ? candidateSkills : [];
  const names = list.map((s) =>
    typeof s === 'string' ? normalizeSkill(s) : normalizeSkill(s?.name)
  ).filter(Boolean);
  return new Set(names);
}

/**
 * Compute skill match: fraction of job required skills that the candidate has.
 * @param {Set<string>} candidateSet
 * @param {string[]} requiredSkills
 * @returns {number} 0..1, or 1 if no required skills
 */
function getSkillMatch(candidateSet, requiredSkills) {
  const required = Array.isArray(requiredSkills) ? requiredSkills : [];
  if (required.length === 0) return 1;
  const matched = required.filter((r) => candidateSet.has(normalizeSkill(r))).length;
  return matched / required.length;
}

/**
 * Compute match percentage between a candidate and a job.
 *
 * @param {Array<string|{ name: string }>} candidateSkills - Candidate's skills (names or User.skills)
 * @param {number} testScore - Candidate test score (0-100)
 * @param {number} projectScore - Candidate project score (0-100)
 * @param {string[]} requiredSkills - Job's required skills
 * @returns {number} Match percentage 0-100
 */
function getMatchPercentage(candidateSkills, testScore, projectScore, requiredSkills) {
  const candidateSet = getCandidateSkillSet(candidateSkills);
  const skillMatch = getSkillMatch(candidateSet, requiredSkills);

  const testNorm = Math.max(0, Math.min(100, Number(testScore) || 0)) / 100;
  const projectNorm = Math.max(0, Math.min(100, Number(projectScore) || 0)) / 100;

  const finalScore =
    SKILL_WEIGHT * skillMatch +
    TEST_WEIGHT * testNorm +
    PROJECT_WEIGHT * projectNorm;

  return Math.round(finalScore * 100);
}

module.exports = {
  getMatchPercentage,
  getSkillMatch,
  getCandidateSkillSet,
  normalizeSkill,
};
