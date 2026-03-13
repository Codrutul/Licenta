const stats = require('simple-statistics');

/**
 * Time Series Forecasting Service
 * Implements: Moving Average, Exponential Smoothing, Holt's Linear Trend, and AR(p,d)
 */

class ForecastService {
  
  /**
   * Moving Average Forecast
   * @param {Array<number>} data - Historical time series data
   * @param {number} periods - Number of periods to forecast
   * @param {number} window - Moving average window size (default: 3)
   * @returns {Object} Forecast results
   */
  movingAverage(data, periods, window = 3) {
    if (!data || data.length < window) {
      throw new Error(`Insufficient data. Need at least ${window} data points.`);
    }

    const forecast = [];
    const fittedValues = [];

    // Calculate fitted values for historical data
    for (let i = window - 1; i < data.length; i++) {
      const slice = data.slice(i - window + 1, i + 1);
      const average = stats.mean(slice);
      fittedValues.push(average);
    }

    // Forecast future periods
    let lastWindow = data.slice(-window);
    for (let i = 0; i < periods; i++) {
      const average = stats.mean(lastWindow);
      forecast.push(average);
      lastWindow = [...lastWindow.slice(1), average];
    }

    return {
      method: 'Moving Average',
      forecast,
      fittedValues,
      parameters: { window }
    };
  }

  /**
   * Simple Exponential Smoothing
   * @param {Array<number>} data - Historical time series data
   * @param {number} periods - Number of periods to forecast
   * @param {number} alpha - Smoothing parameter (0-1), default: auto-optimized
   * @returns {Object} Forecast results
   */
  exponentialSmoothing(data, periods, alpha = null) {
    if (!data || data.length < 2) {
      throw new Error('Insufficient data for exponential smoothing.');
    }

    // Auto-optimize alpha if not provided
    if (alpha === null) {
      alpha = this.optimizeAlpha(data);
    }

    const fittedValues = [];
    let level = data[0];

    // Calculate fitted values
    for (let i = 0; i < data.length; i++) {
      fittedValues.push(level);
      level = alpha * data[i] + (1 - alpha) * level;
    }

    // Forecast future periods (flat forecast for simple ES)
    const forecast = Array(periods).fill(level);

    return {
      method: 'Exponential Smoothing',
      forecast,
      fittedValues,
      parameters: { alpha: alpha.toFixed(3) }
    };
  }

  /**
   * Holt's Linear Trend Method (Double Exponential Smoothing)
   * @param {Array<number>} data - Historical time series data
   * @param {number} periods - Number of periods to forecast
   * @param {number} alpha - Level smoothing parameter (default: 0.2)
   * @param {number} beta - Trend smoothing parameter (default: 0.1)
   * @returns {Object} Forecast results
   */
  holtsLinearTrend(data, periods, alpha = 0.2, beta = 0.1) {
    if (!data || data.length < 3) {
      throw new Error('Insufficient data for Holt\'s Linear Trend.');
    }

    let level = data[0];
    let trend = data[1] - data[0];
    const fittedValues = [];

    // Calculate fitted values
    for (let i = 0; i < data.length; i++) {
      fittedValues.push(level + trend);
      
      if (i < data.length - 1) {
        const prevLevel = level;
        level = alpha * data[i] + (1 - alpha) * (level + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
      }
    }

    // Forecast future periods
    const forecast = [];
    for (let h = 1; h <= periods; h++) {
      forecast.push(level + h * trend);
    }

    return {
      method: 'Holt\'s Linear Trend',
      forecast,
      fittedValues,
      parameters: { alpha, beta }
    };
  }

  /**
   * AR(p,d) Model — Autoregressive with optional differencing
   * Note: The MA (q) component of AR(p,d) is not implemented; q is accepted for
   * API compatibility but has no effect. This model is AR(p) applied to the
   * d-th differenced series.
   * @param {Array<number>} data - Historical time series data
   * @param {number} periods - Number of periods to forecast
   * @param {Object} params - Parameters {p, d, q} (q is unused)
   * @returns {Object} Forecast results
   */
  arima(data, periods, params = { p: 2, d: 1, q: 1 }) {
    if (!data || data.length < 10) {
      throw new Error('Insufficient data for AR(p,d). Need at least 10 data points.');
    }

    try {
      const { p, d } = params;
      
      // Apply differencing
      let workingData = [...data];
      for (let i = 0; i < d; i++) {
        workingData = this.difference(workingData);
      }

      // Simple autoregressive forecast
      const forecast = [];
      const fittedValues = [];
      
      // Fit autoregressive model
      for (let i = p; i < workingData.length; i++) {
        const window = workingData.slice(i - p, i);
        const predicted = stats.mean(window);
        fittedValues.push(predicted);
      }

      // Generate forecast
      let forecastData = [...workingData];
      for (let i = 0; i < periods; i++) {
        const window = forecastData.slice(-p);
        const predicted = stats.mean(window);
        forecast.push(predicted);
        forecastData.push(predicted);
      }

      // Integrate back if differenced
      let finalForecast = forecast;
      if (d > 0) {
        const lastOriginal = data[data.length - 1];
        finalForecast = this.integrate(forecast, lastOriginal);
      }

      return {
        method: 'AR(p,d)',
        forecast: finalForecast,
        fittedValues,
        parameters: params
      };
    } catch (error) {
      // Fallback to Holt's method if AR(p,d) fails
      console.warn('AR(p,d) failed, falling back to Holt\'s method:', error.message);
      return this.holtsLinearTrend(data, periods);
    }
  }

  /**
   * Difference a time series
   * @param {Array<number>} data - Time series data
   * @returns {Array<number>} Differenced series
   */
  difference(data) {
    const differenced = [];
    for (let i = 1; i < data.length; i++) {
      differenced.push(data[i] - data[i - 1]);
    }
    return differenced;
  }

  /**
   * Integrate (reverse difference) a time series
   * @param {Array<number>} data - Differenced data
   * @param {number} lastValue - Last value from original series
   * @returns {Array<number>} Integrated series
   */
  integrate(data, lastValue) {
    const integrated = [];
    let current = lastValue;
    for (let i = 0; i < data.length; i++) {
      current = current + data[i];
      integrated.push(current);
    }
    return integrated;
  }

  /**
   * Optimize alpha parameter for exponential smoothing using MSE
   * @param {Array<number>} data - Historical data
   * @returns {number} Optimal alpha value
   */
  optimizeAlpha(data) {
    let bestAlpha = 0.3;
    let bestMSE = Infinity;

    for (let alpha = 0.1; alpha <= 0.9; alpha += 0.1) {
      let level = data[0];
      let mse = 0;

      for (let i = 1; i < data.length; i++) {
        const forecast = level;
        const error = data[i] - forecast;
        mse += error * error;
        level = alpha * data[i] + (1 - alpha) * level;
      }

      mse /= (data.length - 1);

      if (mse < bestMSE) {
        bestMSE = mse;
        bestAlpha = alpha;
      }
    }

    return bestAlpha;
  }

  /**
   * Calculate forecast accuracy metrics
   * @param {Array<number>} actual - Actual values
   * @param {Array<number>} fitted - Fitted/predicted values
   * @returns {Object} Accuracy metrics
   */
  calculateAccuracy(actual, fitted) {
    const n = Math.min(actual.length, fitted.length);
    let mse = 0;
    let mae = 0;
    let mape = 0;

    for (let i = 0; i < n; i++) {
      const error = actual[i] - fitted[i];
      mse += error * error;
      mae += Math.abs(error);
      if (actual[i] !== 0) {
        mape += Math.abs(error / actual[i]);
      }
    }

    return {
      mse: mse / n,
      rmse: Math.sqrt(mse / n),
      mae: mae / n,
      mape: (mape / n) * 100
    };
  }

  /**
   * Time Series Decomposition (Additive)
   * Extracts trend (centered MA), seasonal, and residual components
   * @param {Array<number>} data - Time series data
   * @param {number} period - Seasonal period (auto-detected if 0)
   * @returns {Object} Decomposed components
   */
  decompose(data, period = 0) {
    if (!data || data.length < 8) {
      throw new Error('Need at least 8 data points for decomposition.');
    }

    // Auto-detect period if not provided
    if (period === 0) {
      period = this.detectPeriod(data);
    }

    const n = data.length;
    const halfWindow = Math.floor(period / 2);

    // 1. Trend: centered moving average
    const trend = new Array(n).fill(null);
    for (let i = halfWindow; i < n - halfWindow; i++) {
      const window = data.slice(i - halfWindow, i + halfWindow + 1);
      trend[i] = stats.mean(window);
    }

    // 2. Detrended series (additive model)
    const detrended = data.map((v, i) =>
      trend[i] !== null ? v - trend[i] : null
    );

    // 3. Seasonal component: average for each position in cycle
    const seasonalAvg = new Array(period).fill(0);
    const seasonalCount = new Array(period).fill(0);
    detrended.forEach((v, i) => {
      if (v !== null) {
        seasonalAvg[i % period] += v;
        seasonalCount[i % period]++;
      }
    });
    const seasonalPattern = seasonalAvg.map((s, i) =>
      seasonalCount[i] > 0 ? s / seasonalCount[i] : 0
    );
    // Normalize so seasonal averages to 0
    const seasonalMean = stats.mean(seasonalPattern);
    const normalizedPattern = seasonalPattern.map(s => s - seasonalMean);

    const seasonal = data.map((_, i) => normalizedPattern[i % period]);

    // 4. Residual
    const residual = data.map((v, i) =>
      trend[i] !== null ? v - trend[i] - seasonal[i] : null
    );

    return {
      trend,
      seasonal,
      residual,
      period,
      original: data
    };
  }

  /**
   * Detect seasonal period using autocorrelation
   * @param {Array<number>} data
   * @returns {number} Detected period (default 4 or 7)
   */
  detectPeriod(data) {
    const n = data.length;
    const mean = stats.mean(data);
    const centered = data.map(v => v - mean);
    const variance = centered.reduce((s, v) => s + v * v, 0) / n;
    if (variance === 0) return 4;

    let bestLag = 4;
    let bestAC = -Infinity;
    const maxLag = Math.min(Math.floor(n / 2), 24);

    for (let lag = 2; lag <= maxLag; lag++) {
      let ac = 0;
      for (let i = 0; i < n - lag; i++) {
        ac += centered[i] * centered[i + lag];
      }
      ac = ac / (n * variance);
      if (ac > bestAC) {
        bestAC = ac;
        bestLag = lag;
      }
    }
    return bestLag;
  }

  /**
   * Calculate confidence intervals for a forecast
   * @param {Array<number>} forecast - Forecast values
   * @param {number} rmse - Root mean squared error from model accuracy
   * @param {number} confidence - Confidence level (default 0.95)
   * @returns {Object} upper and lower bound arrays
   */
  confidenceIntervals(forecast, rmse, confidence = 0.95) {
    // z-score for confidence level
    const zScores = { 0.80: 1.282, 0.90: 1.645, 0.95: 1.960, 0.99: 2.576 };
    const z = zScores[confidence] || 1.960;

    const upper = forecast.map((v, i) => {
      // Uncertainty grows with forecast horizon (sq root of steps)
      const margin = z * rmse * Math.sqrt(i + 1);
      return v + margin;
    });
    const lower = forecast.map((v, i) => {
      const margin = z * rmse * Math.sqrt(i + 1);
      return v - margin;
    });

    return { upper, lower, confidence };
  }
}

module.exports = new ForecastService();
