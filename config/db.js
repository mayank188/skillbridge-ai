const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * Start an in-memory MongoDB instance for local development.
 */
async function startMemoryServer() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.warn('Using in-memory MongoDB for development:', uri);
  return { mongod, uri };
}

/**
 * Connect to MongoDB using Mongoose.
 * Uses process.env.MONGODB_URI (loaded by dotenv at top of server.js).
 */
async function connectDB() {
  let uri = process.env.MONGODB_URI;
  let memoryServer = null;

  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    console.error(
      'MONGODB_URI is not defined. Defaulting to in-memory MongoDB for local development.'
    );
    if (process.env.NODE_ENV !== 'production') {
      const memory = await startMemoryServer();
      uri = memory.uri;
      memoryServer = memory.mongod;
    } else {
      process.exit(1);
    }
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
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Falling back to in-memory MongoDB for local development.');
      if (!memoryServer) {
        const memory = await startMemoryServer();
        uri = memory.uri;
        memoryServer = memory.mongod;
      }
      await mongoose.connect(uri.trim(), options);
      console.log('Connected to in-memory MongoDB.');
    } else {
      process.exit(1);
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected.');
  });

  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB };
