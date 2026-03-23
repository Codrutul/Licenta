import React from 'react';
import type { Chart as ChartJS } from 'chart.js';

export interface ToolbarState {
    showActual: boolean;
    showForecast: boolean;
    showFitted: boolean;
    showCI: boolean;
    fillMode: boolean;
    panEnabled: boolean;
    logScale: boolean;
    showOutliers: boolean;
    comparisonEnabled: boolean;
    showAnnotations: boolean;
    showChangePoints: boolean;
}

interface ChartToolbarProps {
    chartRef: React.RefObject<ChartJS<'line'> | null>;
    state: ToolbarState;
    onStateChange: (updates: Partial<ToolbarState>) => void;
    hasData: boolean;
    hasForecast: boolean;
    hasFitted: boolean;
    hasCI: boolean;
    hasComparison: boolean;
    hasAnnotations: boolean;
    hasOutliers: boolean;
}

// Minimal SVG icons — 12×12 viewport
const Ico = {
    ZoomIn: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    ),
    ZoomOut: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    ),
    Reset: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.33" />
        </svg>
    ),
    Pan: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
        </svg>
    ),
    LineChart: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M3 3v18h18" /><polyline points="7 16 11 11 15 14 19 8" />
        </svg>
    ),
    Forecast: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M3 3v18h18" /><path d="M7 14l4-4 2 2" strokeDasharray="3 2" />
            <path d="M13 12l6-5" strokeDasharray="3 2" />
        </svg>
    ),
    Fitted: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeDasharray="4 3">
            <path d="M4 18 Q 8 8 12 12 Q 16 16 20 6" />
        </svg>
    ),
    CI: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <rect x="3" y="8" width="18" height="8" opacity="0.4" />
            <line x1="3" y1="8" x2="21" y2="8" /><line x1="3" y1="16" x2="21" y2="16" />
        </svg>
    ),
    Compare: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
    ),
    Marker: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="3 2" /><line x1="9" y1="7" x2="15" y2="7" />
        </svg>
    ),
    Outlier: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    Area: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M3 20 L3 10 L9 14 L14 8 L21 12 L21 20 Z" opacity="0.35" fill="currentColor" />
            <path d="M3 10 L9 14 L14 8 L21 12" />
        </svg>
    ),
    Linear: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <line x1="3" y1="21" x2="21" y2="3" />
        </svg>
    ),
    Log: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M3 20 Q 7 18 10 12 Q 14 4 21 3" />
        </svg>
    ),
    Download: () => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
    ),
};

const ChartToolbar: React.FC<ChartToolbarProps> = ({
    chartRef,
    state,
    onStateChange,
    hasData,
    hasForecast,
    hasFitted,
    hasCI,
    hasComparison,
    hasAnnotations,
    hasOutliers,
}) => {
    const handleZoomIn = () => { const c = chartRef.current; if (c) (c as any).zoom(1.25); };
    const handleZoomOut = () => { const c = chartRef.current; if (c) (c as any).zoom(0.8); };
    const handleResetZoom = () => { const c = chartRef.current; if (c) (c as any).resetZoom(); };
    const handleDownloadPNG = () => {
        const chart = chartRef.current;
        if (!chart) return;
        const url = chart.toBase64Image('image/png', 1);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forecast_chart_${new Date().toISOString().split('T')[0]}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const btn = (
        label: string,
        Icon: React.FC,
        onClick: () => void,
        active?: boolean,
        disabled?: boolean,
        title?: string
    ) => (
        <button
            className={`toolbar-btn${active ? ' toolbar-btn--active' : ''}${disabled ? ' toolbar-btn--disabled' : ''}`}
            onClick={onClick}
            disabled={disabled}
            title={title || label}
            aria-label={label}
        >
            <span className="toolbar-btn-icon"><Icon /></span>
            <span className="toolbar-btn-label">{label}</span>
        </button>
    );

    return (
        <div className="chart-toolbar">
            {/* Zoom */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Zoom</span>
                {btn('In', Ico.ZoomIn, handleZoomIn, false, !hasData, 'Zoom in')}
                {btn('Out', Ico.ZoomOut, handleZoomOut, false, !hasData, 'Zoom out')}
                {btn('Reset', Ico.Reset, handleResetZoom, false, !hasData, 'Reset zoom')}
            </div>

            <div className="toolbar-divider" />

            {/* Navigate */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Navigate</span>
                {btn('Pan', Ico.Pan,
                    () => onStateChange({ panEnabled: !state.panEnabled }),
                    state.panEnabled, !hasData,
                    state.panEnabled ? 'Disable pan' : 'Enable pan (drag to scroll)'
                )}
            </div>

            <div className="toolbar-divider" />

            {/* Layers */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Layers</span>
                {btn('Actual', Ico.LineChart,
                    () => onStateChange({ showActual: !state.showActual }),
                    state.showActual, !hasData, 'Toggle actual data series'
                )}
                {hasForecast && btn('Forecast', Ico.Forecast,
                    () => onStateChange({ showForecast: !state.showForecast }),
                    state.showForecast, false, 'Toggle forecast series'
                )}
                {hasFitted && btn('Fitted', Ico.Fitted,
                    () => onStateChange({ showFitted: !state.showFitted }),
                    state.showFitted, false, 'Toggle fitted values'
                )}
                {hasCI && btn('95% CI', Ico.CI,
                    () => onStateChange({ showCI: !state.showCI }),
                    state.showCI, false, 'Toggle confidence interval bands'
                )}
                {hasComparison && btn('Compare', Ico.Compare,
                    () => onStateChange({ comparisonEnabled: !state.comparisonEnabled }),
                    state.comparisonEnabled, false, 'Toggle comparison model overlay'
                )}
                {hasAnnotations && btn('Markers', Ico.Marker,
                    () => onStateChange({ showAnnotations: !state.showAnnotations }),
                    state.showAnnotations, false, 'Toggle annotation markers'
                )}
                {hasOutliers && btn('Outliers', Ico.Outlier,
                    () => onStateChange({ showOutliers: !state.showOutliers }),
                    state.showOutliers, false, 'Highlight outliers (±2σ from mean)'
                )}
            </div>

            <div className="toolbar-divider" />

            {/* Style */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Style</span>
                {btn(
                    state.fillMode ? 'Area' : 'Line',
                    state.fillMode ? Ico.Area : Ico.Linear,
                    () => onStateChange({ fillMode: !state.fillMode }),
                    state.fillMode, !hasData, 'Toggle area fill'
                )}
                {btn(
                    state.logScale ? 'Log' : 'Linear',
                    state.logScale ? Ico.Log : Ico.Linear,
                    () => onStateChange({ logScale: !state.logScale }),
                    state.logScale, !hasData,
                    state.logScale ? 'Switch to linear scale' : 'Switch to log scale'
                )}
            </div>

            <div className="toolbar-divider" />

            {/* Export */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Export</span>
                {btn('PNG', Ico.Download, handleDownloadPNG, false, !hasData, 'Download chart as PNG')}
            </div>
        </div>
    );
};

export default ChartToolbar;
