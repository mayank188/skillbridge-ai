const { extractText } = require('../services/pdfService');
const aiService = require('../services/aiService');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Handle resume upload: accept PDF, extract text, return extracted text.
 * Use uploadResume middleware before this handler.
 */
async function uploadResumeHandler(req, res, next) {
  try {
    if (!req.file) {
      const err = new Error('No file uploaded. Send a PDF using field name "resume".');
      err.statusCode = 400;
      return next(err);
    }

    const { text, pages } = await extractText(req.file.buffer);

    // Extract skills using AI service (with retries and fallback)
    let skillsObj = {};
    try {
      skillsObj = await aiService.extractSkillsFromResume(text);
    } catch (e) {
      // keep skillsObj empty if extraction failed
      skillsObj = {};
    }

    // Flatten skills into array of { name, category, confidence }
    const skillsArray = flattenSkills(skillsObj);

    // If Authorization header present, try to update the user's skills (persist)
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ') && JWT_SECRET) {
        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.id) {
          // Store up to 50 skills
          const normalized = skillsArray.slice(0, 50).map((s) => ({
            name: String(s.name).substring(0, 100),
            category: String(s.category || 'tools').substring(0, 80),
            confidence: Math.min(100, Math.max(0, Number(s.confidence || 80))),
          }));
          await User.findByIdAndUpdate(decoded.id, { skills: normalized });
        }
      }
    } catch (e) {
      // ignore persistence errors
      console.error('Failed to persist skills:', e.message);
    }

    res.status(200).json({
      text,
      pages,
      filename: req.file.originalname ?? 'resume.pdf',
      skills: skillsArray,
    });
  } catch (err) {
    if (err.statusCode) return next(err);
    const e = new Error(err.message ?? 'Failed to extract text from PDF.');
    e.statusCode = 400;
    next(e);
  }
}

async function saveSkillsHandler(req, res, next) {
  try {
    const { skills } = req.body;
    if (!Array.isArray(skills)) {
      const err = new Error('Skills must be an array');
      err.statusCode = 400;
      return next(err);
    }

    // Normalize and constrain
    const normalized = skills.slice(0, 50).map((s) => {
      if (typeof s === 'string') return { name: String(s).substring(0, 100), category: 'tools', confidence: 80 };
      return {
        name: String(s.name || '').substring(0, 100),
        category: String(s.category || 'tools').substring(0, 80),
        confidence: Math.min(100, Math.max(0, Number(s.confidence || 80))),
      };
    });

    await User.findByIdAndUpdate(req.user._id, { skills: normalized });

    res.json({ message: 'Skills saved', skills: normalized });
  } catch (err) {
    next(err);
  }
}

function flattenSkills(skillsObj) {
  const result = [];
  if (!skillsObj) return result;

  if (Array.isArray(skillsObj)) {
    skillsObj.forEach((skill) => {
      if (!skill) return;
      if (typeof skill === 'string') {
        result.push({ name: skill, category: 'tools', confidence: 80 });
      } else if (skill.name) {
        result.push({ name: skill.name, category: skill.category || 'tools', confidence: Number(skill.confidence ?? 80) });
      }
    });
    return result;
  }

  if (typeof skillsObj === 'object') {
    Object.entries(skillsObj).forEach(([category, list]) => {
      if (Array.isArray(list)) {
        list.forEach((item) => {
          if (!item) return;
          if (typeof item === 'string') {
            result.push({ name: item, category, confidence: 80 });
          } else if (item.name) {
            result.push({ name: item.name, category, confidence: Number(item.confidence ?? 80) });
          }
        });
      } else if (typeof list === 'string') {
        result.push({ name: list, category, confidence: 80 });
      }
    });
  }

  return result;
}

module.exports = { uploadResumeHandler, saveSkillsHandler };

