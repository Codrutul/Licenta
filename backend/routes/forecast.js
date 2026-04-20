const express = require('express');
const multer = require('multer');
const forecastService = require('../services/forecastService');
const dataProcessor = require('../utils/dataProcessor');
const changePointService = require('../services/changePointService');


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
 * @route POST /api/forecast/upload
 * @description Ingests a CSV file containing historical time series data. Expected CSV format: [date, value] columns.
 * @access Public
 * @param {Object} req.file - The uploaded CSV file buffer (multipart/form-data)
 * @returns {Object} JSON object containing the extracted `{ data, values, dates, statistics }`
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
 * @route POST /api/forecast/calculate
 * @description Calculates future projections using a specified forecasting model.
 * @access Public
 * @param {number[]} req.body.data - Historical dataset values array
 * @param {string} req.body.model - Name of the chosen model (e.g., 'exponential_smoothing', 'arima')
 * @param {number} req.body.periods - Number of time steps to project into the future
 * @param {Object} [req.body.parameters] - Custom hyperparameters for the selected mathematical model
 * @returns {Object} JSON object containing `{ method, forecast, fittedValues, parameters, accuracy }`
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

      case 'holts_winters':
        const hwAlpha = parameters?.alpha ?? 0.3;
        const hwBeta  = parameters?.beta  ?? 0.1;
        const hwGamma = parameters?.gamma ?? 0.2;
        const hwPeriod = parameters?.seasonPeriod ?? 0;
        result = forecastService.holtsWinters(data, forecastPeriods, hwAlpha, hwBeta, hwGamma, hwPeriod);
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
 * POST /api/forecast/changepoints
 * Detect change points using the PELT algorithm.
 * Body: { data: number[], dates: string[], penalty?: number }
 * penalty is a multiplier on BIC × σ² — if omitted, defaults to 1.0.
 * Lower values → more detected breakpoints.
 */
router.post('/changepoints', async (req, res) => {
  try {
    const { data, dates, penalty } = req.body;

    if (!data || !Array.isArray(data) || data.length < 8) {
      return res.status(400).json({ error: 'At least 8 data points required for change-point detection.' });
    }

    const safeDates = dates || data.map((_, i) => String(i));

    // penalty is treated as a multiplier: beta = penalty × log(n) × σ²
    // If penalty is provided, interpret it directly as the multiplier.
    // PELT handles null (= default multiplier of 1.0).
    const penaltyMultiplier = (penalty !== undefined && penalty !== null) ? penalty : null;

    // Run PELT — service computes beta internally as multiplier × log(n) × σ²
    const { changePoints, cost } = changePointService.pelt(data, penaltyMultiplier);

    // Per-segment statistics
    const segments = changePointService.segmentStats(data, safeDates, changePoints);

    res.json({
      success: true,
      result: {
        changePoints,
        segments,
        penalty: penaltyMultiplier ?? 1.0,
        cost,
        n: data.length,
      }
    });
  } catch (error) {
    console.error('Change-point detection error:', error);
    res.status(500).json({ error: error.message || 'Change-point detection failed' });
  }
});


/**
 * POST /api/forecast/segment-forecast
 * Fit the chosen model independently on each segment and forecast from the last segment.
 * Body: { data, dates, changePoints, model, periods, parameters? }
 */
router.post('/segment-forecast', async (req, res) => {
  try {
    const { data, dates, changePoints, model, periods, parameters } = req.body;

    if (!data || !Array.isArray(data) || data.length < 4) {
      return res.status(400).json({ error: 'Insufficient data for segment forecasting.' });
    }
    if (!model) {
      return res.status(400).json({ error: 'Model type is required.' });
    }

    const safeDates     = dates        || data.map((_, i) => String(i));
    const safeCPs       = changePoints || [];
    const forecastPeriods = parseInt(periods) || 6;

    const result = changePointService.segmentForecast(
      data, safeDates, safeCPs, model, forecastPeriods, parameters || {}
    );

    res.json({ success: true, result });
  } catch (error) {
    console.error('Segment forecast error:', error);
    res.status(500).json({ error: error.message || 'Segment forecasting failed' });
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
