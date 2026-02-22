const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const aiService = require('../services/aiService');
const {
  generateQuiz,
  submitQuiz,
  getTestHistory,
  getTestResult,
} = require('../controllers/quizController');

const router = express.Router();

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
router.get('/history', getTestHistory);
router.get('/result/:testId', getTestResult);

module.exports = router;
