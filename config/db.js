const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose.
 * Uses process.env.MONGODB_URI (loaded by dotenv at top of server.js).
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    console.error(
      'MONGODB_URI is not defined. Add it to your .env file (e.g. MONGODB_URI=mongodb://localhost:27017/your-db).'
    );
    // In development allow server to run without a DB for local testing
    if (process.env.NODE_ENV === 'development') {
      console.warn('Running without MongoDB in development. Some features may be disabled.');
      return;
    }
    process.exit(1);
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  };

  try {
    await mongoose.connect(uri.trim(), options);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection failed:', err.message || err);
    // In production, fail fast so the process manager can restart the service.
    if (process.env.NODE_ENV === 'development') {
      console.warn('Continuing without a DB in development mode.');
      return;
    }
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });
}

module.exports = { connectDB };
