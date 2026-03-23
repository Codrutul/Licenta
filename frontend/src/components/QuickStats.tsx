import React, { useState } from 'react';
import type { ForecastResult, TimeSeriesData } from '../services/api';

interface QuickStatsProps {
    forecastResult: ForecastResult | null;
    timeSeriesData: TimeSeriesData | null;
}

// SVG icons as components
const IconTrendUp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" style={{ width: 14, height: 14 }}>
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
    </svg>
);

const IconBarChart = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" style={{ width: 14, height: 14 }}>
        <rect x="18" y="3" width="4" height="18" />
        <rect x="10" y="8" width="4" height="13" />
        <rect x="2" y="13" width="4" height="8" />
    </svg>
);

const IconSwap = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" style={{ width: 12, height: 12 }}>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
);

const QuickStats: React.FC<QuickStatsProps> = ({ forecastResult, timeSeriesData }) => {
    const [viewMode, setViewMode] = useState<'forecast' | 'data'>('forecast');

    const canToggle = forecastResult && timeSeriesData;
    const showForecast = forecastResult && (!canToggle || viewMode === 'forecast');
    const showData = timeSeriesData && (!forecastResult || viewMode === 'data');

    const renderForecastStats = () => {
        if (!forecastResult) return null;
        const { stats } = forecastResult;
        const growthRate = parseFloat(stats.growthRate);
        const isPositive = growthRate >= 0;

        return (
            <>
                <div className="stat-item">
                    <div className="stat-label">Last Observed</div>
                    <div className="stat-value">{stats.lastValue.toFixed(4)}</div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Projected Value</div>
                    <div className="stat-value" style={{ color: 'var(--color-forecast)' }}>
                        {stats.projectedValue.toFixed(4)}
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
                        <div className="stat-label">RMSE</div>
                        <div className="stat-value" style={{ fontSize: '1.15rem' }}>
                            {forecastResult.accuracy.rmse.toFixed(4)}
                        </div>
                    </div>
                )}
            </>
        );
    };

    const renderDataStats = () => {
        if (!timeSeriesData) return null;
        const { statistics } = timeSeriesData;

        return (
            <>
                <div className="stat-item">
                    <div className="stat-label">Observations (n)</div>
                    <div className="stat-value">{statistics.count}</div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Mean (μ)</div>
                    <div className="stat-value">{statistics.mean.toFixed(4)}</div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Range [min, max]</div>
                    <div className="stat-value" style={{ fontSize: '1rem' }}>
                        [{statistics.min.toFixed(2)}, {statistics.max.toFixed(2)}]
                    </div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">Trend</div>
                    <div className={`stat-value ${statistics.trend === 'Increasing' ? 'positive' :
                            statistics.trend === 'Decreasing' ? 'negative' : ''
                        }`} style={{ fontSize: '1rem' }}>
                        {statistics.trend}
                    </div>
                </div>

                {statistics.seasonality.detected && (
                    <div className="stat-item">
                        <div className="stat-label">Seasonality Period</div>
                        <div className="stat-value" style={{ fontSize: '1rem' }}>
                            {statistics.seasonality.period}
                        </div>
                    </div>
                )}
            </>
        );
    };

    if (!timeSeriesData && !forecastResult) {
        return (
            <div className="stats-card">
                <div className="stats-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="stats-header-icon"><IconBarChart /></span>
                        <h3>Statistics</h3>
                    </div>
                </div>
                <div className="empty-state" style={{ minHeight: 'auto', padding: '1.5rem 0' }}>
                    <p style={{ fontSize: '0.8rem' }}>
                        Statistics will appear here after importing data.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="stats-card">
            <div className="stats-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="stats-header-icon">
                        {showForecast ? <IconTrendUp /> : <IconBarChart />}
                    </span>
                    <h3>{showForecast ? 'Forecast Metrics' : 'Descriptive Statistics'}</h3>
                </div>
                {canToggle && (
                    <button
                        className="stats-toggle-btn"
                        onClick={() => setViewMode(viewMode === 'forecast' ? 'data' : 'forecast')}
                        title={`Switch to ${viewMode === 'forecast' ? 'data' : 'forecast'} statistics`}
                    >
                        <IconSwap />
                    </button>
                )}
            </div>

            {showForecast && renderForecastStats()}
            {showData && renderDataStats()}
        </div>
    );
};

export default QuickStats;
