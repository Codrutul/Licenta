import React, { useState } from 'react';
import type { ForecastResult, TimeSeriesData } from '../services/api';

interface QuickStatsProps {
    forecastResult: ForecastResult | null;
    timeSeriesData: TimeSeriesData | null;
}

const QuickStats: React.FC<QuickStatsProps> = ({ forecastResult, timeSeriesData }) => {
    const [viewMode, setViewMode] = useState<'forecast' | 'data'>('forecast');

    // If both forecast and data exist, allow toggling
    const canToggle = forecastResult && timeSeriesData;

    // Determine what to show
    const showForecast = forecastResult && (!canToggle || viewMode === 'forecast');
    const showData = timeSeriesData && (!forecastResult || viewMode === 'data');

    // Render forecast statistics
    const renderForecastStats = () => {
        if (!forecastResult) return null;

        const { stats } = forecastResult;
        const growthRate = parseFloat(stats.growthRate);
        const isPositive = growthRate >= 0;

        return (
            <>
                <div className="stat-item">
                    <div className="stat-label">Last Value</div>
                    <div className="stat-value">{stats.lastValue.toFixed(2)}</div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Projected Value</div>
                    <div className="stat-value" style={{ color: '#6B8FFF' }}>
                        {stats.projectedValue.toFixed(2)}
                    </div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Growth Rate</div>
                    <div className={`stat-value ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}{stats.growthRate}%
                    </div>
                </div>

                {forecastResult.accuracy && (
                    <div className="stat-item">
                        <div className="stat-label">Model Accuracy (RMSE)</div>
                        <div className="stat-value" style={{ fontSize: '1.25rem' }}>
                            {forecastResult.accuracy.rmse.toFixed(2)}
                        </div>
                    </div>
                )}
            </>
        );
    };

    // Render data statistics
    const renderDataStats = () => {
        if (!timeSeriesData) return null;

        const { statistics } = timeSeriesData;

        return (
            <>
                <div className="stat-item">
                    <div className="stat-label">Data Points</div>
                    <div className="stat-value">{statistics.count}</div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Mean</div>
                    <div className="stat-value">{statistics.mean.toFixed(2)}</div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Range</div>
                    <div className="stat-value">
                        {statistics.min.toFixed(2)} - {statistics.max.toFixed(2)}
                    </div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Trend</div>
                    <div className={`stat-value ${statistics.trend === 'Increasing' ? 'positive' :
                            statistics.trend === 'Decreasing' ? 'negative' : ''
                        }`}>
                        {statistics.trend}
                    </div>
                </div>

                {statistics.seasonality.detected && (
                    <div className="stat-item">
                        <div className="stat-label">Seasonality Detected</div>
                        <div className="stat-value" style={{ fontSize: '1rem' }}>
                            Period: {statistics.seasonality.period}
                        </div>
                    </div>
                )}
            </>
        );
    };

    // Show empty state if no data at all
    if (!timeSeriesData && !forecastResult) {
        return (
            <div className="stats-card">
                <div className="stats-header">
                    <span className="stats-header-icon">📊</span>
                    <h3>Statistics</h3>
                </div>
                <div className="empty-state" style={{ minHeight: 'auto', padding: '2rem 0' }}>
                    <p style={{ fontSize: '0.875rem' }}>
                        Statistics will appear here after uploading data
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="stats-card">
            <div className="stats-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="stats-header-icon">{showForecast ? '📈' : '📊'}</span>
                    <h3>{showForecast ? 'Forecast Stats' : 'Data Stats'}</h3>
                </div>
                {canToggle && (
                    <button
                        className="stats-toggle-btn"
                        onClick={() => setViewMode(viewMode === 'forecast' ? 'data' : 'forecast')}
                        title={`Switch to ${viewMode === 'forecast' ? 'data' : 'forecast'} stats`}
                    >
                        ⇄
                    </button>
                )}
            </div>

            {showForecast && renderForecastStats()}
            {showData && renderDataStats()}
        </div>
    );
};

export default QuickStats;
