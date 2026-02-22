const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

const BCRYPT_ROUNDS = 12;

/**
 * Register a new user.
 * Hashes password, saves user, returns JWT.
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role, skills, testScore, projectScore } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      const err = new Error('Name, email, password, and role are required.');
      err.statusCode = 400;
      return next(err);
    }

    if (password.length < 6) {
      const err = new Error('Password must be at least 6 characters.');
      err.statusCode = 400;
      return next(err);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      ...(Array.isArray(skills) && { skills }),
      ...(typeof testScore === 'number' && { testScore }),
      ...(typeof projectScore === 'number' && { projectScore }),
    });

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: user.toJSON ? user.toJSON() : { ...user.toObject(), password: undefined },
    });
  } catch (err) {
    if (err.code === 11000) {
      const e = new Error('An account with this email already exists.');
      e.statusCode = 409;
      return next(e);
    }
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(' ');
      const e = new Error(message || 'Validation failed.');
      e.statusCode = 400;
      return next(e);
    }
    next(err);
  }
}

/**
 * Login user with email and password.
 * Compares password, returns JWT.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      const err = new Error('Email and password are required.');
      err.statusCode = 400;
      return next(err);
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+password');

    if (!user) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      return next(err);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      return next(err);
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const userJson = user.toJSON ? user.toJSON() : { ...user.toObject(), password: undefined };

    res.status(200).json({
      token,
      user: userJson,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
