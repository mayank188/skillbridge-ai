import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { gradeQuiz } from '../utils/gradeQuiz';
import api from '../lib/axios';

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

  const submittingRef = useRef(false); // synchronous guard to prevent race conditions
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState(() => questions.map(() => null));
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const proctorIntervalRef = useRef(null);
  const [cameraAllowed, setCameraAllowed] = useState(null); // null=pending, false=denied, true=granted
  const [micAllowed, setMicAllowed] = useState(null); // null=pending, false=denied, true=granted
  const sessionIdRef = useRef(`sess_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);

  useEffect(() => {
    if (submitted || questions.length === 0) return;
    const t = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(t);
  }, [startTime, submitted, questions.length]);

  // Proctoring: request camera and start periodic snapshots
  async function startProctoring() {
    // stop any previous interval/stream
    try {
      if (proctorIntervalRef.current) {
        clearInterval(proctorIntervalRef.current);
        proctorIntervalRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const prevTracks = videoRef.current.srcObject.getTracks();
        prevTracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    } catch (e) {
      console.warn('[Proctor] cleanup error', e);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraAllowed(true);
      setMicAllowed(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      if (audioRef.current) {
        audioRef.current.srcObject = stream;
      }

      // capture every 30s
      proctorIntervalRef.current = setInterval(async () => {
        try {
          const video = videoRef.current;
          if (!video) return;
          const w = 320;
          const h = Math.round((video.videoHeight / video.videoWidth) * w) || 240;
          const canvas = canvasRef.current;
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          // send snapshot (do not persist on server by agreement)
          await api.post('/quiz/proctor/snapshot', {
            sessionId: sessionIdRef.current,
            timestamp: Date.now(),
            image: dataUrl,
          });
        } catch (e) {
          console.error('[Proctor] snapshot error', e?.response?.data || e.message || e);
        }
      }, 30 * 1000);
    } catch (err) {
      console.warn('[Proctor] camera/mic access denied or error', err);
      setCameraAllowed(false);
      setMicAllowed(false);
      throw err;
    }
  }

  useEffect(() => {
    if (questions.length === 0 || submitted) return undefined;
    let mounted = true;
    // start proctoring on mount
    startProctoring().catch(() => {
      if (mounted) setCameraAllowed(false);
    });

    return () => {
      mounted = false;
      if (proctorIntervalRef.current) clearInterval(proctorIntervalRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
      if (audioRef.current && audioRef.current.srcObject) {
        const tracks = audioRef.current.srcObject.getTracks();
        tracks.forEach((t) => t.stop());
        audioRef.current.srcObject = null;
      }
    };
  }, [questions.length, submitted]);

  function setAnswer(index, value) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSubmit() {
    // Use synchronous ref to prevent race conditions from rapid clicks
    if (submittingRef.current || submitted) return;
    submittingRef.current = true;

    try {
      if (questions.length === 0) {
        console.warn('[Test.jsx] No questions to submit');
        return;
      }

      // ensure answers array length matches questions (fill unanswered with null)
      const safeAnswers = questions.map((_, i) => (i < answers.length ? answers[i] : null));

      const summary = gradeQuiz(questions, safeAnswers);
      setResult(summary);
      setSubmitted(true);

      // Submit to backend (fire-and-forget)
      (async () => {
        try {
          const duration = Math.floor(elapsed / 1000); // seconds
          const payload = {
            questions,
            answers: safeAnswers,
            duration,
            difficulty: questions[0]?.difficulty || 'intermediate',
          };
          console.log('[Test.jsx] Submitting quiz:', {
            questionsCount: questions.length,
            answersCount: safeAnswers.length,
            payload,
          });
          const res = await api.post('/quiz/submit', payload);
          console.log('[Test.jsx] Quiz submitted successfully:', res.data);
        } catch (error) {
          // log and show non-blocking feedback
          console.error('[Test.jsx] Failed to submit quiz to backend:', error.response?.data || error.message || error);
        }
      })();
    } catch (err) {
      submittingRef.current = false; // reset flag on error
      console.error('Error grading quiz locally:', err);
      // fallback: show basic alert so user knows submission didn't complete
      alert('Failed to submit the quiz. Please try again or contact support.');
    }
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

  // If camera access was explicitly denied, block the test and ask user to retry
  if (cameraAllowed === false || micAllowed === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Camera & Microphone Required</h1>
          <p className="text-gray-600 mb-4">This test requires camera and microphone access for proctoring. Please allow both to continue.</p>
          <div className="flex gap-3 justify-center">
            <button
              id="retry-camera-btn"
              type="button"
              onClick={async () => {
                try {
                  await startProctoring();
                  setCameraAllowed(true);
                  setMicAllowed(true);
                } catch (e) {
                  console.warn('Retry camera/mic failed', e);
                  setCameraAllowed(false);
                  setMicAllowed(false);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Retry
            </button>
            <Link to="/candidate" className="px-4 py-2 border rounded-lg text-gray-700">
              Exit test
            </Link>
          </div>
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

            {result.details?.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-800 mb-4">Detailed Results</h2>
                <div className="space-y-4">
                  {result.details.map((detail, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-800 flex-1">
                          Question {index + 1}: {detail.question}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          detail.correct
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {detail.correct ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Skill:</strong> {detail.skill}
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm">
                          <strong>Your Answer:</strong>{' '}
                          <span className={detail.correct ? 'text-green-600' : 'text-red-600'}>
                            {detail.userAnswer !== null && detail.userAnswer !== undefined
                              ? (Array.isArray(detail.options) && detail.options[detail.userAnswer] !== undefined
                                  ? detail.options[detail.userAnswer]
                                  : detail.userAnswer)
                              : 'Not answered'}
                          </span>
                        </div>

                        {!detail.correct && (
                          <div className="text-sm">
                            <strong>Correct Answer:</strong>{' '}
                            <span className="text-green-600 font-medium">
                              {detail.correctAnswer}
                            </span>
                          </div>
                        )}
                      </div>

                      {Array.isArray(detail.options) && detail.options.length > 0 && (
                        <div className="mt-3">
                          <strong className="text-sm text-gray-700">All Options:</strong>
                          <ul className="mt-1 space-y-1">
                            {detail.options.map((option, optIndex) => (
                              <li
                                key={optIndex}
                                className={`text-sm px-2 py-1 rounded ${
                                  option === detail.correctAnswer
                                    ? 'bg-green-50 text-green-800 border border-green-200'
                                    : option === (Array.isArray(detail.options) && detail.options[detail.userAnswer] !== undefined ? detail.options[detail.userAnswer] : detail.userAnswer) && !detail.correct
                                    ? 'bg-red-50 text-red-800 border border-red-200'
                                    : 'text-gray-600'
                                }`}
                              >
                                {optIndex + 1}. {option}
                                {option === detail.correctAnswer && (
                                  <span className="ml-2 text-green-600 font-medium">(Correct)</span>
                                )}
                                {option === (Array.isArray(detail.options) && detail.options[detail.userAnswer] !== undefined ? detail.options[detail.userAnswer] : detail.userAnswer) && !detail.correct && (
                                  <span className="ml-2 text-red-600 font-medium">(Your Answer)</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
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
                        Your answer: {d.userAnswer != null ? (Array.isArray(d.options) && typeof d.userAnswer === 'number' ? d.options[d.userAnswer] : String(d.userAnswer)) : '—'}
                        {!d.correct && ` · Correct: ${d.correctAnswer}`}
                      </p>
                </div>
              ))}
            </div>
          </details>
        </div>
        {/* hidden video & canvas used for periodic snapshots */}
        <video id="proctor-video" ref={videoRef} style={{ display: 'none' }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
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
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitted}
                className="ml-4 px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                Submit test
              </button>
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
              const isSelected = answers[currentIndex] === optionIndex;
              return (
                <button
                  key={optionIndex}
                  type="button"
                  onClick={() => setAnswer(currentIndex, optionIndex)}
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

          {/* Media Status */}
          <div className="mt-4 p-3 bg-gray-100 rounded-lg flex items-center gap-3 text-sm">
            <span className={`inline-flex items-center gap-1 ${cameraAllowed ? 'text-green-600' : 'text-red-600'}`}>
              📹 {cameraAllowed ? 'Camera On' : 'Camera Off'}
            </span>
            <span className={`inline-flex items-center gap-1 ${micAllowed ? 'text-green-600' : 'text-red-600'}`}>
              🎤 {micAllowed ? 'Microphone On' : 'Microphone Off'}
            </span>
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
                disabled={submitted}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
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
        {/* hidden video, audio & canvas used for periodic snapshots and audio capture */}
        <video id="proctor-video" ref={videoRef} style={{ display: 'none' }} playsInline muted />
        <audio id="proctor-audio" ref={audioRef} style={{ display: 'none' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    );
  }
