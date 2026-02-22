let client = null;
try {
  if (process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (e) {
  console.warn('OpenAI client not available:', e.message || e);
  client = null;
}

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
async function generateQuizQuestions(skills, _difficulty = 'intermediate', numQuestions = 10, resumeText = null) {
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

    // If OpenAI client not available, use local fallback generator
    if (!client) {
      console.warn('OpenAI client not configured — using local quiz fallback');
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
        const prompt = resumeText ?
          `Generate exactly ${count} multiple choice questions (MCQs) to assess knowledge of the skill: "${skill.name}" at ${difficulty} level.\n\nUse the following resume context to make questions more specific and relevant:\n${resumeText.substring(0, 500)}...\n\nReturn a valid JSON array only. Each item must have:\n- question: string\n- options: array of exactly 4 strings\n- correctAnswer: the exact text of the correct option (must match one of the options)\n- skill: string (the skill name)` :
          `Generate exactly ${count} multiple choice questions (MCQs) to assess knowledge of the skill: "${skill.name}" at ${difficulty} level.\n\nReturn a valid JSON array only. Each item must have:\n- question: string\n- options: array of exactly 4 strings\n- correctAnswer: the exact text of the correct option (must match one of the options)\n- skill: string (the skill name)`;

        if (!client) throw new Error('OpenAI client not configured');
        const response = await client.chat.completions.create({
          model: process.env.OPENAI_SKILL_MODEL ?? 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert at parsing resumes and extracting technical skills.\nExtract technical skills and categorize them.\nReturn a JSON object with categories: frontend, backend, database, devops, tools. Each skill should include: name and confidence (0-100).`,
            },
            { role: 'user', content: `Resume:\n\n${resumeText}` },
          ],
          temperature: 0.2,
        });
        // Normalize returned items and push
        for (const item of chunk) {
          const correctAnswer = item.correctAnswer || item.options?.[0] || 'Option A';
          questions.push({
            question: item.question || item.prompt || 'Sample question',
            options: Array.isArray(item.options) && item.options.length >= 4 ? item.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: correctAnswer,
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
    if (questions.length === 0) return localGenerateQuestions(normalized, numQuestions, resumeText);

    return questions.slice(0, numQuestions);
  } catch (err) {
    console.error('Quiz generation final error:', err.message || err);
    // As a last resort, return local generated questions instead of failing
    return localGenerateQuestions(Array.isArray(skills) && skills.length ? skills : ['javascript','python'], numQuestions, resumeText);
  }
}

/**
 * Local fallback question generator: simple template-based MCQs per skill
 */
function localGenerateQuestions(skillObjs, numQuestions = 10, resumeText = null) {
  // Create a deterministic RNG based on resumeText + skills so quizzes are repeatable
  function hashStringToSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const seedInput = (resumeText || '') + '|' + skillObjs.map(s => (typeof s === 'string' ? s : s.name || '')).join(',');
  const seed = hashStringToSeed(seedInput);
  const rng = mulberry32(seed);
  // Skill categories and their correct uses
  const skillCategories = {
    // Frontend
    'javascript': { category: 'frontend', correct: 'Building interactive web applications', options: ['Building interactive web applications', 'Managing databases', 'System administration', 'Data analysis'] },
    'react': { category: 'frontend', correct: 'Building user interfaces', options: ['Building user interfaces', 'Server-side processing', 'Database management', 'Network configuration'] },
    'vue': { category: 'frontend', correct: 'Building user interfaces', options: ['Building user interfaces', 'Server-side processing', 'Database management', 'Network configuration'] },
    'angular': { category: 'frontend', correct: 'Building web applications', options: ['Building web applications', 'Database design', 'System programming', 'DevOps automation'] },
    'html': { category: 'frontend', correct: 'Structuring web content', options: ['Structuring web content', 'Styling web pages', 'Programming logic', 'Database queries'] },
    'css': { category: 'frontend', correct: 'Styling web pages', options: ['Styling web pages', 'Programming logic', 'Database management', 'Server configuration'] },
    'typescript': { category: 'frontend', correct: 'Type-safe JavaScript development', options: ['Type-safe JavaScript development', 'Database administration', 'System monitoring', 'Network security'] },

    // Backend
    'nodejs': { category: 'backend', correct: 'Server-side JavaScript', options: ['Server-side JavaScript', 'Frontend development', 'Database design', 'Mobile development'] },
    'python': { category: 'backend', correct: 'Web development and data science', options: ['Web development and data science', 'Frontend styling', 'Database queries only', 'System hardware'] },
    'java': { category: 'backend', correct: 'Enterprise applications', options: ['Enterprise applications', 'Web styling', 'Database only', 'Frontend components'] },
    'csharp': { category: 'backend', correct: 'Windows applications', options: ['Windows applications', '.NET development', 'Web design', 'Database administration'] },
    'php': { category: 'backend', correct: 'Server-side web development', options: ['Server-side web development', 'Frontend styling', 'Database design only', 'Mobile apps'] },
    'ruby': { category: 'backend', correct: 'Web application development', options: ['Web application development', 'Frontend design', 'System programming', 'Data visualization'] },
    'go': { category: 'backend', correct: 'Systems programming', options: ['Systems programming', 'Web styling', 'Database queries', 'Frontend components'] },

    // Database
    'sql': { category: 'database', correct: 'Database querying', options: ['Database querying', 'Web development', 'System administration', 'Frontend styling'] },
    'mysql': { category: 'database', correct: 'Relational database management', options: ['Relational database management', 'Web development', 'System programming', 'Frontend design'] },
    'postgresql': { category: 'database', correct: 'Advanced relational database', options: ['Advanced relational database', 'Frontend development', 'System monitoring', 'Web styling'] },
    'mongodb': { category: 'database', correct: 'NoSQL document database', options: ['NoSQL document database', 'Relational databases', 'System programming', 'Web styling'] },
    'redis': { category: 'database', correct: 'In-memory data structure store', options: ['In-memory data structure store', 'Relational database', 'Web development', 'Frontend styling'] },

    // DevOps/Cloud
    'docker': { category: 'devops', correct: 'Containerization', options: ['Containerization', 'Web development', 'Database management', 'Frontend styling'] },
    'kubernetes': { category: 'devops', correct: 'Container orchestration', options: ['Container orchestration', 'Web development', 'Database queries', 'Frontend design'] },
    'aws': { category: 'devops', correct: 'Cloud computing services', options: ['Cloud computing services', 'Web development', 'Database management', 'Frontend styling'] },
    'azure': { category: 'devops', correct: 'Cloud computing platform', options: ['Cloud computing platform', 'Web development', 'System programming', 'Frontend design'] },
    'git': { category: 'devops', correct: 'Version control', options: ['Version control', 'Web development', 'Database management', 'Frontend styling'] },
    'jenkins': { category: 'devops', correct: 'Continuous integration', options: ['Continuous integration', 'Web development', 'Database queries', 'Frontend design'] },

    // Data Science/ML
    'tensorflow': { category: 'ml', correct: 'Machine learning framework', options: ['Machine learning framework', 'Web development', 'Database management', 'Frontend styling'] },
    'pytorch': { category: 'ml', correct: 'Deep learning framework', options: ['Deep learning framework', 'Web development', 'Database queries', 'Frontend design'] },
    'pandas': { category: 'ml', correct: 'Data manipulation library', options: ['Data manipulation library', 'Web development', 'System programming', 'Frontend styling'] },
    'numpy': { category: 'ml', correct: 'Scientific computing', options: ['Scientific computing', 'Web development', 'Database management', 'Frontend design'] },

    // Additional common skills
    'express': { category: 'backend', correct: 'Node.js web framework', options: ['Node.js web framework', 'Frontend development', 'Database management', 'System programming'] },
    'spring': { category: 'backend', correct: 'Java application framework', options: ['Java application framework', 'Frontend development', 'Database queries', 'Web styling'] },
    'django': { category: 'backend', correct: 'Python web framework', options: ['Python web framework', 'Frontend development', 'Database management', 'System programming'] },
    'flask': { category: 'backend', correct: 'Lightweight Python web framework', options: ['Lightweight Python web framework', 'Frontend development', 'Database management', 'System programming'] },
    'graphql': { category: 'backend', correct: 'Query language for APIs', options: ['Query language for APIs', 'Frontend styling', 'Database management', 'System programming'] },
    'rest': { category: 'backend', correct: 'API architectural style', options: ['API architectural style', 'Frontend development', 'Database queries', 'Web styling'] },
    'linux': { category: 'devops', correct: 'Operating system', options: ['Operating system', 'Web development', 'Database management', 'Frontend styling'] },
    'bash': { category: 'devops', correct: 'Shell scripting', options: ['Shell scripting', 'Web development', 'Database queries', 'Frontend design'] },
    'webpack': { category: 'frontend', correct: 'Module bundler', options: ['Module bundler', 'Web development', 'Database management', 'System programming'] },
    'sass': { category: 'frontend', correct: 'CSS preprocessor', options: ['CSS preprocessor', 'Web development', 'Database queries', 'System programming'] },
    'bootstrap': { category: 'frontend', correct: 'CSS framework', options: ['CSS framework', 'Web development', 'Database management', 'System programming'] },
    'tailwind': { category: 'frontend', correct: 'Utility-first CSS framework', options: ['Utility-first CSS framework', 'Web development', 'Database queries', 'System programming'] }
  };

  const templates = [
    (skill, skillData, confidence) => {
      const difficulty = confidence >= 0.8 ? 'advanced' : confidence >= 0.6 ? 'intermediate' : 'beginner';
      const questionTypes = {
        javascript: [
          "What is the primary purpose of JavaScript in web development?",
          "Which JavaScript feature allows asynchronous operations?",
          "What does 'this' keyword refer to in JavaScript?",
          "How do you declare a variable in modern JavaScript?"
        ],
        react: [
          "What is React primarily used for?",
          "What is JSX in React?",
          "How does React handle component state?",
          "What is the virtual DOM in React?"
        ],
        python: [
          "What is Python primarily known for?",
          "How do you define a function in Python?",
          "What is list comprehension in Python?",
          "How does Python handle memory management?"
        ],
        java: [
          "What is Java primarily used for?",
          "What is JVM in Java?",
          "How does Java handle object-oriented programming?",
          "What is the main method in Java?"
        ],
        sql: [
          "What is SQL primarily used for?",
          "What does SELECT statement do in SQL?",
          "How do you join tables in SQL?",
          "What is a primary key in SQL?"
        ],
        docker: [
          "What is Docker primarily used for?",
          "What is a Docker container?",
          "How does Docker differ from virtual machines?",
          "What is a Dockerfile?"
        ],
        git: [
          "What is Git primarily used for?",
          "What does 'git commit' do?",
          "How do you create a new branch in Git?",
          "What is the difference between git pull and git fetch?"
        ]
      };

      const questions = questionTypes[skill.toLowerCase()] || [`What is ${skill} primarily used for?`];
      const question = questions[Math.floor(rng() * questions.length)];

      const answerMap = {
        "What is the primary purpose of JavaScript in web development?": "Building interactive web applications",
        "Which JavaScript feature allows asynchronous operations?": "Promises and async/await",
        "What does 'this' keyword refer to in JavaScript?": "The current object context",
        "How do you declare a variable in modern JavaScript?": "Using const or let",
        "What is React primarily used for?": "Building user interfaces",
        "What is JSX in React?": "A syntax extension for JavaScript",
        "How does React handle component state?": "Using useState hook",
        "What is the virtual DOM in React?": "A lightweight copy of the actual DOM",
        "What is Python primarily known for?": "Simple syntax and versatility",
        "How do you define a function in Python?": "Using the def keyword",
        "What is list comprehension in Python?": "A concise way to create lists",
        "How does Python handle memory management?": "Automatic garbage collection",
        "What is Java primarily used for?": "Enterprise applications",
        "What is JVM in Java?": "Java Virtual Machine",
        "How does Java handle object-oriented programming?": "Through classes and objects",
        "What is the main method in Java?": "The entry point of a Java program",
        "What is SQL primarily used for?": "Database querying and management",
        "What does SELECT statement do in SQL?": "Retrieves data from tables",
        "How do you join tables in SQL?": "Using JOIN clauses",
        "What is a primary key in SQL?": "A unique identifier for table rows",
        "What is Docker primarily used for?": "Containerization of applications",
        "What is a Docker container?": "A lightweight, standalone executable package",
        "How does Docker differ from virtual machines?": "Containers share the host OS kernel",
        "What is a Dockerfile?": "A script to build Docker images",
        "What is Git primarily used for?": "Version control and collaboration",
        "What does 'git commit' do?": "Saves changes to the local repository",
        "How do you create a new branch in Git?": "Using git branch or git checkout -b",
        "What is the difference between git pull and git fetch?": "git pull fetches and merges, git fetch only fetches"
      };

      const correctAnswer = answerMap[question] || (skillData ? skillData.correct : `${skill} development`);

      // Build options so that correctAnswer is included. Prefer skillData.options when appropriate.
      let options = [];
      if (Array.isArray(skillData?.options) && skillData.options.length === 4) {
        options = skillData.options.slice(0, 4);
        if (!options.includes(correctAnswer)) {
          options[0] = correctAnswer; // ensure correctAnswer present
        }
      } else {
        // Build plausible distractors by sampling other skills' options
        const otherOptions = [];
        for (const k of Object.keys(skillCategories)) {
          if (k === skill.toLowerCase()) continue;
          const d = skillCategories[k]?.options;
          if (Array.isArray(d)) {
            for (const o of d) {
              if (o && o !== correctAnswer) otherOptions.push(o);
            }
          }
        }
        // unique and shuffle
        const uniq = Array.from(new Set(otherOptions));
        // pick up to 3 distractors using seeded rng
        const picked = [];
        while (picked.length < 3 && uniq.length > 0) {
          const idx = Math.floor(rng() * uniq.length);
          picked.push(uniq.splice(idx, 1)[0]);
        }
        // fallback to generic distractors if not enough
        const fallback = ['None of the above', 'Some other option', 'All of the above'];
        while (picked.length < 3) picked.push(fallback.shift());
        options = [correctAnswer, ...picked.slice(0, 3)];
      }

          // Shuffle options to avoid always having correct answer first (seeded)
          for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
          }

      return {
        question,
        options,
        correctAnswer,
        difficulty
      };
    },
    (skill, skillData, confidence) => {
      const difficulty = confidence >= 0.8 ? 'advanced' : confidence >= 0.6 ? 'intermediate' : 'beginner';
      return {
        question: `Which category does ${skill} belong to?`,
        options: skillData ? [skillData.category, 'frontend', 'backend', 'database'].filter((v, i, arr) => arr.indexOf(v) === i) : ['programming', 'database', 'design', 'system'],
        correctAnswer: skillData ? skillData.category : 'programming',
        difficulty
      };
    },
    (skill, skillData, confidence) => {
      const difficulty = confidence >= 0.8 ? 'advanced' : confidence >= 0.6 ? 'intermediate' : 'beginner';
      const level = difficulty === 'beginner' ? 'basic' : difficulty === 'intermediate' ? 'intermediate' : 'advanced';
      return {
        question: `At what level of expertise would you typically use ${skill}?`,
        options: [`${level} level`, 'Beginner level', 'Expert level', 'All levels'],
        correctAnswer: `${level} level`,
        difficulty
      };
    },
    (skill, skillData, confidence) => {
      const difficulty = confidence >= 0.8 ? 'advanced' : confidence >= 0.6 ? 'intermediate' : 'beginner';
      const statements = {
        javascript: [
          "JavaScript is primarily used for web development",
          "JavaScript can only run in browsers",
          "JavaScript is a compiled language",
          "JavaScript supports asynchronous programming"
        ],
        react: [
          "React is a JavaScript library for building user interfaces",
          "React can only be used for web development",
          "React uses a virtual DOM for performance",
          "React components must be class-based"
        ],
        python: [
          "Python is known for its simple syntax",
          "Python is primarily used for system programming",
          "Python supports multiple programming paradigms",
          "Python requires explicit type declarations"
        ],
        docker: [
          "Docker is used for containerization",
          "Docker containers are heavier than virtual machines",
          "Docker allows consistent deployment across environments",
          "Docker requires a specific operating system"
        ]
      };

      const skillStatements = statements[skill.toLowerCase()] || [
        `${skill} is a programming technology`,
        `${skill} is only for databases`,
        `${skill} is just for styling`,
        `${skill} is hardware only`
      ];

      const correctStatements = {
        javascript: "JavaScript is primarily used for web development",
        react: "React is a JavaScript library for building user interfaces",
        python: "Python is known for its simple syntax",
        docker: "Docker is used for containerization"
      };

      return {
        question: `Which statement about ${skill} is correct?`,
        options: skillStatements,
        correctAnswer: correctStatements[skill.toLowerCase()] || skillStatements[0],
        difficulty
      };
    },
    (skill, skillData, confidence) => {
      const difficulty = confidence >= 0.8 ? 'advanced' : confidence >= 0.6 ? 'intermediate' : 'beginner';
      const commonUses = {
        'javascript': ['DOM manipulation', 'Server-side development', 'Mobile app development', 'Game development'],
        'python': ['Data analysis', 'Web development', 'Machine learning', 'Automation scripts'],
        'java': ['Enterprise applications', 'Android development', 'Web services', 'Big data processing'],
        'react': ['User interfaces', 'Single-page applications', 'Mobile apps', 'Component libraries'],
        'sql': ['Data querying', 'Database management', 'Data analysis', 'Reporting'],
        'docker': ['Containerization', 'Microservices', 'DevOps', 'Application deployment'],
        'git': ['Version control', 'Collaboration', 'Code management', 'Branching strategies']
      };
      const uses = commonUses[skill.toLowerCase()] || [`${skill} development`, 'System administration', 'Data processing', 'Web development'];
      return {
        question: `Which of these is a common use case for ${skill}?`,
        options: uses,
        correctAnswer: uses[0],
        difficulty
      };
    }
  ];

  const qs = [];
  const names = skillObjs.map((s) => (typeof s === 'string' ? s : s.name || String(s))).map(s => s.toLowerCase());
  let i = 0;
  while (qs.length < numQuestions) {
    const skillName = names[i % names.length];
    const skillData = skillCategories[skillName];
    const skillObj = skillObjs.find(s => (typeof s === 'string' ? s : s.name || String(s)).toLowerCase() === skillName);
    const confidence = typeof skillObj === 'object' && skillObj.confidence ? skillObj.confidence : 0.8;
    const tpl = templates[i % templates.length];
    const base = tpl(skillName, skillData, confidence);

    // Ensure we have exactly 4 options
    let options = base.options;
    if (!options || options.length !== 4) {
      options = skillData ? skillData.options : [`${skillName} development`, 'Database management', 'System administration', 'Web design'];
    }

    qs.push({
      question: base.question || `What is ${skillName} used for?`,
      options: options.slice(0, 4), // Ensure exactly 4 options
      correctAnswer: base.correctAnswer || options[0] || `${skillName} development`,
      skill: skillName,
      difficulty: base.difficulty
    });
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
