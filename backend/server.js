require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const forecastRoutes = require('./routes/forecast');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

console.log('Environment variables loaded:');
console.log('PORT:', PORT);
console.log('CORS_ORIGIN:', CORS_ORIGIN);

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/forecast', forecastRoutes);
app.use('/api/ai', aiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Time Series Forecast Visualizer API',
    version: '1.0.0',
    endpoints: {
      upload: 'POST /api/forecast/upload',
      calculate: 'POST /api/forecast/calculate',
      health: 'GET /api/forecast/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ 
      error: 'File upload error',
      details: err.message 
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server - bind to localhost to avoid permission issues
const server = app.listen(PORT, 'localhost', () => {
  console.log('═══════════════════════════════════════════════');
  console.log('  Time Series Forecast Visualizer API');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  CORS enabled for: ${CORS_ORIGIN}`);
  console.log(`  API Documentation: http://localhost:${PORT}/`);
  console.log('═══════════════════════════════════════════════');
  console.log('Server is listening and ready for requests...');
});

// Keep server alive
server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle process exit
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

// Don't export app when running directly
if (require.main === module) {
  console.log('Running as main module - server will stay alive');
}

