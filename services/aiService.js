const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract skills from resume text using AI
 */
async function extractSkillsFromResume(resumeText) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured on server');
    }
    // Try multiple times in case of transient AI errors
    let attempts = 0;
    let lastErr = null;
    while (attempts < 3) {
      attempts += 1;
      try {
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_SKILL_MODEL ?? 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert at parsing resumes and extracting technical skills.\nExtract technical skills and categorize them.
Return a JSON object with categories: frontend, backend, database, devops, tools. Each skill should include: name and confidence (0-100).`,
            },
            { role: 'user', content: `Resume:\n\n${resumeText}` },
          ],
          temperature: 0.2,
        });

        const content = response.choices?.[0]?.message?.content || '{}';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const skills = JSON.parse(jsonMatch[0]);
          return skills;
        }
        // If no JSON found, throw to retry
        throw new Error('No JSON detected in AI response');
      } catch (err) {
        lastErr = err;
        // small delay between attempts
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Fallback: simple heuristic extraction using common tech tokens
    console.error('AI skill extraction failed after retries:', lastErr?.message || lastErr);
    const fallback = {};
    const tokens = resumeText.replace(/[^\w\s]/g, ' ').split(/\s+/).map((t) => t.trim()).filter(Boolean);
    const unique = Array.from(new Set(tokens.map((t) => t.toLowerCase())));
    const known = [
      'javascript','react','node','python','java','c++','c#','php','ruby','go','rust','typescript','html','css','sql','mongodb','postgresql','mysql','aws','azure','gcp','docker','kubernetes','git','graphql','rest','tensorflow','pytorch'
    ];
    fallback.tools = unique.filter((u) => known.includes(u)).slice(0, 20).map((n) => ({ name: n, confidence: 60 }));
    return fallback;
  } catch (err) {
    console.error('AI skill extraction error:', err.message);
    throw new Error('Failed to extract skills from resume');
  }
}

/**
 * Generate dynamic quiz questions based on skills
 */
async function generateQuizQuestions(skills, _difficulty = 'intermediate', numQuestions = 10) {
  try {
    // If no skills provided, try to continue with a default popular-skills list
    const skillList = Array.isArray(skills) && skills.length > 0
      ? skills
      : ['javascript', 'python', 'html', 'css', 'git'];

    // Normalize skills to objects with name and confidence
    const normalized = skillList.map((s) => {
      if (typeof s === 'string') return { name: s, confidence: 0.8 };
      return { name: s.name || String(s), confidence: typeof s.confidence === 'number' ? s.confidence : 0.8 };
    });

    // If OpenAI not configured, use local fallback generator
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured — using local quiz fallback');
      return localGenerateQuestions(normalized, numQuestions);
    }

    const questions = [];

    // Determine per-skill question counts (round-robin distribution)
    const perSkillBase = Math.floor(numQuestions / normalized.length);
    let remainder = numQuestions % normalized.length;

    for (const skill of normalized) {
      // Determine difficulty per skill from confidence
      const conf = skill.confidence ?? 0.8;
      const difficulty = conf >= 0.75 ? 'advanced' : conf >= 0.5 ? 'intermediate' : 'beginner';

      let count = perSkillBase + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      if (count <= 0) count = 1; // ensure at least one

      try {
        const prompt = `Generate exactly ${count} multiple choice questions (MCQs) to assess knowledge of the skill: "${skill.name}" at ${difficulty} level.\n\nReturn a valid JSON array only. Each item must have:\n- question: string\n- options: array of exactly 4 strings\n- correctAnswer: the exact text of the correct option (must match one of the options)\n- skill: string (the skill name)`;

        const resp = await client.chat.completions.create({
          model: process.env.OPENAI_QUIZ_MODEL ?? 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You output only valid JSON arrays. No explanation.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.6,
        });

        const content = resp.choices[0]?.message?.content || '[]';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const chunk = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        // Normalize returned items and push
        for (const item of chunk) {
          questions.push({
            question: item.question || item.prompt || '',
            options: Array.isArray(item.options) ? item.options : [],
            correctAnswer: item.correctAnswer ?? item.options?.[0] ?? null,
            skill: item.skill || skill.name,
          });
          if (questions.length >= numQuestions) break;
        }
      } catch (err) {
        console.error('AI question generation error:', err?.message || err);
        // On AI failure for this skill, generate local fallback questions for this skill
        const fallback = localGenerateQuestions([skill], count);
        for (const q of fallback) {
          questions.push(q);
          if (questions.length >= numQuestions) break;
        }
      }

      if (questions.length >= numQuestions) break;
    }

    // If still no questions (unlikely), generate locally
    if (questions.length === 0) return localGenerateQuestions(normalized, numQuestions);

    return questions.slice(0, numQuestions);
  } catch (err) {
    console.error('Quiz generation final error:', err.message || err);
    // As a last resort, return local generated questions instead of failing
    return localGenerateQuestions(Array.isArray(skills) && skills.length ? skills : ['javascript','python'], numQuestions);
  }
}

/**
 * Local fallback question generator: simple template-based MCQs per skill
 */
function localGenerateQuestions(skillObjs, numQuestions = 10) {
  const templates = [
    (s) => ({
      question: `Which of the following is a primary use-case for ${s}?`,
      options: [`Building user interfaces with ${s}`, `Managing databases with ${s}`, `Designing network protocols with ${s}`, `Compiling ${s} code`],
      correctAnswer: `Building user interfaces with ${s}`,
    }),
    (s) => ({
      question: `Which tool/library is most commonly associated with ${s}?`,
      options: [`React`, `Express`, `Django`, `NumPy`],
      correctAnswer: `React`,
    }),
    (s) => ({
      question: `What does ${s} primarily run on?`,
      options: [`Browser`, `Database`, `Container`, `CI/CD`],
      correctAnswer: `Browser`,
    }),
    (s) => ({
      question: `Which statement about ${s} is correct?`,
      options: [`${s} is strongly typed`, `${s} is commonly used for web development`, `${s} is a database`, `${s} is an OS`],
      correctAnswer: `${s} is commonly used for web development`,
    }),
  ];

  const qs = [];
  const names = skillObjs.map((s) => (typeof s === 'string' ? s : s.name || String(s)));
  let i = 0;
  while (qs.length < numQuestions) {
    const skill = names[i % names.length];
    const tpl = templates[i % templates.length];
    const base = tpl(skill);
    // ensure 4 options
    const options = (base.options && base.options.length === 4) ? base.options : [base.correctAnswer, 'Option A', 'Option B', 'Option C'];
    qs.push({ question: base.question, options, correctAnswer: base.correctAnswer, skill });
    i += 1;
    if (i > 1000) break; // safety
  }
  return qs.slice(0, numQuestions);
}

/**
 * Generate a mini project based on skills and level
 */
async function generateProject(skills, difficulty = 'intermediate') {
  try {
    const skillNames = Array.isArray(skills)
      ? skills.map((s) => (s.name ? s.name : s)).join(', ')
      : skills.join(', ');

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert at designing technical projects for skill assessment.
          Generate a ${difficulty} level project specification. Return JSON with:
          title, description (2-3 sentences), requirements (array), deliverables (array), estimatedHours`,
        },
        {
          role: 'user',
          content: `Create a ${difficulty} level project for someone with these skills: ${skillNames}`,
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const project = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return project;
  } catch (err) {
    console.error('AI project generation error:', err.message);
    throw new Error('Failed to generate project');
  }
}

/**
 * Evaluate project submission using AI
 */
async function evaluateProject(projectDescription, githubLink, submittedCode) {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert code reviewer. Evaluate the submitted project.
          Return JSON with:
          codeQualityScore (0-100),
          architectureScore (0-100),
          completionScore (0-100),
          overallScore (0-100),
          feedback (string with constructive criticism)`,
        },
        {
          role: 'user',
          content: `Evaluate this project submission:
          Project: ${projectDescription}
          GitHub: ${githubLink}
          Code: ${submittedCode.substring(0, 2000)}...`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return evaluation;
  } catch (err) {
    console.error('AI evaluation error:', err.message);
    throw new Error('Failed to evaluate project');
  }
}

/**
 * Generate skill gap analysis
 */
async function generateSkillGapAnalysis(candidateSkills, requiredSkills) {
  try {
    const candidateSkillNames = Array.isArray(candidateSkills)
      ? candidateSkills.map((s) => (s.name ? s.name : s)).join(', ')
      : candidateSkills.join(', ');

    const requiredSkillNames = Array.isArray(requiredSkills)
      ? requiredSkills.map((s) => (s.name ? s.name : s)).join(', ')
      : requiredSkills.join(', ');

    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a career development expert. Analyze skill gaps and provide improvement recommendations.
          Return JSON with:
          matchedSkills (array),
          missingSkills (array),
          improvementPath (array of learning resources),
          estimatedTimeToLearn (in months),
          nextSteps (array of action items)`,
        },
        {
          role: 'user',
          content: `Candidate skills: ${candidateSkillNames}
          Required skills: ${requiredSkillNames}
          
          Provide gap analysis and improvement path.`,
        },
      ],
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return analysis;
  } catch (err) {
    console.error('AI gap analysis error:', err.message);
    throw new Error('Failed to generate skill gap analysis');
  }
}

module.exports = {
  extractSkillsFromResume,
  generateQuizQuestions,
  generateProject,
  evaluateProject,
  generateSkillGapAnalysis,
};
