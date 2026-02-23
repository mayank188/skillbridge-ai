const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const aiService = require('../services/aiService');
const {
  generateQuiz,
  submitQuiz,
  proctorSnapshot,
  getTestHistory,
  getTestResult,
} = require('../controllers/quizController');

const router = express.Router();

// Debug route: submit quiz without auth when running in non-production
if (process.env.NODE_ENV !== 'production') {
  router.post('/debug/submit', async (req, res, next) => {
    console.log('[quiz.debug.submit] Raw body keys:', Object.keys(req.body));
    console.log('[quiz.debug.submit] Body:', JSON.stringify(req.body).substring(0, 300));
    try {
      const { questions, answers } = req.body;
      console.log('[quiz.debug.submit] Validation:', {
        questionsIsArray: Array.isArray(questions),
        answersIsArray: Array.isArray(answers),
        questionsLen: Array.isArray(questions) ? questions.length : null,
        answersLen: Array.isArray(answers) ? answers.length : null,
      });
      if (!Array.isArray(questions) || !Array.isArray(answers)) {
        return res.status(400).json({
          error: 'Invalid payload',
          debug: {
            questionsIsArray: Array.isArray(questions),
            answersIsArray: Array.isArray(answers),
            questionsType: typeof questions,
            answersType: typeof answers,
          },
        });
      }
      return res.json({ debug: 'Payload structure OK', questionsLen: questions.length, answersLen: answers.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Debug proctor snapshot (no auth) for local testing
  router.post('/debug/proctor', async (req, res) => {
    try {
      const result = await (require('../controllers/quizController').proctorSnapshot)(req, res);
      // controller already sends response; just return
      return result;
    } catch (err) {
      return res.status(500).json({ error: err.message || 'debug proctor failed' });
    }
  });
}

// All routes require authentication and candidate role
router.use(authenticate);
router.use(requireRole('candidate'));

// Debug route: generate quiz without auth when running in non-production
if (process.env.NODE_ENV !== 'production') {
  router.post('/debug/generate', async (req, res) => {
    try {
      const { skills = [], numQuestions = 10, difficulty = 'intermediate' } = req.body;
      const questions = await aiService.generateQuizQuestions(skills, difficulty, parseInt(numQuestions, 10));
      return res.json({ questions, count: questions.length, difficulty });
    } catch (err) {
      console.error('Debug generate error:', err.message || err);
      return res.status(500).json({ error: 'Failed to generate debug quiz' });
    }
  });
}

// Quiz endpoints
router.post('/generate', generateQuiz);
router.post('/submit', submitQuiz);
router.post('/proctor/snapshot', proctorSnapshot);
router.get('/history', getTestHistory);
router.get('/result/:testId', getTestResult);

module.exports = router;
