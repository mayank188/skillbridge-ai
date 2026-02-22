/**
 * Client-side grading to match backend logic.
 * Normalize and compare; return summary for result view.
 */
function normalize(s) {
  return String(s ?? '').trim().toLowerCase();
}

function isCorrect(question, userAnswer) {
  const correct = normalize(question.correctAnswer);
  if (!correct) return false;
  if (userAnswer === null || userAnswer === undefined) return false;
  const asText = normalize(userAnswer);
  if (asText === correct) return true;
  const options = question.options;
  if (Array.isArray(options) && options.length > 0) {
    const correctIndex = options.findIndex((o) => normalize(o) === correct);
    if (correctIndex === -1) return false;
    const asNum = Number(userAnswer);
    if (Number.isInteger(asNum) && asNum >= 0 && asNum < options.length && asNum === correctIndex) return true;
  }
  return false;
}

export function gradeQuiz(questions, userAnswers) {
  const list = Array.isArray(questions) ? questions : [];
  const details = [];
  const skillMap = new Map();

  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    const skill = (q.skill ?? 'General').trim() || 'General';
    const userAnswer = i < userAnswers.length ? userAnswers[i] : undefined;
    const correct = isCorrect(q, userAnswer);
    details.push({
      question: q.question ?? '',
      skill,
      correct,
      userAnswer: userAnswer !== undefined ? userAnswer : null,
      correctAnswer: q.correctAnswer ?? '',
      options: q.options,
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

  return { totalQuestions, totalCorrect, totalScore, skillWise, details };
}
