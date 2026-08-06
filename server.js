require("dotenv").config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const authRoutes = require('./routes/auth');
const candidateRoutes = require('./routes/candidate');
const quizRoutes = require('./routes/quiz');
const projectRoutes = require('./routes/project');
const jobRoutes = require('./routes/jobs');
const adminRoutes = require('./routes/admin');
const resumeRoutes = require('./routes/resume');

const app = express();
const PORT = process.env.PORT ?? 5000;

// --- Security Middleware ---
app.use(helmet());
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.',
});
app.use(generalLimiter);

// --- Core Middleware ---
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5175', 'http://localhost:5174', 'http://localhost:5173'];

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- Routes ---
app.use('/api', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database unavailable. Please check the MongoDB connection and restart the backend.',
    });
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/project', projectRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/resume', resumeRoutes);

app.get('/health', (req, res) => {
  const dbState = req.app.locals.dbConnected ? 'connected' : 'disconnected';
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: dbState,
  });
});

// 404 handler (must be after all valid routes)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  const status = err.statusCode ?? err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', err);
  }
  res.status(status).json({
    error: message,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// --- Start server (async) ---
async function start() {
  try {
    const isConnected = await connectDB();
    app.locals.dbConnected = isConnected === true;

    const server = app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    server.on('error', (err) => {
      console.error('Server failed to start:', err.message || err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the existing process or set a different PORT.`);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}
app.get("/", (req, res) => {
  res.send("SkillBridge AI Backend Running 🚀");
});

start();
