const forecastService = require('./forecastService');

/**
 * Change-Point Detection Service
 * Implements the PELT algorithm (Pruned Exact Linear Time)
 * Reference: Killick, Fearnhead & Eckley (2012) - "Optimal Detection of Changepoints
 * with a Linear Computational Cost", Journal of the American Statistical Association.
 *
 * PELT finds the globally optimal set of change points by minimising a
 * penalised cost function sum_i C(y[tau_{i-1}+1 : tau_i]) + K * beta
 * where C is the within-segment cost (sum of squared deviations from the segment
 * mean), beta is the BIC-derived penalty (log n per change point), and pruning
 * discards candidate split points that can never be optimal.
 */

class ChangePointService {

  /**
   * Within-segment cost: sum of squared deviations from the segment mean.
   * This is equivalent to the negative log-likelihood of a Gaussian model
   * with unknown mean, which is the standard cost used in PELT for mean-shift detection.
   *
   * @param {number[]} data  Full time series
   * @param {number} s       Start index (inclusive)
   * @param {number} e       End index (inclusive)
   * @returns {number} Cost C(y[s..e])
   */
  segmentCost(data, s, e) {
    if (e < s) return 0;
    const n = e - s + 1;
    let sum = 0;
    let sumSq = 0;
    for (let i = s; i <= e; i++) {
      sum += data[i];
      sumSq += data[i] * data[i];
    }
    const mean = sum / n;
    // sum of squared deviations = sumSq - n * mean^2
    return sumSq - n * mean * mean;
  }

  /**
   * PELT algorithm — O(n) amortised optimal change-point detection.
   *
   * Penalty scaling: the raw BIC penalty (log n) works well when σ² ≈ 1.
   * For real-world data we scale it by the global variance so the penalty
   * is expressed in the same units as the within-segment cost. This prevents
   * over-detection on smooth series (where the cost is near zero everywhere)
   * and under-detection on noisy ones.
   *
   * Minimum segment length: segments shorter than minLen points are rejected.
   * Without this, a perfect monotonic series would be split at every point.
   * Default is max(5, floor(n/10)) — at least 5 observations and at most
   * 10% of the data per segment prevents spurious micro-segments.
   *
   * @param {number[]} data      Time series values
   * @param {number}   penalty   Per-change-point penalty β (default: BIC × σ²)
   * @param {number}   minLen    Minimum segment length (default: max(5, n/10))
   * @returns {{ changePoints: number[], cost: number }}
   */
  pelt(data, penaltyMultiplier = null, minLen = null) {
    const n = data.length;

    // Robust noise variance estimation (using first differences)
    // Global variance incorporates the massive level shifts between segments, artificially
    // inflating the penalty and suppressing valid break detection. The variance of the first
    // differences is relatively unaffected by step changes.
    // Var(diff) = Var(noise_t - noise_{t-1}) = 2 * Var(noise). So Var(noise) ≈ diffSqSum / (2*(n-1))
    let diffSqSum = 0;
    for (let i = 1; i < n; i++) {
      const diff = data[i] - data[i - 1];
      diffSqSum += diff * diff;
    }
    const variance = diffSqSum / (2 * Math.max(n - 1, 1));
    const sigma2 = Math.max(variance, 1e-10);

    // Variance-scaled BIC penalty × user multiplier
    const multiplier = penaltyMultiplier !== null ? penaltyMultiplier : 1.0;
    const beta = multiplier * Math.log(n) * sigma2;

    // Minimum segment length: at least 5 points, at most n/10
    const minSegLen = minLen !== null ? minLen : Math.max(5, Math.floor(n / 10));

    // F[t] = minimum total cost for data[0..t]
    // cp[t] = optimal last change point before t
    const F = new Array(n + 1).fill(Infinity);
    const cp = new Array(n + 1).fill(-1);

    F[0] = -beta; // cost of empty prefix (absorbed by first segment)

    // Candidates: set of start positions still worth considering
    let candidates = [0];

    // Precompute prefix sums and prefix sums of squares for O(1) segment cost
    const prefixSum   = new Array(n + 1).fill(0);
    const prefixSumSq = new Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
      prefixSum[i + 1]   = prefixSum[i]   + data[i];
      prefixSumSq[i + 1] = prefixSumSq[i] + data[i] * data[i];
    }

    // O(1) segment cost using prefix sums
    const fastCost = (s, e) => {
      const count = e - s + 1;
      const sum   = prefixSum[e + 1]   - prefixSum[s];
      const sumSq = prefixSumSq[e + 1] - prefixSumSq[s];
      return sumSq - (sum * sum) / count;
    };

    for (let t = 1; t <= n; t++) {
      // Minimum cost ending at position t
      for (const s of candidates) {
        // Enforce minimum segment length: segment [s..t-1] must be >= minSegLen
        // EXCEPT for s=0, which is the entire prefix (always valid, we just can't split it yet).
        if ((t - s) < minSegLen && s !== 0) continue;

        const cost = F[s] + fastCost(s, t - 1) + beta;
        if (cost < F[t]) {
          F[t] = cost;
          cp[t] = s;
        }
      }

      // PELT pruning: remove candidates that can no longer be optimal
      const newCandidates = [];
      for (const s of candidates) {
        if (F[s] + fastCost(s, t - 1) < F[t]) {
          newCandidates.push(s);
        }
      }

      // Only add t as a candidate for future splits if the segment BEFORE t is valid
      if (t >= minSegLen) {
        newCandidates.push(t);
      }
      candidates = newCandidates;
    }

    // Back-track to recover change points
    const changePoints = [];
    let pos = n;
    while (pos > 0) {
      const start = cp[pos];
      if (start > 0) {
        changePoints.unshift(start);
      }
      pos = start;
    }

    return { changePoints, cost: F[n] };
  }


  /**
   * Compute per-segment descriptive statistics.
   *
   * @param {number[]} data
   * @param {string[]} dates
   * @param {number[]} changePoints  — first indices of new segments (from pelt())
   * @returns {Object[]} Array of segment info objects
   */
  segmentStats(data, dates, changePoints) {
    const boundaries = [0, ...changePoints, data.length];
    const segments = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end   = boundaries[i + 1]; // exclusive

      const slice = data.slice(start, end);
      const n     = slice.length;

      const mean = slice.reduce((s, v) => s + v, 0) / n;
      const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(n - 1, 1);
      const stdDev = Math.sqrt(variance);
      const min = Math.min(...slice);
      const max = Math.max(...slice);

      // Simple OLS trend slope
      let sumXY = 0, sumX = 0, sumX2 = 0;
      for (let j = 0; j < n; j++) {
        sumXY += j * slice[j];
        sumX  += j;
        sumX2 += j * j;
      }
      const slope = n > 1
        ? (n * sumXY - sumX * mean * n) / (n * sumX2 - sumX * sumX)
        : 0;

      const trend = slope > 0.001 ? 'Increasing' : slope < -0.001 ? 'Decreasing' : 'Stable';

      segments.push({
        index: i,
        startIndex: start,
        endIndex:   end - 1,
        startDate:  dates[start]   || String(start),
        endDate:    dates[end - 1] || String(end - 1),
        n,
        mean:    parseFloat(mean.toFixed(4)),
        stdDev:  parseFloat(stdDev.toFixed(4)),
        min:     parseFloat(min.toFixed(4)),
        max:     parseFloat(max.toFixed(4)),
        slope:   parseFloat(slope.toFixed(6)),
        trend,
      });
    }

    return segments;
  }

  /**
   * Per-segment forecasting.
   * Fits the requested model independently on each segment, computes accuracy
   * metrics for each segment, and produces a forecast from the LAST segment only.
   *
   * @param {number[]} data
   * @param {string[]} dates
   * @param {number[]} changePoints
   * @param {string}   model
   * @param {number}   periods
   * @param {Object}   parameters
   * @returns {Object}  Full segment forecast result
   */
  segmentForecast(data, dates, changePoints, model, periods, parameters = {}) {
    const boundaries  = [0, ...changePoints, data.length];
    const segResults  = [];

    // Fitted values for the full series (per-segment stitched)
    const fullFittedValues = new Array(data.length).fill(null);

    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i];
      const end   = boundaries[i + 1]; // exclusive
      const slice = data.slice(start, end);
      const isLast = i === boundaries.length - 2;

      let result;
      try {
        result = this._runModel(slice, isLast ? periods : 0, model, parameters);
      } catch (err) {
        // Segment too short for the chosen model — fall back to mean
        const m = slice.reduce((s, v) => s + v, 0) / slice.length;
        result = {
          method: 'Segment Mean (fallback)',
          forecast: isLast ? Array(periods).fill(m) : [],
          fittedValues: slice.map(() => m),
          parameters: {},
        };
      }

      // Accuracy on this segment
      let accuracy = null;
      if (result.fittedValues && result.fittedValues.length > 0) {
        const actualSubset = slice.slice(slice.length - result.fittedValues.length);
        accuracy = forecastService.calculateAccuracy(actualSubset, result.fittedValues);
      }

      // Confidence intervals (last segment only)
      let confidenceIntervals = null;
      if (isLast && accuracy && accuracy.rmse > 0) {
        confidenceIntervals = forecastService.confidenceIntervals(result.forecast, accuracy.rmse, 0.95);
      }

      // Stitch fitted values into full array
      if (result.fittedValues) {
        const offset = start + (slice.length - result.fittedValues.length);
        result.fittedValues.forEach((v, j) => {
          fullFittedValues[offset + j] = v;
        });
      }

      segResults.push({
        segmentIndex:  i,
        startIndex:    start,
        endIndex:      end - 1,
        startDate:     dates[start]   || String(start),
        endDate:       dates[end - 1] || String(end - 1),
        n:             slice.length,
        method:        result.method,
        parameters:    result.parameters,
        accuracy,
        forecast:      isLast ? result.forecast : [],
        confidenceIntervals: isLast ? confidenceIntervals : null,
        isLastSegment: isLast,
      });
    }

    // Whole-series accuracy (reference baseline for comparison)
    let baselineAccuracy = null;
    try {
      const baselineResult = this._runModel(data, 0, model, parameters);
      if (baselineResult.fittedValues && baselineResult.fittedValues.length > 0) {
        const actualSubset = data.slice(data.length - baselineResult.fittedValues.length);
        baselineAccuracy = forecastService.calculateAccuracy(actualSubset, baselineResult.fittedValues);
      }
    } catch (_) {
      // baseline not critical
    }

    const lastSeg = segResults[segResults.length - 1];

    return {
      segments:            segResults,
      forecast:            lastSeg.forecast,
      confidenceIntervals: lastSeg.confidenceIntervals,
      fittedValues:        fullFittedValues,
      method:              lastSeg.method,
      parameters:          lastSeg.parameters,
      stats: {
        lastValue:      data[data.length - 1],
        projectedValue: lastSeg.forecast[0] ?? null,
        growthRate: lastSeg.forecast[0] != null
          ? (((lastSeg.forecast[0] - data[data.length - 1]) / data[data.length - 1]) * 100).toFixed(2)
          : '0.00',
      },
      baselineAccuracy,   // whole-series RMSE for comparison
      changePoints,
    };
  }

  /**
   * Run a named model on a data slice.
   * @private
   */
  _runModel(slice, periods, model, parameters) {
    switch (model.toLowerCase()) {
      case 'moving_average':
        return forecastService.movingAverage(slice, periods, parameters?.window || 3);
      case 'exponential_smoothing':
        return forecastService.exponentialSmoothing(slice, periods, parameters?.alpha || null);
      case 'holts_linear_trend':
        return forecastService.holtsLinearTrend(slice, periods, parameters?.alpha || 0.2, parameters?.beta || 0.1);
      case 'arima':
        return forecastService.arima(slice, periods, parameters || { p: 2, d: 1, q: 1 });
      default:
        return forecastService.movingAverage(slice, periods, 3);
    }
  }
}

module.exports = new ChangePointService();
