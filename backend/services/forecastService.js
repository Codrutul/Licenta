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
   * Holt-Winters Triple Exponential Smoothing
   * Handles level + trend + seasonal components (additive model).
   * @param {Array<number>} data - Historical data (length >= 2 * seasonPeriod)
   * @param {number} periods - Number of periods to forecast
   * @param {number} alpha - Level smoothing (0–1), default 0.3
   * @param {number} beta  - Trend smoothing (0–1), default 0.1
   * @param {number} gamma - Seasonal smoothing (0–1), default 0.2
   * @param {number} seasonPeriod - Length of one seasonal cycle (e.g. 4 for quarterly, 12 for monthly)
   */
  holtsWinters(data, periods, alpha = 0.3, beta = 0.1, gamma = 0.2, seasonPeriod = 0) {
    if (!data || data.length < 4) {
      throw new Error('Insufficient data for Holt-Winters.');
    }

    // Auto-detect seasonal period if not provided
    const m = seasonPeriod > 0 ? seasonPeriod : this.detectPeriod(data);

    if (data.length < 2 * m) {
      // Fall back to Holt's if not enough data for seasonality
      return this.holtsLinearTrend(data, periods, alpha, beta);
    }

    // ── Initialisation (classical approach) ───────────────────────
    // Level: mean of first season
    let L = 0;
    for (let i = 0; i < m; i++) L += data[i];
    L /= m;

    // Trend: average slope across first two seasons
    let T = 0;
    for (let i = 0; i < m; i++) T += (data[m + i] - data[i]) / m;
    T /= m;

    // Seasonal indices: each position relative to its season average
    const S = new Array(m).fill(0);
    for (let i = 0; i < m; i++) {
      const seasonMean = data.slice(i, data.length, m)
        .filter((_, k) => (i + k * m) < data.length)
        .reduce((acc, v) => acc + v, 0);
      // We use a simpler approach: average over complete seasons only
      const numCompleteSeasons = Math.floor(data.length / m);
      let sum = 0;
      for (let s = 0; s < numCompleteSeasons; s++) sum += data[s * m + i];
      const overallMean = data.slice(0, numCompleteSeasons * m).reduce((a, b) => a + b, 0) / (numCompleteSeasons * m);
      S[i] = sum / numCompleteSeasons - overallMean;
    }

    // ── Update equations ──────────────────────────────────────────
    const fittedValues = [];
    for (let t = 0; t < data.length; t++) {
      const sIdx = ((t - m) % m + m) % m; // seasonal index (stays non-negative)
      const fitted = L + T + S[t % m];
      fittedValues.push(fitted);

      const prevL = L;
      L = alpha * (data[t] - S[t % m]) + (1 - alpha) * (L + T);
      T = beta * (L - prevL) + (1 - beta) * T;
      S[t % m] = gamma * (data[t] - L) + (1 - gamma) * S[t % m];
    }

    // ── Forecast ──────────────────────────────────────────────────
    const forecast = [];
    for (let h = 1; h <= periods; h++) {
      const sIdx = ((data.length - m + h - 1) % m + m) % m;
      forecast.push(L + h * T + S[sIdx]);
    }

    return {
      method: 'Holt-Winters',
      forecast,
      fittedValues,
      parameters: { alpha, beta, gamma, seasonPeriod: m }
    };
  }

  /**
   * ARIMA(p,d,q) — Autoregressive Integrated Moving Average
   * @param {Array<number>} data - Historical time series data
   * @param {number} periods - Number of periods to forecast
   * @param {Object} params - Parameters {p, d, q}
   * @returns {Object} Forecast results
   */
  arima(data, periods, params = { p: 2, d: 1, q: 1 }) {
    if (!data || data.length < 10) {
      throw new Error('Insufficient data for ARIMA. Need at least 10 data points.');
    }

    try {
      const p = Number(params.p) || 2;
      const d = Number(params.d) || 1;
      const q = Number(params.q) || 1;

      // ── Step 1: Difference the series d times ──────────────────
      let diffData = [...data];
      const diffHistory = []; // store each level for undifferencing
      for (let i = 0; i < d; i++) {
        diffHistory.push([...diffData]);
        diffData = this.difference(diffData);
      }

      const n = diffData.length;
      if (n < p + q + 2) {
        throw new Error('Not enough data after differencing for the chosen (p,d,q).');
      }

      // ── Step 2: Fit AR(p) coefficients via Yule-Walker OLS ─────
      // Build design matrix X (each row = p lagged values) and response y
      const numObs = n - p;
      const X = [];
      const y = [];
      for (let i = p; i < n; i++) {
        X.push(diffData.slice(i - p, i).reverse()); // [y_{t-1}, y_{t-2}, ..., y_{t-p}]
        y.push(diffData[i]);
      }

      // OLS: phi = (X'X)^{-1} X'y
      const arCoeffs = this._ols(X, y, p);

      // ── Step 3: Compute AR residuals and fit MA(q) ─────────────
      const arResiduals = [];
      for (let i = 0; i < numObs; i++) {
        const xRow = X[i];
        let predicted = 0;
        for (let j = 0; j < p; j++) predicted += arCoeffs[j] * xRow[j];
        arResiduals.push(y[i] - predicted);
      }

      // Build MA design matrix from lagged residuals
      const maStart = Math.max(p, q); // offset from start of diffData
      const XmaList = [];
      const ymaList = [];
      for (let i = q; i < arResiduals.length; i++) {
        XmaList.push(arResiduals.slice(i - q, i).reverse()); // [e_{t-1}, ..., e_{t-q}]
        ymaList.push(arResiduals[i]);
      }
      const maCoeffs = q > 0 && XmaList.length > q
        ? this._ols(XmaList, ymaList, q)
        : new Array(q).fill(0);

      // ── Step 4: Generate in-sample fitted values (differenced scale) ──
      const diffFitted = [];
      const fittedResiduals = [...arResiduals]; // reuse AR residuals for MA feed
      for (let i = 0; i < numObs; i++) {
        const xRow = X[i];
        let val = 0;
        for (let j = 0; j < p; j++) val += arCoeffs[j] * xRow[j];
        // add MA component using already-computed residuals
        for (let j = 0; j < q; j++) {
          const resIdx = i - 1 - j;
          if (resIdx >= 0) val += maCoeffs[j] * arResiduals[resIdx];
        }
        diffFitted.push(val);
      }

      // ── Step 5: Forecast on differenced scale ──────────────────
      const diffForecast = [];
      const forecastBuffer = [...diffData]; // grows as we forecast
      const residualBuffer = [...arResiduals]; // grows (out-of-sample residuals = 0)

      for (let h = 0; h < periods; h++) {
        let val = 0;
        // AR part
        for (let j = 0; j < p; j++) {
          val += arCoeffs[j] * forecastBuffer[forecastBuffer.length - 1 - j];
        }
        // MA part (out-of-sample residuals are 0 by convention)
        for (let j = 0; j < q; j++) {
          const resIdx = residualBuffer.length - 1 - j;
          if (resIdx >= 0) val += maCoeffs[j] * residualBuffer[resIdx];
        }
        diffForecast.push(val);
        forecastBuffer.push(val);
        residualBuffer.push(0); // out-of-sample innovation = 0
      }

      // ── Step 6: Invert differencing ────────────────────────────
      // Integrate forecast back to original scale
      let finalForecast = [...diffForecast];
      for (let i = d - 1; i >= 0; i--) {
        const lastVal = diffHistory[i][diffHistory[i].length - 1];
        finalForecast = this.integrate(finalForecast, lastVal);
      }

      // Reconstruct one-step-ahead fitted values on original scale.
      // We anchor each fitted point to the ACTUAL observed data rather than
      // chaining predictions together (which would compound errors over 100+ obs).
      //   d=0: fitted[p+i]   = diffFitted[i]
      //   d=1: fitted[p+1+i] = data[p+i]             + diffFitted[i]
      //   d=2: fitted[p+2+i] = 2*data[p+1+i] - data[p+i] + diffFitted[i]
      const fittedValues = new Array(data.length).fill(null);
      for (let i = 0; i < diffFitted.length; i++) {
        const origIdx = p + d + i;
        if (origIdx >= data.length) break;
        let reconValue = diffFitted[i];
        if (d === 1) {
          reconValue += data[origIdx - 1];
        } else if (d === 2) {
          reconValue += 2 * data[origIdx - 1] - data[origIdx - 2];
        }
        // d === 0: no undifferencing needed; d > 2: extremely rare, skip undiff
        fittedValues[origIdx] = reconValue;
      }

      return {
        method: 'ARIMA',
        forecast: finalForecast,
        fittedValues,
        parameters: { p, d, q }
      };

    } catch (error) {
      console.warn('ARIMA failed, falling back to Holt\'s method:', error.message);
      return this.holtsLinearTrend(data, periods);
    }
  }

  /**
   * Ordinary Least Squares solver: returns coefficients given design matrix X and response y.
   * Uses the normal equations directly (safe for small p, q ≤ 5).
   */
  _ols(X, y, numCoeffs) {
    // XtX: numCoeffs × numCoeffs,  Xty: numCoeffs × 1
    const XtX = Array.from({ length: numCoeffs }, () => new Array(numCoeffs).fill(0));
    const Xty = new Array(numCoeffs).fill(0);

    for (let i = 0; i < X.length; i++) {
      for (let j = 0; j < numCoeffs; j++) {
        Xty[j] += X[i][j] * y[i];
        for (let k = 0; k < numCoeffs; k++) {
          XtX[j][k] += X[i][j] * X[i][k];
        }
      }
    }

    // Add small ridge regularisation to prevent singular matrix
    for (let j = 0; j < numCoeffs; j++) XtX[j][j] += 1e-8;

    return this._solveLinear(XtX, Xty, numCoeffs);
  }

  /**
   * Solves a linear system Ax = b via Gaussian elimination with partial pivoting.
   */
  _solveLinear(A, b, n) {
    // Augmented matrix [A|b]
    const M = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      // Partial pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
      }
      [M[col], M[maxRow]] = [M[maxRow], M[col]];

      const pivot = M[col][col];
      if (Math.abs(pivot) < 1e-12) continue; // singular — skip

      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = M[row][col] / pivot;
        for (let k = col; k <= n; k++) {
          M[row][k] -= factor * M[col][k];
        }
      }
    }

    return M.map((row, i) => (Math.abs(M[i][i]) > 1e-12 ? row[n] / M[i][i] : 0));
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
