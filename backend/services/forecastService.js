const stats = require('simple-statistics');

/**
 * Time Series Forecasting Service
 * Implements: Moving Average, Exponential Smoothing, Holt's Linear Trend, and ARIMA
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
   * ARIMA Model (Simplified Autoregressive Implementation)
   * @param {Array<number>} data - Historical time series data
   * @param {number} periods - Number of periods to forecast
   * @param {Object} params - ARIMA parameters {p, d, q}
   * @returns {Object} Forecast results
   */
  arima(data, periods, params = { p: 2, d: 1, q: 1 }) {
    if (!data || data.length < 10) {
      throw new Error('Insufficient data for ARIMA. Need at least 10 data points.');
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
        method: 'ARIMA',
        forecast: finalForecast,
        fittedValues,
        parameters: params
      };
    } catch (error) {
      // Fallback to Holt's method if ARIMA fails
      console.warn('ARIMA failed, falling back to Holt\'s method:', error.message);
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
}

module.exports = new ForecastService();
