const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify JWT and attach user to request.
 * Expects: Authorization: Bearer <token>
 * - 401: Missing token, invalid token, expired token, or user not found
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const err = new Error('Access denied. No token provided.');
      err.statusCode = 401;
      return next(err);
    }

    const token = authHeader.slice(7);
    if (!JWT_SECRET) {
      const err = new Error('Server configuration error.');
      err.statusCode = 500;
      return next(err);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      const msg = e.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.';
      const err = new Error(msg);
      err.statusCode = 401;
      return next(err);
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      const err = new Error('User no longer exists.');
      err.statusCode = 401;
      return next(err);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require the authenticated user to have a specific role.
 * Use after authenticate(). Returns 403 if role does not match.
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      const err = new Error('Authentication required.');
      err.statusCode = 401;
      return next(err);
    }
    if (!allowedRoles.includes(req.user.role)) {
      const err = new Error('You do not have permission to access this resource.');
      err.statusCode = 403;
      return next(err);
    }
    next();
  };
}

const requireCandidate = requireRole('candidate');
const requireRecruiter = requireRole('recruiter');
const requireAdmin = requireRole('admin');

module.exports = {
  authenticate,
  requireRole,
  requireCandidate,
  requireRecruiter,
  requireAdmin,
};
