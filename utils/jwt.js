const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET ||
  (process.env.NODE_ENV !== 'production' ? 'dev_jwt_secret_please_set_env' : undefined);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn(
    'JWT_SECRET is not defined. Using a local development fallback secret. Add JWT_SECRET to .env for production.'
  );
}

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  return JWT_SECRET;
}

/**
 * Sign a JWT for the given user payload.
 * @param {Object} payload - { id, email, role } (or similar)
 * @returns {string} Signed JWT
 */
function generateToken(payload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

module.exports = { generateToken, getJwtSecret };
