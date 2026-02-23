const User = require('../models/User');
const TestResult = require('../models/TestResult');
const aiService = require('../services/aiService');

// Generate quiz questions based on provided skills (or candidate skills)
async function generateQuiz(req, res, next) {
  try {
    const { numQuestions = 10, difficulty = 'intermediate', skills: requestSkills = [], resumeText } = req.body;

    const candidate = await User.findById(req.user._id);
    if (!candidate) {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }

    // Determine skills to use: prefer requestSkills, fallback to candidate.skills
    let skillsToUse = [];
    if (Array.isArray(requestSkills) && requestSkills.length > 0) {
      skillsToUse = requestSkills.map((s) => (typeof s === 'string' ? { name: s } : s));
    } else if (Array.isArray(candidate.skills) && candidate.skills.length > 0) {
      skillsToUse = candidate.skills.slice(0, 6);
    } else {
      const err = new Error('No skills available to generate quiz. Please upload resume and extract skills.');
      err.statusCode = 400;
      return next(err);
    }

    let questions;
    try {
      questions = await aiService.generateQuizQuestions(skillsToUse, difficulty, parseInt(numQuestions, 10), resumeText);
    } catch (e) {
      console.error('AI quiz generation failed, using local fallback:', e && e.message ? e.message : e);
      // simple local fallback (guarantees options and correctAnswer)
      const localGen = (skillObjs, n) => {
        const pool = skillObjs.map((s) => (typeof s === 'string' ? s : s.name || String(s))).slice(0, 10);
        const qs = [];
        for (let i = 0; i < n; i++) {
          const skill = (pool[i % pool.length] || `skill${i}`).toLowerCase();
          const options = [
            `Primary use of ${skill}`,
            `Secondary use of ${skill}`,
            `Not related to ${skill}`,
            `General computing`,
          ];
          qs.push({ question: `What is ${skill} primarily used for?`, options, correctAnswer: options[0], skill });
        }
        return qs;
      };
      questions = localGen(skillsToUse, parseInt(numQuestions, 10));
    }

    // Return questions but do not expose anything sensitive
    res.json({
      questions: questions.map((q, idx) => ({ id: idx, question: q.question, options: q.options, correctAnswer: q.correctAnswer, skill: q.skill, difficulty })),
      count: questions.length,
      difficulty,
    });
  } catch (err) {
    next(err);
  }
}

// Submit quiz answers and grade. Accepts answers as either option indices (numbers) or answer strings.
async function submitQuiz(req, res, next) {
  try {
    console.log('[submitQuiz] Raw req.body keys:', Object.keys(req.body));
    
    const { questions, answers, duration = 0, difficulty = 'intermediate' } = req.body;

    console.log('[submitQuiz] Parsed values:', {
      questionsType: Array.isArray(questions) ? 'array' : typeof questions,
      answersType: Array.isArray(answers) ? 'array' : typeof answers,
      questionsLength: Array.isArray(questions) ? questions.length : null,
      answersLength: Array.isArray(answers) ? answers.length : null,
      hasQuestions: !!questions,
      hasAnswers: !!answers,
    });

    // Validate structure
    if (!Array.isArray(questions)) {
      const err = new Error('Invalid submission: questions must be an array');
      err.statusCode = 400;
      err.details = { questionsType: typeof questions, questionsValue: questions ? JSON.stringify(questions).substring(0, 100) : 'undefined' };
      return next(err);
    }

    if (!Array.isArray(answers)) {
      const err = new Error('Invalid submission: answers must be an array');
      err.statusCode = 400;
      err.details = { answersType: typeof answers, answersValue: answers ? JSON.stringify(answers).substring(0, 100) : 'undefined' };
      return next(err);
    }

    if (questions.length === 0) {
      const err = new Error('Invalid submission: questions array is empty');
      err.statusCode = 400;
      return next(err);
    }

    if (answers.length !== questions.length) {
      const err = new Error(`Invalid submission: answers length (${answers.length}) must match questions length (${questions.length})`);
      err.statusCode = 400;
      return next(err);
    }

    const normalize = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : v);

    let correctCount = 0;
    const skillMap = {};
    const responses = [];

    questions.forEach((q, idx) => {
      const userAns = answers[idx];
      let isCorrect = false;

      if (typeof userAns === 'number') {
        // index provided
        if (Array.isArray(q.options) && q.options[userAns] !== undefined) {
          isCorrect = normalize(q.options[userAns]) === normalize(q.correctAnswer);
        }
      } else {
        // string provided
        isCorrect = normalize(userAns) === normalize(q.correctAnswer) || (Array.isArray(q.options) && q.options.some((opt) => normalize(opt) === normalize(userAns)) && normalize(userAns) === normalize(q.correctAnswer));
      }

      if (isCorrect) correctCount += 1;

      const skill = q.skill || 'general';
      if (!skillMap[skill]) skillMap[skill] = { total: 0, correct: 0 };
      skillMap[skill].total += 1;
      if (isCorrect) skillMap[skill].correct += 1;

      responses.push({ questionId: q.id ?? idx, question: q.question, skill, difficulty, userAnswer: userAns, correctAnswer: q.correctAnswer, isCorrect });
    });

    const score = Math.round((correctCount / questions.length) * 100);

    const skillBreakdown = Object.entries(skillMap).map(([skill, data]) => ({ skill, total: data.total, correct: data.correct, percentage: Math.round((data.correct / data.total) * 100) }));

    // Persist test result
    const testResult = await TestResult.create({ candidateId: req.user._id, totalQuestions: questions.length, correctAnswers: correctCount, score, duration: parseInt(duration, 10) || 0, skillBreakdown, responses, difficulty });

    // Update user's best score
    const candidate = await User.findById(req.user._id);
    if (candidate && (score > (candidate.testScore || 0))) {
      await User.findByIdAndUpdate(req.user._id, { testScore: score });
    }

    res.json({ score, correctAnswers: correctCount, totalQuestions: questions.length, duration, skillBreakdown, testResultId: testResult._id, message: 'Quiz submitted successfully.' });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(' ');
      const e = new Error(msg || 'Validation failed.');
      e.statusCode = 400;
      return next(e);
    }
    next(err);
  }
}

// Receive proctoring snapshots from client. By design we do not persist images;
// this endpoint only accepts a base64 image and returns acknowledgement.
async function proctorSnapshot(req, res, next) {
  try {
    const { image, sessionId, timestamp } = req.body || {};
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Invalid snapshot payload' });
    }

    // Validate prefix (data URL) and reasonable size
    const allowedPrefixes = ['data:image/jpeg;base64,', 'data:image/png;base64,'];
    const prefix = allowedPrefixes.find((p) => image.startsWith(p));
    if (!prefix) {
      return res.status(400).json({ error: 'Unsupported image format' });
    }

    const sizeChars = image.length;
    const maxChars = 500 * 1024; // ~500 KB in chars
    if (sizeChars > maxChars) {
      return res.status(413).json({ error: 'Snapshot too large' });
    }

    // Minimal logging; do NOT persist the image per configuration.
    console.log('[proctorSnapshot] recv', {
      sessionId: sessionId || 'unknown',
      timestamp: timestamp || Date.now(),
      sizeChars,
    });

    // Optionally perform light processing here (face-detection checks, etc.)

    return res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

// Get test history for candidate
async function getTestHistory(req, res, next) {
  try {
    const tests = await TestResult.find({ candidateId: req.user._id }).select('-responses').sort({ createdAt: -1 });
    res.json(tests);
  } catch (err) {
    next(err);
  }
}

// Get specific test result by ID
async function getTestResult(req, res, next) {
  try {
    const { testId } = req.params;
    const testResult = await TestResult.findOne({ _id: testId, candidateId: req.user._id });
    if (!testResult) {
      const err = new Error('Test result not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.json(testResult);
  } catch (err) {
    next(err);
  }
}

module.exports = { generateQuiz, submitQuiz, proctorSnapshot, getTestHistory, getTestResult };
