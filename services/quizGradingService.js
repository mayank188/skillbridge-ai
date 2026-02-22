/**
 * Normalize answer for comparison (trim, lowercase).
 * @param {string} value
 * @returns {string}
 */
function normalizeAnswer(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * Check if user answer matches correct answer.
 * Compares normalized text; also accepts option index (0-3) if options array exists.
 */
function isCorrect(question, userAnswer) {
  const correct = normalizeAnswer(question.correctAnswer);
  if (!correct) return false;

  const raw = userAnswer;
  if (raw === null || raw === undefined) return false;

  const asText = normalizeAnswer(raw);
  if (asText === correct) return true;

  const options = question.options;
  if (Array.isArray(options) && options.length > 0) {
    const correctIndex = options.findIndex((o) => normalizeAnswer(o) === correct);
    if (correctIndex === -1) return false;
    const asNum = Number(raw);
    if (Number.isInteger(asNum) && asNum >= 0 && asNum < options.length && asNum === correctIndex) return true;
    if (normalizeAnswer(options[asNum]) === correct) return true;
  }

  return false;
}

/**
 * Grade MCQ attempt: compare user answers with correct answers, compute total and skill-wise scores.
 *
 * @param {Array<{ question: string, options: string[], correctAnswer: string, skill: string }>} questions - Same format as quiz generation output
 * @param {Array<string|number>} userAnswers - Answers in same order as questions. Each item: selected option text, or option index (0-3)
 * @returns {{
 *   totalQuestions: number,
 *   totalCorrect: number,
 *   totalScore: number,
 *   skillWise: Array<{ skill: string, correct: number, total: number, score: number }>,
 *   details: Array<{ question: string, skill: string, correct: boolean, userAnswer: string|number, correctAnswer: string }>
 * }}
 */
function gradeQuiz(questions, userAnswers) {
  const list = Array.isArray(questions) ? questions : [];
  const answers = Array.isArray(userAnswers) ? userAnswers : [];

  const details = [];
  const skillMap = new Map();

  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    const skill = (q.skill ?? 'General').trim() || 'General';
    const userAnswer = i < answers.length ? answers[i] : undefined;
    const correct = isCorrect(q, userAnswer);

    details.push({
      question: q.question ?? '',
      skill,
      correct,
      userAnswer: userAnswer !== undefined ? userAnswer : null,
      correctAnswer: q.correctAnswer ?? '',
    });

    const entry = skillMap.get(skill) ?? { correct: 0, total: 0 };
    entry.total += 1;
    if (correct) entry.correct += 1;
    skillMap.set(skill, entry);
  }

  const totalQuestions = list.length;
  const totalCorrect = details.filter((d) => d.correct).length;
  const totalScore = totalQuestions === 0 ? 0 : Math.round((totalCorrect / totalQuestions) * 100);

  const skillWise = Array.from(skillMap.entries()).map(([skill, { correct, total }]) => ({
    skill,
    correct,
    total,
    score: total === 0 ? 0 : Math.round((correct / total) * 100),
  }));

  return {
    totalQuestions,
    totalCorrect,
    totalScore,
    skillWise,
    details,
  };
}

module.exports = {
  gradeQuiz,
  isCorrect,
  normalizeAnswer,
};
