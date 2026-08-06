/**
 * Simple request validation middleware.
 * Usage: validate({ body: { title: ['required', 'string'] } })
 */

function validate(rules = {}) {
  return (req, res, next) => {
    const errors = {};

    const check = (source) => {
      const sourceRules = rules[source];
      if (!sourceRules) return;
      for (const [field, validators] of Object.entries(sourceRules)) {
        const value = req[source]?.[field];
        validators.forEach((rule) => {
          if (rule === 'required' && (value === undefined || value === null || value === '')) {
            errors[field] = `${field} is required`;
          }
          if (rule === 'string' && value !== undefined && typeof value !== 'string') {
            errors[field] = `${field} must be a string`;
          }
          if (rule === 'number' && value !== undefined && value !== '' && Number.isNaN(Number(value))) {
            errors[field] = `${field} must be a number`;
          }
          if (rule === 'boolean' && value !== undefined && typeof value !== 'boolean') {
            errors[field] = `${field} must be a boolean`;
          }
          if (rule === 'email' && value !== undefined && !/^[\w.-]+@[\w.-]+\.\w+$/.test(String(value))) {
            errors[field] = `${field} must be a valid email`;
          }
          if (rule === 'array' && value !== undefined && !Array.isArray(value)) {
            errors[field] = `${field} must be an array`;
          }
          if (rule === 'objectId' && value !== undefined && !/^[0-9a-fA-F]{24}$/.test(String(value))) {
            errors[field] = `${field} must be a valid ObjectId`;
          }
        });
      }
    };

    check('body');
    check('params');
    check('query');

    if (Object.keys(errors).length > 0) {
      const err = new Error('Validation failed');
      err.statusCode = 400;
      err.details = errors;
      return next(err);
    }
    next();
  };
}

module.exports = { validate };
