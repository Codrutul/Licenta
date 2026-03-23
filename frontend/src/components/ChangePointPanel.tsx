import React, { useState } from 'react';
import type { ChangePointResult, SegmentForecastResult, SegmentStats } from '../services/api';

interface ChangePointPanelProps {
    hasData: boolean;
    currentModel: string;
    cpResult: ChangePointResult | null;
    segmentResult: SegmentForecastResult | null;
    onDetect: (penaltyMultiplier: number) => Promise<void>;
    onSegmentForecast: () => Promise<void>;
    onClear: () => void;
    loading: boolean;
    hasGlobalForecast?: boolean;
}

const trendArrow = (trend: string) => {
    if (trend === 'Increasing') return (
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" style={{ width: 11, height: 11, color: 'var(--color-success)' }}>
            <polyline points="1,9 5,4 9,7 11,2" />
        </svg>
    );
    if (trend === 'Decreasing') return (
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" style={{ width: 11, height: 11, color: 'var(--color-error)' }}>
            <polyline points="1,3 5,8 9,5 11,10" />
        </svg>
    );
    return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>—</span>;
};

const ChangePointPanel: React.FC<ChangePointPanelProps> = ({
    hasData,
    currentModel,
    cpResult,
    segmentResult,
    onDetect,
    onSegmentForecast,
    onClear,
    loading,
    hasGlobalForecast = false,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [penaltyMult, setPenaltyMult] = useState(1.0);

    const modelLabel: Record<string, string> = {
        moving_average: 'Moving Average',
        exponential_smoothing: 'Exp. Smoothing',
        holts_linear_trend: "Holt's Linear",
        holts_winters: 'Holt-Winters',
        arima: 'ARIMA',
    };

    return (
        <div className="changepoint-panel">
            {/* ── Toggle header ── */}
            <button
                className="changepoint-toggle"
                onClick={() => setExpanded(!expanded)}
                disabled={!hasData}
            >
                <span className="cp-toggle-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
                        <path d="M3 3v18h18" />
                        <line x1="9" y1="3" x2="9" y2="21" strokeDasharray="3 2" />
                        <line x1="16" y1="3" x2="16" y2="21" strokeDasharray="3 2" />
                        <polyline points="3 14 9 7 16 12 21 5" />
                    </svg>
                </span>
                <span>Change-Point Detection</span>
                {cpResult && cpResult.changePoints.length > 0 && (
                    <span className="cp-count-badge">
                        {cpResult.changePoints.length} break{cpResult.changePoints.length !== 1 ? 's' : ''}
                    </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>
                    {expanded ? '▲' : '▼'}
                </span>
            </button>

            {/* ── Body ── */}
            {expanded && (
                <div className="changepoint-body">

                    {/* Penalty control */}
                    <div className="cp-section">
                        <div className="cp-section-label">Detection Sensitivity</div>
                        <div className="cp-penalty-row">
                            <span className="cp-penalty-hint">Fewer breaks</span>
                            <input
                                type="range"
                                min={0.3}
                                max={3.0}
                                step={0.1}
                                value={penaltyMult}
                                onChange={e => setPenaltyMult(parseFloat(e.target.value))}
                                className="param-slider"
                                style={{ flex: 1 }}
                            />
                            <span className="cp-penalty-hint">More breaks</span>
                            <span className="cp-penalty-value">{penaltyMult.toFixed(1)}×</span>
                        </div>
                        <div className="cp-penalty-desc">
                            Penalty multiplier on BIC criterion β = {penaltyMult.toFixed(1)} × log(n).
                            Lower values allow more change points.
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="cp-actions">
                        <button
                            className="btn btn-primary"
                            onClick={() => onDetect(penaltyMult)}
                            disabled={!hasData || loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                                    Detecting…
                                </>
                            ) : 'Detect Change Points'}
                        </button>

                        {cpResult && (
                            <div className="tooltip-wrapper" style={{ display: 'inline-block' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={onSegmentForecast}
                                    disabled={loading || !hasGlobalForecast || cpResult.changePoints.length === 0}
                                    title={
                                        !hasGlobalForecast 
                                            ? "Run a global 'Calculate Forecast' first to establish a baseline for comparison."
                                            : cpResult.changePoints.length === 0 
                                                ? "Structural breaks must be detected before running a segment forecast."
                                                : `Fit ${modelLabel[currentModel] ?? currentModel} independently on each segment`
                                    }
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}
                                >
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Run Segment Forecast</span>
                                    <span style={{ fontSize: '0.68rem', opacity: 0.65, fontWeight: 400 }}>
                                        using {modelLabel[currentModel] ?? currentModel}
                                    </span>
                                </button>
                            </div>
                        )}

                        {cpResult && (
                            <button className="btn btn-secondary" onClick={onClear} disabled={loading}>
                                Clear
                            </button>
                        )}
                    </div>

                    {/* No change points found */}
                    {cpResult && cpResult.changePoints.length === 0 && (
                        <div className="cp-no-result">
                            No structural breaks detected at this sensitivity level.
                            Try lowering the penalty multiplier.
                        </div>
                    )}

                    {/* Segment statistics table */}
                    {cpResult && cpResult.segments.length > 0 && (
                        <div className="cp-section">
                            <div className="cp-section-label">
                                Segment Statistics
                                <span className="cp-section-sub">
                                    {cpResult.segments.length} segment{cpResult.segments.length !== 1 ? 's' : ''}
                                    {' · '}n = {cpResult.n}
                                    {' · '}β = {cpResult.penalty.toFixed(3)}
                                </span>
                            </div>
                            <div className="cp-table-wrap">
                                <table className="cp-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Date range</th>
                                            <th>n</th>
                                            <th>μ</th>
                                            <th>σ</th>
                                            <th>Trend</th>
                                            {segmentResult && <th>RMSE</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cpResult.segments.map((seg: SegmentStats, idx: number) => {
                                            const segRes = segmentResult?.segments[idx];
                                            return (
                                                <tr key={idx} className={idx % 2 === 0 ? '' : 'cp-row-alt'}>
                                                    <td className="cp-td-mono">{idx + 1}</td>
                                                    <td className="cp-td-mono" style={{ fontSize: '0.68rem' }}>
                                                        {seg.startDate}<br />{seg.endDate}
                                                    </td>
                                                    <td className="cp-td-mono">{seg.n}</td>
                                                    <td className="cp-td-mono">{seg.mean.toFixed(3)}</td>
                                                    <td className="cp-td-mono">{seg.stdDev.toFixed(3)}</td>
                                                    <td>{trendArrow(seg.trend)}</td>
                                                    {segmentResult && (
                                                        <td className="cp-td-mono" style={{
                                                            color: segRes?.isLastSegment ? 'var(--color-accent-primary)' : 'inherit'
                                                        }}>
                                                            {segRes?.accuracy?.rmse?.toFixed(4) ?? '—'}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* RMSE comparison box */}
                            {segmentResult && segmentResult.baselineAccuracy && (
                                <div className="cp-rmse-comparison">
                                    <div className="cp-rmse-row">
                                        <span className="cp-rmse-label">Whole-series RMSE</span>
                                        <span className="cp-rmse-value cp-rmse-baseline">
                                            {segmentResult.baselineAccuracy.rmse.toFixed(4)}
                                        </span>
                                    </div>
                                    <div className="cp-rmse-row">
                                        <span className="cp-rmse-label">Last-segment RMSE</span>
                                        <span className="cp-rmse-value cp-rmse-segment">
                                            {segmentResult.segments.find(s => s.isLastSegment)?.accuracy?.rmse?.toFixed(4) ?? '—'}
                                        </span>
                                    </div>
                                    {(() => {
                                        const lastSeg = segmentResult.segments.find(s => s.isLastSegment);
                                        const base = segmentResult.baselineAccuracy!.rmse;
                                        const seg = lastSeg?.accuracy?.rmse;
                                        if (seg == null || base === 0) return null;
                                        const pct = ((base - seg) / base * 100);
                                        return (
                                            <div className="cp-rmse-improvement">
                                                {pct > 0
                                                    ? `↓ ${pct.toFixed(1)}% improvement from segmented fit`
                                                    : `↑ ${Math.abs(pct).toFixed(1)}% — whole-series fit performed better`
                                                }
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChangePointPanel;
