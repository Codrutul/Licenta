const express = require('express');
const multer = require('multer');
const forecastService = require('../services/forecastService');
const dataProcessor = require('../utils/dataProcessor');

const router = express.Router();

// Configure multer for CSV file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * POST /api/forecast/upload
 * Upload and parse CSV file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parsedData = await dataProcessor.parseCSV(req.file.buffer);
    
    res.json({
      success: true,
      data: parsedData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to process CSV file'
    });
  }
});

/**
 * POST /api/forecast/calculate
 * Calculate forecast using selected model
 */
router.post('/calculate', async (req, res) => {
  try {
    const { data, model, periods, parameters } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    if (!model) {
      return res.status(400).json({ error: 'Model type is required' });
    }

    const forecastPeriods = parseInt(periods) || 6;

    let result;
    
    switch (model.toLowerCase()) {
      case 'moving_average':
        const window = parameters?.window || 3;
        result = forecastService.movingAverage(data, forecastPeriods, window);
        break;
      
      case 'exponential_smoothing':
        const alpha = parameters?.alpha || null;
        result = forecastService.exponentialSmoothing(data, forecastPeriods, alpha);
        break;
      
      case 'holts_linear_trend':
        const alphaHolt = parameters?.alpha || 0.2;
        const beta = parameters?.beta || 0.1;
        result = forecastService.holtsLinearTrend(data, forecastPeriods, alphaHolt, beta);
        break;
      
      case 'arima':
        const arimaParams = parameters || { p: 1, d: 1, q: 1 };
        result = forecastService.arima(data, forecastPeriods, arimaParams);
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid model type' });
    }

    // Calculate accuracy metrics if we have fitted values
    let accuracy = null;
    if (result.fittedValues && result.fittedValues.length > 0) {
      const actualSubset = data.slice(-result.fittedValues.length);
      accuracy = forecastService.calculateAccuracy(actualSubset, result.fittedValues);
    }

    // Calculate growth rate
    const lastActual = data[data.length - 1];
    const firstForecast = result.forecast[0];
    const growthRate = ((firstForecast - lastActual) / lastActual) * 100;

    // Calculate confidence intervals using RMSE
    let confidenceIntervals = null;
    if (accuracy && accuracy.rmse > 0) {
      confidenceIntervals = forecastService.confidenceIntervals(result.forecast, accuracy.rmse, 0.95);
    }

    res.json({
      success: true,
      result: {
        ...result,
        accuracy,
        confidenceIntervals,
        stats: {
          lastValue: lastActual,
          projectedValue: firstForecast,
          growthRate: growthRate.toFixed(2)
        }
      }
    });
  } catch (error) {
    console.error('Forecast calculation error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to calculate forecast'
    });
  }
});

/**
 * POST /api/forecast/decompose
 * Decompose time series into trend, seasonal, and residual components
 */
router.post('/decompose', async (req, res) => {
  try {
    const { data, period } = req.body;

    if (!data || !Array.isArray(data) || data.length < 8) {
      return res.status(400).json({ error: 'Need at least 8 data points for decomposition.' });
    }

    const result = forecastService.decompose(data, period || 0);

    res.json({ success: true, result });
  } catch (error) {
    console.error('Decomposition error:', error);
    res.status(500).json({ error: error.message || 'Failed to decompose time series' });
  }
});

/**
 * GET /api/forecast/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Forecast Engine API',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
