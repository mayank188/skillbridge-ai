const ai = require('../services/aiService');

(async function(){
  try {
    const qs = await ai.generateQuizQuestions([{name:'javascript',confidence:0.8},{name:'react',confidence:0.7}], 'intermediate', 3);
    console.log('OK', qs.map(q=>({q:q.question, correct:q.correctAnswer, opts:q.options})) );
  } catch (e) {
    console.error('ERR', e.message || e);
  }
})();
