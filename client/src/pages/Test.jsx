import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { gradeQuiz } from '../utils/gradeQuiz';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Test() {
  const location = useLocation();
  const navigate = useNavigate();
  const questions = location.state?.questions ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => questions.map(() => null));
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (submitted || questions.length === 0) return;
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, [startTime, submitted, questions.length]);

  function setAnswer(index, value) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit() {
    const summary = gradeQuiz(questions, answers);
    setResult(summary);
    setSubmitted(true);
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">No questions</h1>
          <p className="text-gray-600 mb-4">Start a test from your dashboard to get questions.</p>
          <Link to="/candidate" className="text-blue-600 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const current = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const answered = answers[currentIndex] !== null && answers[currentIndex] !== undefined;

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Result summary</h1>
            <p className="text-sm text-gray-500 mb-6">Time: {formatTime(elapsed)}</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Correct</p>
                <p className="text-2xl font-semibold text-gray-800">
                  {result.totalCorrect} / {result.totalQuestions}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Score</p>
                <p className="text-2xl font-semibold text-gray-800">{result.totalScore}%</p>
              </div>
            </div>
            {result.skillWise?.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-700 mb-2">By skill</h2>
                <ul className="space-y-2">
                  {result.skillWise.map(({ skill, correct, total, score }) => (
                    <li
                      key={skill}
                      className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                    >
                      <span className="text-gray-800">{skill}</span>
                      <span className="text-gray-600 text-sm">
                        {correct}/{total} · {score}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Link
              to="/candidate"
              className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
            >
              Back to dashboard
            </Link>
          </div>
          <details className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <summary className="p-4 cursor-pointer font-medium text-gray-800">
              View answers
            </summary>
            <div className="border-t border-gray-200 p-4 space-y-4">
              {result.details?.map((d, i) => (
                <div key={i} className="text-sm">
                  <p className="font-medium text-gray-800 mb-1">
                    {i + 1}. {d.question}
                  </p>
                  <p className={d.correct ? 'text-green-600' : 'text-red-600'}>
                    Your answer: {d.userAnswer != null ? String(d.userAnswer) : '—'}
                    {!d.correct && ` · Correct: ${d.correctAnswer}`}
                  </p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/candidate" className="text-sm text-blue-600 hover:underline">
            Exit test
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 tabular-nums">
              {formatTime(elapsed)}
            </span>
            <span className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {current?.skill ?? 'General'}
          </p>
          <h2 className="text-lg font-medium text-gray-800 mb-6">
            {current?.question ?? ''}
          </h2>

          <div className="space-y-2">
            {(current?.options ?? []).map((option, optionIndex) => {
              const isSelected =
                answers[currentIndex] === option || answers[currentIndex] === optionIndex;
              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => setAnswer(currentIndex, option)}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 text-gray-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-800'
                  }`}
                >
                  <span className="font-medium text-gray-500 mr-2">
                    {String.fromCharCode(65 + optionIndex)}.
                  </span>
                  {option}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none"
            >
              Previous
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Submit test
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-lg text-sm font-medium ${
                i === currentIndex
                  ? 'bg-blue-600 text-white'
                  : answers[i] != null
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
