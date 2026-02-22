const User = require('../models/User');
const TestResult = require('../models/TestResult');
const aiService = require('../services/aiService');

/**
 * Generate quiz questions based on candidate skills
 */
async function generateQuiz(req, res, next) {
  try {
    const { numQuestions = 10, difficulty = 'intermediate', skills: requestSkills = [] } = req.body;
    console.log('generateQuiz requestSkills:', Array.isArray(requestSkills) ? requestSkills : typeof requestSkills);

    const candidate = await User.findById(req.user._id);
    if (!candidate) {
      const err = new Error('Candidate not found.');
      err.statusCode = 404;
      return next(err);
    }

    // Use skills from request if provided (from resume extraction), otherwise from database
    let skillsToUse = [];
    
    if (requestSkills && requestSkills.length > 0) {
      // Normalize skills: accept either strings or objects
      skillsToUse = requestSkills.map((skill) => {
        if (typeof skill === 'string') return { name: skill, confidence: 0.8 };
        if (skill && typeof skill === 'object' && skill.name) return { name: skill.name, confidence: skill.confidence ?? 0.8 };
        return { name: String(skill), confidence: 0.8 };
      });
    } else if (candidate.skills && candidate.skills.length > 0) {
      skillsToUse = candidate.skills.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)).slice(0, 5);
    } else {
      const err = new Error('Please upload resume and extract skills first.');
      err.statusCode = 400;
      return next(err);
    }

    // Validate skillsToUse
    if (!Array.isArray(skillsToUse) || skillsToUse.length === 0) {
      const err = new Error('No skills available to generate quiz. Please upload resume and extract skills.');
      err.statusCode = 400;
      return next(err);
    }

    let questions;
    try {
      questions = await aiService.generateQuizQuestions(skillsToUse, difficulty, parseInt(numQuestions));
    } catch (e) {
      console.error('Quiz generation error:', e.message || e);
      // Fallback: generate simple local MCQs so quizzes are available even when AI fails
      const localGen = (skillObjs, n) => {
        const names = skillObjs.map((s) => (typeof s === 'string' ? s : s.name || String(s)));
        const qs = [];
        let i = 0;
        while (qs.length < n) {
          const skill = names[i % names.length];
          qs.push({
            question: `What is ${skill} primarily used for?`,
            options: [`Web development with ${skill}`, `Database management`, `System programming`, `Mobile apps`],
            correctAnswer: `Web development with ${skill}`,
            skill,
          });
          i += 1;
        }
        return qs.slice(0, n);
      };

      questions = localGen(skillsToUse, parseInt(numQuestions));
    }

    res.json({
      questions: questions.map((q, idx) => ({
        id: idx,
        question: q.question,
        options: q.options,
        skill: q.skill,
        difficulty,
      })),
      count: questions.length,
      difficulty,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Submit quiz answers and get results
 */
async function submitQuiz(req, res, next) {
  try {
    const { questions, answers, duration, difficulty = 'intermediate' } = req.body;

    if (!Array.isArray(questions) || !Array.isArray(answers) || answers.length === questions.length) {
      const err = new Error('Invalid quiz submission.');
      err.statusCode = 400;
      return next(err);
    }

    // Calculate score
    let correctCount = 0;
    const skillBreakdown = {};
    const responses = [];

    questions.forEach((question, idx) => {
      const isCorrect = question.correctAnswer === answers[idx];
      if (isCorrect) correctCount++;

      const skill = question.skill || 'general';
      if (!skillBreakdown[skill]) {
        skillBreakdown[skill] = { total: 0, correct: 0 };
      }
      skillBreakdown[skill].total++;
      if (isCorrect) skillBreakdown[skill].correct++;

      responses.push({
        questionId: idx,
        question: question.question,
        skill,
        difficulty,
        userAnswer: answers[idx],
        correctAnswer: question.correctAnswer,
        isCorrect,
      });
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // Convert skill breakdown to array format
    const skillBreakdownArray = Object.entries(skillBreakdown).map(([skill, data]) => ({
      skill,
      total: data.total,
      correct: data.correct,
      percentage: Math.round((data.correct / data.total) * 100),
    }));

    // Save test result
    const testResult = await TestResult.create({
      candidateId: req.user._id,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      score,
      duration: parseInt(duration) || 0,
      skillBreakdown: skillBreakdownArray,
      responses,
      difficulty,
    });

    // Update user test score if higher
    const candidate = await User.findById(req.user._id);
    if (score > (candidate.testScore || 0)) {
      await User.findByIdAndUpdate(req.user._id, { testScore: score });
    }

    res.json({
      score,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      duration,
      skillBreakdown: skillBreakdownArray,
      testResultId: testResult._id,
      message: 'Quiz submitted successfully.',
    });
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

/**
 * Get test history
 */
async function getTestHistory(req, res, next) {
  try {
    const tests = await TestResult.find({ candidateId: req.user._id })
      .select('-responses')
      .sort({ createdAt: -1 });

    res.json(tests);
  } catch (err) {
    next(err);
  }
}

/**
 * Get single test result with details
 */
async function getTestResult(req, res, next) {
  try {
    const { testId } = req.params;

    const test = await TestResult.findOne({
      _id: testId,
      candidateId: req.user._id,
    });

    if (!test) {
      const err = new Error('Test result not found.');
      err.statusCode = 404;
      return next(err);
    }

    res.json(test);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateQuiz,
  submitQuiz,
  getTestHistory,
  getTestResult,
};
