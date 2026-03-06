const csv = require('csv-parser');
const { Readable } = require('stream');
const stats = require('simple-statistics');

/**
 * Data Processing Utility
 * Handles CSV parsing, validation, and statistical analysis
 */

class DataProcessor {
  
  /**
   * Parse CSV data from buffer
   * @param {Buffer} buffer - CSV file buffer
   * @returns {Promise<Object>} Parsed time series data
   */
  async parseCSV(buffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(buffer.toString());

      stream
        .pipe(csv())
        .on('data', (row) => {
          results.push(row);
        })
        .on('end', () => {
          try {
            const processed = this.processTimeSeriesData(results);
            resolve(processed);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process raw CSV data into time series format
   * @param {Array<Object>} rawData - Parsed CSV rows
   * @returns {Object} Processed time series data
   */
  processTimeSeriesData(rawData) {
    if (!rawData || rawData.length === 0) {
      throw new Error('No data found in CSV file');
    }

    // Detect date and value columns
    const headers = Object.keys(rawData[0]);
    const dateColumn = this.detectDateColumn(headers);
    const valueColumn = this.detectValueColumn(headers);

    if (!dateColumn || !valueColumn) {
      throw new Error('Could not detect date and value columns. Ensure CSV has date and numeric value columns.');
    }

    // Extract and validate data
    const timeSeries = rawData.map((row, index) => {
      const dateStr = row[dateColumn];
      const valueStr = row[valueColumn];
      const value = parseFloat(valueStr);

      if (isNaN(value)) {
        throw new Error(`Invalid numeric value at row ${index + 2}: ${valueStr}`);
      }

      return {
        date: dateStr,
        value: value
      };
    });

    // Calculate statistics
    const values = timeSeries.map(d => d.value);
    const statistics = this.calculateStatistics(values);

    return {
      data: timeSeries,
      values: values,
      dates: timeSeries.map(d => d.date),
      statistics: statistics,
      metadata: {
        dateColumn,
        valueColumn,
        length: timeSeries.length
      }
    };
  }

  /**
   * Detect date column from headers
   * @param {Array<string>} headers - CSV headers
   * @returns {string} Date column name
   */
  detectDateColumn(headers) {
    const dateKeywords = ['date', 'time', 'timestamp', 'period', 'year', 'month', 'day'];
    return headers.find(h => 
      dateKeywords.some(keyword => h.toLowerCase().includes(keyword))
    ) || headers[0];
  }

  /**
   * Detect value column from headers
   * @param {Array<string>} headers - CSV headers
   * @returns {string} Value column name
   */
  detectValueColumn(headers) {
    const valueKeywords = ['value', 'price', 'amount', 'sales', 'count', 'revenue', 'quantity'];
    const valueColumn = headers.find(h => 
      valueKeywords.some(keyword => h.toLowerCase().includes(keyword))
    );
    
    // If no keyword match, use the second column or first numeric column
    return valueColumn || headers[1] || headers[0];
  }

  /**
   * Calculate comprehensive statistics for time series
   * @param {Array<number>} values - Time series values
   * @returns {Object} Statistical measures
   */
  calculateStatistics(values) {
    if (!values || values.length === 0) {
      return {};
    }

    const mean = stats.mean(values);
    const median = stats.median(values);
    const stdDev = stats.standardDeviation(values);
    const variance = stats.variance(values);
    const min = stats.min(values);
    const max = stats.max(values);

    // Calculate trend
    const trend = this.detectTrend(values);
    
    // Calculate seasonality indicators
    const seasonality = this.detectSeasonality(values);

    return {
      count: values.length,
      mean: this.round(mean, 2),
      median: this.round(median, 2),
      stdDev: this.round(stdDev, 2),
      variance: this.round(variance, 2),
      min: this.round(min, 2),
      max: this.round(max, 2),
      range: this.round(max - min, 2),
      trend: trend,
      seasonality: seasonality
    };
  }

  /**
   * Detect trend in time series
   * @param {Array<number>} values - Time series values
   * @returns {string} Trend direction
   */
  detectTrend(values) {
    if (values.length < 2) return 'insufficient_data';

    // Simple linear regression
    const n = values.length;
    const indices = Array.from({ length: n }, (_, i) => i);
    
    const xMean = stats.mean(indices);
    const yMean = stats.mean(values);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (indices[i] - xMean) * (values[i] - yMean);
      denominator += (indices[i] - xMean) ** 2;
    }
    
    const slope = numerator / denominator;
    
    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Detect seasonality patterns
   * @param {Array<number>} values - Time series values
   * @returns {Object} Seasonality information
   */
  detectSeasonality(values) {
    if (values.length < 12) {
      return { detected: false, period: null };
    }

    // Simple autocorrelation check for common periods
    const periods = [7, 12, 24, 30]; // Weekly, Monthly, etc.
    let maxCorrelation = 0;
    let detectedPeriod = null;

    for (const period of periods) {
      if (values.length >= period * 2) {
        const correlation = this.autocorrelation(values, period);
        if (correlation > maxCorrelation && correlation > 0.5) {
          maxCorrelation = correlation;
          detectedPeriod = period;
        }
      }
    }

    return {
      detected: detectedPeriod !== null,
      period: detectedPeriod,
      strength: maxCorrelation
    };
  }

  /**
   * Calculate autocorrelation for a given lag
   * @param {Array<number>} values - Time series values
   * @param {number} lag - Lag period
   * @returns {number} Autocorrelation coefficient
   */
  autocorrelation(values, lag) {
    const n = values.length;
    const mean = stats.mean(values);
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n - lag; i++) {
      numerator += (values[i] - mean) * (values[i + lag] - mean);
    }
    
    for (let i = 0; i < n; i++) {
      denominator += (values[i] - mean) ** 2;
    }
    
    return numerator / denominator;
  }

  /**
   * Round number to specified decimal places
   * @param {number} num - Number to round
   * @param {number} decimals - Decimal places
   * @returns {number} Rounded number
   */
  round(num, decimals) {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
}

module.exports = new DataProcessor();
