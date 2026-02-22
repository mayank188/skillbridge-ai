const ai = require('../services/aiService');

(async function(){
  try{
    const questions = await ai.generateQuizQuestions([{name:'javascript',confidence:0.8},{name:'react',confidence:0.7}], 'intermediate', 5);
    console.log('Generated', questions.length, 'questions');
    const answers = questions.map(q => q.correctAnswer); // simulate perfect answers

    // grading logic
    let correctCount = 0;
    const skillBreakdown = {};
    const responses = [];

    questions.forEach((question, idx) => {
      const isCorrect = question.correctAnswer === answers[idx];
      if (isCorrect) correctCount++;

      const skill = question.skill || 'general';
      if (!skillBreakdown[skill]) skillBreakdown[skill] = { total:0, correct:0 };
      skillBreakdown[skill].total++;
      if (isCorrect) skillBreakdown[skill].correct++;

      responses.push({ questionId: idx, question: question.question, skill, difficulty: question.difficulty, userAnswer: answers[idx], correctAnswer: question.correctAnswer, isCorrect });
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const skillBreakdownArray = Object.entries(skillBreakdown).map(([skill,data])=>({ skill, total:data.total, correct:data.correct, percentage: Math.round((data.correct/data.total)*100) }));

    console.log('Score:', score, 'Correct:', correctCount, '/', questions.length);
    console.log('Skill breakdown:', skillBreakdownArray);
  } catch(e){ console.error('ERR', e); }
})();