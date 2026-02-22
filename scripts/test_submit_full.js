/**
 * Test script: Simulate a full quiz submission to /quiz/submit
 */
const axios = require('axios');

async function testSubmit() {
  try {
    // Mock questions exactly like they come from /quiz/generate
    const questions = [
      {
        id: 0,
        question: 'What is JavaScript primarily used for?',
        options: [
          'Building interactive web applications',
          'Managing databases',
          'System administration',
          'Data analysis',
        ],
        correctAnswer: 'Building interactive web applications',
        skill: 'javascript',
        difficulty: 'intermediate',
      },
      {
        id: 1,
        question: 'What is React primarily used for?',
        options: [
          'Building user interfaces',
          'Server-side processing',
          'Database management',
          'Network configuration',
        ],
        correctAnswer: 'Building user interfaces',
        skill: 'react',
        difficulty: 'intermediate',
      },
    ];

    // Mock answers: index 0 for first question, index 0 for second (both correct)
    const answers = [0, 0];

    const payload = {
      questions,
      answers,
      duration: 45,
      difficulty: 'intermediate',
    };

    console.log('[test_submit_full] Preparing to POST /quiz/submit...');
    console.log('[test_submit_full] Payload structure:', {
      questionsIsArray: Array.isArray(payload.questions),
      questionsLength: payload.questions.length,
      answersIsArray: Array.isArray(payload.answers),
      answersLength: payload.answers.length,
    });

    // Attempt to submit (without auth token, just to test structure)
    const res = await axios.post('http://localhost:5000/api/quiz/submit', payload);
    console.log('[test_submit_full] SUCCESS! Response:', res.data);
  } catch (err) {
    console.error('[test_submit_full] ERROR!');
    console.error('Status:', err.response?.status);
    console.error('Message:', err.response?.data?.error || err.message);
    console.error('Details:', err.response?.data?.details);
  }
}

testSubmit();
