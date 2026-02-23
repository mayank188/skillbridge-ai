import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, AlertCircle, Video, Mic } from 'lucide-react';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

export default function Quiz() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [stage, setStage] = useState('start'); // start, generating, quiz, results
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [cameraAllowed, setCameraAllowed] = useState(null);
  const [micAllowed, setMicAllowed] = useState(null);

  // Request camera and microphone on component mount
  useEffect(() => {
    if (stage !== 'quiz') return;
    let mounted = true;

    async function startMediaDevices() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (mounted) {
          setCameraAllowed(true);
          setMicAllowed(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          if (audioRef.current) {
            audioRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('[Quiz] camera/mic access denied', err);
        if (mounted) {
          setCameraAllowed(false);
          setMicAllowed(false);
        }
      }
    }

    startMediaDevices();

    return () => {
      mounted = false;
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
  }, [stage]);

  // Timer effect - only runs when timeLeft > 0
  useEffect(() => {
    if (stage !== 'quiz' || timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, stage]);

  // Submit effect - auto-submit when time runs out
  useEffect(() => {
    if (stage === 'quiz' && timeLeft === 0 && questions.length > 0) {
      handleSubmitQuiz();
    }
  }, [timeLeft, stage, questions.length]);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/quiz/generate', {
        numQuestions: parseInt(numQuestions),
        difficulty,
      });
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(null));
      setTimeLeft(data.questions.length * 90); // 90 seconds per question
      setStage('quiz');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (index) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/quiz/submit', {
        questions,
        answers,
        duration: (numQuestions * 90) - timeLeft,
        difficulty,
      });
      setResults(data);
      setStage('results');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setLoading(false);
    }
  };

  if (stage === 'start') {
    return (
      <DashboardLayout role="candidate">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-lg p-8 border border-slate-700"
          >
            <h1 className="text-4xl font-bold mb-4">Take a Skill Assessment</h1>
            <p className="text-slate-300 mb-8">
              Test your knowledge with AI-generated questions tailored to your skills. Your answers help us match you with
              the perfect opportunities.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Number of Questions</label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
                <p className="text-xs text-slate-400 mt-1">Estimated time: {parseInt(numQuestions) * 1.5} minutes</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Difficulty Level</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleGenerateQuiz}
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating Quiz...' : 'Start Quiz'}
              </button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (stage === 'quiz' && questions.length > 0) {
    const question = questions[currentQuestion];
    const isAnswered = answers[currentQuestion] !== null;

    return (
      <DashboardLayout role="candidate">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Question {currentQuestion + 1} of {questions.length}
                </span>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className={timeLeft < 60 ? 'text-red-400' : 'text-slate-300'}>
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Question */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 rounded-lg p-8 border border-slate-700"
            >
              <p className="text-sm text-blue-400 mb-2">Skill: {question.skill || 'General'}</p>
              <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

              {/* Options */}
              <div className="space-y-3">
                {question.options?.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`w-full px-4 py-3 rounded-lg border-2 transition text-left ${
                      answers[currentQuestion] === idx
                        ? 'border-blue-500 bg-blue-500/10 text-white'
                        : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          answers[currentQuestion] === idx ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                        }`}
                      >
                        {answers[currentQuestion] === idx && <div className="w-3 h-3 bg-white rounded-full"></div>}
                      </div>
                      <span>{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Media Status */}
              <div className="mt-6 p-3 bg-slate-700/50 rounded-lg flex items-center gap-2">
                <Video className={`w-4 h-4 ${cameraAllowed ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-xs text-slate-300">{cameraAllowed ? 'Camera On' : 'Camera Unavailable'}</span>
                <Mic className={`w-4 h-4 ml-3 ${micAllowed ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-xs text-slate-300">{micAllowed ? 'Microphone On' : 'Microphone Unavailable'}</span>
              </div>
            </motion.div>

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 0}
                className="flex-1 px-4 py-3 border border-slate-600 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={handleNextQuestion}
                  className="flex-1 px-4 py-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmitQuiz}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Quiz'}
                </button>
              )}
            </div>

            {/* Question Indicator */}
            <div className="flex flex-wrap gap-2">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestion(idx)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition ${
                    idx === currentQuestion
                      ? 'bg-blue-600 text-white'
                      : answers[idx] !== null
                      ? 'bg-green-600/30 text-green-400 border border-green-500'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                >
                  {answers[idx] !== null ? '✓' : idx + 1}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (stage === 'results' && results) {
    return (
      <DashboardLayout role="candidate">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            {/* Score Card */}
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-lg p-12 border border-blue-500/20 text-center"
            >
              <h2 className="text-4xl font-bold mb-4">Quiz Complete!</h2>
              <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-4">
                {results.score}%
              </div>
              <p className="text-xl text-slate-300 mb-2">
                You got {results.correctAnswers} out of {results.totalQuestions} questions correct
              </p>
              <p className="text-slate-400">
                Time: {Math.floor(results.duration / 60)}m {results.duration % 60}s
              </p>
            </motion.div>

            {/* Skill Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-800 rounded-lg p-8 border border-slate-700"
            >
              <h3 className="text-2xl font-bold mb-6">Performance by Skill</h3>
              <div className="space-y-4">
                {results.skillBreakdown?.map((skill, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{skill.skill}</span>
                      <span className="text-sm text-slate-400">
                        {skill.correct}/{skill.total} ({skill.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          skill.percentage >= 80
                            ? 'bg-green-500'
                            : skill.percentage >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${skill.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate('/candidate')}
                className="flex-1 px-6 py-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition font-medium"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => {
                  setStage('start');
                  setCurrentQuestion(0);
                  setAnswers([]);
                  setResults(null);
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg hover:shadow-lg transition font-medium"
              >
                Take Another Quiz
              </button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="candidate">
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
      {/* Hidden camera and microphone */}
      <video id="quiz-video" ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <audio id="quiz-audio" ref={audioRef} style={{ display: 'none' }} />
    </DashboardLayout>
  );
}

