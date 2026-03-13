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
    const handleZoomIn = () => {
        const chart = chartRef.current;
        if (!chart) return;
        (chart as any).zoom(1.25);
    };

    const handleZoomOut = () => {
        const chart = chartRef.current;
        if (!chart) return;
        (chart as any).zoom(0.8);
    };

    const handleResetZoom = () => {
        const chart = chartRef.current;
        if (!chart) return;
        (chart as any).resetZoom();
    };

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

    const toolbarBtn = (
        label: string,
        icon: string,
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
            <span className="toolbar-btn-icon">{icon}</span>
            <span className="toolbar-btn-label">{label}</span>
        </button>
    );

    return (
        <div className="chart-toolbar">
            {/* Zoom Controls */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Zoom</span>
                {toolbarBtn('In', '🔍+', handleZoomIn, false, !hasData, 'Zoom in')}
                {toolbarBtn('Out', '🔍-', handleZoomOut, false, !hasData, 'Zoom out')}
                {toolbarBtn('Reset', '⟳', handleResetZoom, false, !hasData, 'Reset zoom')}
            </div>

            <div className="toolbar-divider" />

            {/* Navigate */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Navigate</span>
                {toolbarBtn(
                    'Pan',
                    '✥',
                    () => onStateChange({ panEnabled: !state.panEnabled }),
                    state.panEnabled,
                    !hasData,
                    state.panEnabled ? 'Disable pan' : 'Enable pan (drag to scroll)'
                )}
            </div>

            <div className="toolbar-divider" />

            {/* Dataset Visibility */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Layers</span>
                {toolbarBtn(
                    'Actual',
                    '📈',
                    () => onStateChange({ showActual: !state.showActual }),
                    state.showActual,
                    !hasData,
                    'Toggle actual data line'
                )}
                {hasForecast && toolbarBtn(
                    'Forecast',
                    '🔮',
                    () => onStateChange({ showForecast: !state.showForecast }),
                    state.showForecast,
                    false,
                    'Toggle forecast line'
                )}
                {hasFitted && toolbarBtn(
                    'Fitted',
                    '〰',
                    () => onStateChange({ showFitted: !state.showFitted }),
                    state.showFitted,
                    false,
                    'Toggle fitted values line'
                )}
                {hasCI && toolbarBtn(
                    '95% CI',
                    '◫',
                    () => onStateChange({ showCI: !state.showCI }),
                    state.showCI,
                    false,
                    'Toggle confidence interval bands'
                )}
                {hasComparison && toolbarBtn(
                    'Compare',
                    '⚖',
                    () => onStateChange({ comparisonEnabled: !state.comparisonEnabled }),
                    state.comparisonEnabled,
                    false,
                    'Toggle comparison model overlay'
                )}
                {hasAnnotations && toolbarBtn(
                    'Markers',
                    '📌',
                    () => onStateChange({ showAnnotations: !state.showAnnotations }),
                    state.showAnnotations,
                    false,
                    'Toggle annotation markers'
                )}
                {hasOutliers && toolbarBtn(
                    'Outliers',
                    '⚠',
                    () => onStateChange({ showOutliers: !state.showOutliers }),
                    state.showOutliers,
                    false,
                    'Highlight outliers (±2σ from mean)'
                )}
            </div>

            <div className="toolbar-divider" />

            {/* Style */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Style</span>
                {toolbarBtn(
                    state.fillMode ? 'Area' : 'Line',
                    state.fillMode ? '▲' : '📉',
                    () => onStateChange({ fillMode: !state.fillMode }),
                    state.fillMode,
                    !hasData,
                    'Toggle area fill under curves'
                )}
                {toolbarBtn(
                    state.logScale ? 'Log' : 'Linear',
                    state.logScale ? '📐' : '📏',
                    () => onStateChange({ logScale: !state.logScale }),
                    state.logScale,
                    !hasData,
                    state.logScale ? 'Switch to linear scale' : 'Switch to logarithmic Y scale'
                )}
            </div>

            <div className="toolbar-divider" />

            {/* Export */}
            <div className="toolbar-group">
                <span className="toolbar-group-label">Export</span>
                {toolbarBtn('PNG', '🖼', handleDownloadPNG, false, !hasData, 'Download chart as PNG')}
            </div>
        </div>
    );
};

export default ChartToolbar;
