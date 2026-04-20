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
   * Cost function: OLS residuals (RSS from within-segment linear trend).
   * This detects STRUCTURAL BREAKS IN TREND rather than mean shifts.
   * For a steadily-growing GDP series, a mean-shift cost would split the
   * trend into many flat pieces. An OLS cost only adds a break when a
   * new slope/intercept fits significantly better — which is the standard
   * econometric criterion (Bai & Perron 1998).
   *
   * OLS in O(1) per segment using precomputed prefix sums of:
   *   Σy, Σy², Σ(i·y)   (where i is the global index)
   * For segment [s, e], local time t_k = k - s (k = s..e):
   *   sum_t  = n*(n-1)/2          (closed form)
   *   sum_t2 = n*(n-1)*(2n-1)/6  (closed form)
   *   sum_ty = Σ(k·y[k]) for k∈[s,e]  minus  s·Σy
   *   b = (n·sum_ty − sum_t·sum_y) / (n·sum_t2 − sum_t²)
   *   a = (sum_y − b·sum_t) / n
   *   RSS = sum_y2 − a·sum_y − b·sum_ty
   *
   * Penalty: variance-scaled BIC × user multiplier, same as before.
   *
   * @param {number[]} data      Time series values
   * @param {number}   penaltyMultiplier   Multiplier on BIC penalty (default 1.0)
   * @param {number}   minLen    Minimum segment length (default max(5, n/10))
   * @returns {{ changePoints: number[], cost: number }}
   */
  pelt(data, penaltyMultiplier = null, minLen = null) {
    const n = data.length;

    // Robust noise variance estimation using first differences
    // (avoids inflating σ² with trend or level-shift variance)
    let diffSqSum = 0;
    for (let i = 1; i < n; i++) {
      const diff = data[i] - data[i - 1];
      diffSqSum += diff * diff;
    }
    const sigma2 = Math.max(diffSqSum / (2 * Math.max(n - 1, 1)), 1e-10);

    const multiplier = penaltyMultiplier !== null ? penaltyMultiplier : 1.0;
    // Each segment uses 2 parameters (slope + intercept), so BIC penalty = 2·log(n)·σ²
    const beta = multiplier * 2 * Math.log(n) * sigma2;

    const minSegLen = minLen !== null ? minLen : Math.max(5, Math.floor(n / 10));

    const F  = new Array(n + 1).fill(Infinity);
    const cp = new Array(n + 1).fill(-1);
    F[0] = -beta;
    let candidates = [0];

    // Prefix sums for O(1) OLS per segment
    // prefixY[i]  = Σ y[0..i-1]
    // prefixY2[i] = Σ y²[0..i-1]
    // prefixIY[i] = Σ j·y[j] for j=0..i-1  (global index j)
    const prefixY  = new Array(n + 1).fill(0);
    const prefixY2 = new Array(n + 1).fill(0);
    const prefixIY = new Array(n + 1).fill(0);
    for (let i = 0; i < n; i++) {
      prefixY[i + 1]  = prefixY[i]  + data[i];
      prefixY2[i + 1] = prefixY2[i] + data[i] * data[i];
      prefixIY[i + 1] = prefixIY[i] + i * data[i];
    }

    // O(1) OLS-residual cost for segment [s, e] (inclusive)
    const fastCost = (s, e) => {
      const count  = e - s + 1;           // n
      const sumY   = prefixY[e + 1]  - prefixY[s];
      const sumY2  = prefixY2[e + 1] - prefixY2[s];
      // sum_ty = Σ (k-s)·y[k]  for k in [s,e]
      //        = Σ k·y[k] - s·Σy[k]   (global-index form)
      const sumTY  = (prefixIY[e + 1] - prefixIY[s]) - s * sumY;

      // Closed-form sums for local t = 0..n-1
      const sumT   = count * (count - 1) / 2;
      const sumT2  = count * (count - 1) * (2 * count - 1) / 6;

      const denom = count * sumT2 - sumT * sumT;
      if (denom < 1e-12) {
        // Degenerate segment (n=1 or perfectly collinear t) — use mean cost
        return sumY2 - (sumY * sumY) / Math.max(count, 1);
      }

      const b   = (count * sumTY - sumT * sumY) / denom;
      const a   = (sumY - b * sumT) / count;
      // RSS = Σy² - a·Σy - b·Σ(t·y)
      const rss = sumY2 - a * sumY - b * sumTY;
      return Math.max(rss, 0);   // numerical guard against tiny negatives
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

    // ── Whole-series baseline RMSE, evaluated on the LAST SEGMENT only ──────
    // We run the model on the full data, then extract the fitted values that
    // correspond to the last segment's index range and compute RMSE there.
    // This gives an apples-to-apples comparison:
    //   baseline RMSE  = how well the whole-series model fits the last segment
    //   segment RMSE   = how well the per-segment model fits the last segment
    // Both are evaluated on the same window of data.
    let baselineAccuracy = null;
    try {
      const baselineResult = this._runModel(data, 0, model, parameters);
      const fitted = baselineResult.fittedValues;

      if (fitted && fitted.length > 0) {
        // fitted values may be shorter than data (warm-up period)
        const fittedOffset = data.length - fitted.length; // index in `data` where fitted[0] sits

        const lastStart = lastSeg.startIndex;
        const lastEnd   = lastSeg.endIndex; // inclusive

        // Find the overlap between the fitted window and the last segment
        const overlapStart = Math.max(lastStart, fittedOffset);
        const overlapEnd   = Math.min(lastEnd, data.length - 1);

        if (overlapEnd >= overlapStart) {
          const actualSlice  = data.slice(overlapStart, overlapEnd + 1);
          const fittedSlice  = fitted.slice(overlapStart - fittedOffset, overlapEnd - fittedOffset + 1)
                                     .filter(v => v !== null && v !== undefined);

          if (fittedSlice.length > 0 && fittedSlice.length === actualSlice.length) {
            baselineAccuracy = forecastService.calculateAccuracy(actualSlice, fittedSlice);
          }
        }
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
        growthRate: lastSeg.forecast.length > 0
          ? (((lastSeg.forecast[lastSeg.forecast.length - 1] - data[data.length - 1]) / data[data.length - 1]) * 100).toFixed(2)
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
      case 'holts_winters':
        return forecastService.holtsWinters(
          slice, periods,
          parameters?.alpha       ?? 0.3,
          parameters?.beta        ?? 0.1,
          parameters?.gamma       ?? 0.2,
          parameters?.seasonPeriod ?? 0
        );
      case 'arima':
        return forecastService.arima(slice, periods, parameters || { p: 2, d: 1, q: 1 });
      default:
        throw new Error(`Unknown model: ${model}`);
    }
  }
}

module.exports = new ChangePointService();
