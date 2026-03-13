import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ChartOptions,
    type ChartDataset,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import type { ForecastResult } from '../services/api';
import type { Annotation } from './AnnotationsPanel';
import { type ComparisonEntry } from './ComparisonControls';
import ChartToolbar, { type ToolbarState } from './ChartToolbar';

ChartJS.register(
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    zoomPlugin,
    annotationPlugin,
);

// Utility: detect outliers beyond ±2σ
function detectOutliers(values: number[]): Set<number> {
    if (values.length < 4) return new Set();
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    const threshold = 2 * stdDev;
    const outliers = new Set<number>();
    values.forEach((v, i) => {
        if (Math.abs(v - mean) > threshold) outliers.add(i);
    });
    return outliers;
}

interface ForecastChartProps {
    dates: string[];
    actualValues: number[];
    forecastResult: ForecastResult | null;
    comparisons: ComparisonEntry[];
    periods: number;
    futureDates: string[];
    annotations: Annotation[];
    onCrosshairMove?: (xLabel: string | null) => void;
}

export const DEFAULT_TOOLBAR: ToolbarState = {
    showActual: true,
    showForecast: true,
    showFitted: true,
    showCI: true,
    fillMode: true,
    panEnabled: false,
    logScale: false,
    showOutliers: true,
    comparisonEnabled: true,
    showAnnotations: true,
};

const ForecastChart: React.FC<ForecastChartProps> = ({
    dates,
    actualValues,
    forecastResult,
    comparisons,
    periods,
    futureDates,
    annotations,
    onCrosshairMove,
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [toolbar, setToolbar] = useState<ToolbarState>(DEFAULT_TOOLBAR);
    const chartRef = useRef<ChartJS<'line'>>(null);
    const fullscreenChartRef = useRef<ChartJS<'line'>>(null);

    const updateToolbar = (updates: Partial<ToolbarState>) =>
        setToolbar(prev => ({ ...prev, ...updates }));

    // Escape to exit fullscreen
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
        };
        document.body.style.overflow = isFullscreen ? 'hidden' : '';
        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    // Apply dataset visibility from toolbar
    useEffect(() => {
        const chart = isFullscreen ? fullscreenChartRef.current : chartRef.current;
        if (!chart) return;

        const visibilityMap: Record<string, boolean | undefined> = {
            'Actual': toolbar.showActual,
            'Forecast': toolbar.showForecast,
            'Fitted': toolbar.showFitted,
            'CI Upper': toolbar.showCI,
            'CI Lower': toolbar.showCI,
        };

        chart.data.datasets.forEach((ds, i) => {
            const meta = chart.getDatasetMeta(i);
            const label = ds.label ?? '';
            if (label in visibilityMap) {
                meta.hidden = !visibilityMap[label];
            }
            // comparison entries start with 'cmp:'
            if (label.startsWith('cmp:')) {
                meta.hidden = !toolbar.comparisonEnabled;
            }
        });

        // Update fill dynamically
        chart.data.datasets.forEach(ds => {
            if (ds.label === 'Actual' || ds.label === 'Forecast') {
                (ds as any).fill = toolbar.fillMode;
            }
        });

        chart.update('none');
    }, [toolbar, isFullscreen]);

    // Outlier detection on actual values
    const outlierSet = detectOutliers(actualValues);

    // All labels (history + future)
    const allDates = [...dates, ...futureDates];

    // Dataset: Actual (with outlier point styling)
    const actualPointColors = actualValues.map((_, i) =>
        toolbar.showOutliers && outlierSet.has(i) ? '#EF4444' : '#4F7FFF'
    );
    const actualPointSizes = actualValues.map((_, i) =>
        toolbar.showOutliers && outlierSet.has(i) ? 7 : (actualValues.length > 100 ? 0 : 3)
    );

    const actualData = [...actualValues, ...Array(periods).fill(null)];

    // Dataset: Forecast
    const forecastData = actualValues.length > 0
        ? [
            ...Array(actualValues.length - 1).fill(null),
            actualValues[actualValues.length - 1],
            ...(forecastResult?.forecast || Array(periods).fill(null)),
        ]
        : [];

    // Dataset: Fitted values
    const fittedData = forecastResult?.fittedValues
        ? [
            ...Array(actualValues.length - forecastResult.fittedValues.length).fill(null),
            ...forecastResult.fittedValues,
            ...Array(periods).fill(null),
        ]
        : [];

    // Dataset: CI upper/lower
    const ciUpperData = forecastResult?.confidenceIntervals
        ? [
            ...Array(actualValues.length - 1).fill(null),
            actualValues[actualValues.length - 1],
            ...forecastResult.confidenceIntervals.upper,
        ]
        : [];
    const ciLowerData = forecastResult?.confidenceIntervals
        ? [
            ...Array(actualValues.length - 1).fill(null),
            actualValues[actualValues.length - 1],
            ...forecastResult.confidenceIntervals.lower,
        ]
        : [];

    // Dataset: Comparison models (one per entry)
    const comparisonDatasets = comparisons.map(c => {
        const data = actualValues.length > 0
            ? [
                ...Array(actualValues.length - 1).fill(null),
                actualValues[actualValues.length - 1],
                ...c.result.forecast,
            ]
            : [];
        return { entry: c, data };
    });

    const hasComparisons = comparisons.length > 0;

    const hasForecast = !!forecastResult;
    const hasFitted = fittedData.some(v => v !== null);
    const hasCI = ciUpperData.some(v => v !== null);
    const hasAnnotations = annotations.length > 0;
    const hasOutliers = outlierSet.size > 0;

    // Build annotation plugin config
    const buildAnnotations = () => {
        if (!toolbar.showAnnotations || !hasAnnotations) return {};
        const annConfig: Record<string, any> = {};
        annotations.forEach(ann => {
            annConfig[ann.id] = {
                type: 'line',
                xMin: ann.date,
                xMax: ann.date,
                borderColor: ann.color,
                borderWidth: 2,
                borderDash: [5, 4],
                label: {
                    display: true,
                    content: ann.label,
                    position: 'start',
                    backgroundColor: ann.color + 'cc',
                    color: '#fff',
                    font: { size: 11 },
                    padding: { x: 6, y: 3 },
                    rotation: -90,
                    xAdjust: 8,
                },
            };
        });
        return annConfig;
    };

    const datasets: ChartDataset<'line'>[] = [
        // CI bands
        ...(hasCI ? [
            {
                label: 'CI Lower',
                data: ciLowerData,
                borderColor: 'rgba(167, 139, 250, 0)',
                backgroundColor: 'rgba(167, 139, 250, 0.12)',
                borderWidth: 0,
                pointRadius: 0,
                tension: 0.4,
                fill: false,
                spanGaps: true,
                hidden: !toolbar.showCI,
            } as any,
            {
                label: 'CI Upper',
                data: ciUpperData,
                borderColor: 'rgba(167, 139, 250, 0.3)',
                backgroundColor: 'rgba(167, 139, 250, 0.12)',
                borderWidth: 1,
                borderDash: [3, 3],
                pointRadius: 0,
                tension: 0.4,
                fill: '-1',
                spanGaps: true,
                hidden: !toolbar.showCI,
            } as any,
        ] : []),
        // Fitted values
        ...(hasFitted ? [
            {
                label: 'Fitted',
                data: fittedData,
                borderColor: 'rgba(156, 163, 184, 0.6)',
                backgroundColor: 'transparent',
                borderWidth: 1.5,
                borderDash: [4, 4],
                pointRadius: 0,
                tension: 0.3,
                fill: false,
                spanGaps: true,
                hidden: !toolbar.showFitted,
            } as any,
        ] : []),
        // Actual
        {
            label: 'Actual',
            data: actualData,
            borderColor: '#4F7FFF',
            backgroundColor: 'rgba(79, 127, 255, 0.1)',
            borderWidth: 2.5,
            pointRadius: actualPointSizes,
            pointHoverRadius: 6,
            pointBackgroundColor: actualPointColors,
            pointBorderColor: actualValues.map((_: number, i: number) =>
                toolbar.showOutliers && outlierSet.has(i) ? '#fff' : '#fff'),
            pointBorderWidth: 1.5,
            tension: 0.4,
            fill: toolbar.fillMode,
            spanGaps: false,
            hidden: !toolbar.showActual,
        } as any,
        // Forecast
        {
            label: 'Forecast',
            data: forecastData,
            borderColor: '#A78BFA',
            backgroundColor: 'rgba(167, 139, 250, 0.08)',
            borderWidth: 2.5,
            borderDash: [8, 4],
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#A78BFA',
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            tension: 0.4,
            fill: toolbar.fillMode,
            spanGaps: true,
            hidden: !toolbar.showForecast,
        } as any,
        // Comparison models
        ...comparisonDatasets.map(({ entry, data }) => ({
            label: `cmp:${entry.id}`,
            data,
            borderColor: entry.color,
            backgroundColor: entry.color + '10',
            borderWidth: 2.5,
            borderDash: [6, 3],
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: entry.color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5,
            tension: 0.4,
            fill: false,
            spanGaps: true,
            hidden: !toolbar.comparisonEnabled,
        } as any)),
    ];

    const buildOptions = useCallback((inFullscreen: boolean): ChartOptions<'line'> => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 700,
            easing: 'easeInOutQuart',
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        onHover: onCrosshairMove ? (_event, _elements, chart) => {
            // Emit hovered x label for sync
            const tooltip = (chart as any).tooltip;
            if (tooltip && tooltip.dataPoints && tooltip.dataPoints.length > 0) {
                onCrosshairMove(tooltip.dataPoints[0].label);
            }
        } : undefined,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(18, 24, 41, 0.95)',
                titleColor: '#FFFFFF',
                bodyColor: '#9BA3B8',
                borderColor: 'rgba(79, 127, 255, 0.3)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                filter: (item) => item.parsed.y !== null,
                callbacks: {
                    label: (context) => {
                        if (context.parsed.y == null) return '';
                        const label = context.dataset.label || '';
                        if (label === 'CI Upper') return `upper bound: ${context.parsed.y.toFixed(2)}`;
                        if (label === 'CI Lower') return `lower bound: ${context.parsed.y.toFixed(2)}`;
                        const isOutlier = label === 'Actual' && outlierSet.has(context.dataIndex);
                        if (label.startsWith('cmp:')) {
                            const entry = comparisons.find(c => `cmp:${c.id}` === label);
                            return `${entry?.label ?? label}: ${context.parsed.y.toFixed(2)}`;
                        }
                        return `${label}: ${context.parsed.y.toFixed(2)}${isOutlier ? ' ⚠ outlier' : ''}`;
                    },
                },
            },
            zoom: {
                zoom: {
                    wheel: { enabled: true, speed: 0.08 },
                    pinch: { enabled: true },
                    mode: 'x',
                    onZoomComplete: ({ chart }) => chart.update('none'),
                },
                pan: {
                    enabled: toolbar.panEnabled,
                    mode: 'x',
                },
                limits: {
                    x: { min: 'original', max: 'original' },
                    y: { min: 'original', max: 'original' as any },
                },
            },
            annotation: {
                annotations: buildAnnotations(),
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                    color: '#9BA3B8',
                    maxRotation: 45,
                    autoSkip: true,
                    maxTicksLimit: inFullscreen ? 20 : 12,
                },
            },
            y: {
                type: toolbar.logScale ? 'logarithmic' : 'linear',
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: {
                    color: '#9BA3B8',
                    callback: (value) =>
                        typeof value === 'number' ? value.toFixed(0) : value,
                },
            },
        },
    }), [toolbar, outlierSet, annotations, onCrosshairMove]);

    const renderChart = (inFullscreen: boolean) => {
        const activeRef = inFullscreen ? fullscreenChartRef : chartRef;
        return (
            <>
                <div className="chart-header">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                        <button
                            className="fullscreen-btn"
                            onClick={() => setIsFullscreen(!inFullscreen)}
                            title={inFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
                        >
                            {inFullscreen ? '✕' : '⛶'}
                        </button>
                        <div>
                            <h2 className="chart-title">
                                {forecastResult ? `${forecastResult.method} Results` : 'Time Series Data'}
                                {comparisons.length > 0 && toolbar.comparisonEnabled &&
                                    <span className="chart-comparison-badge">
                                        vs {comparisons.map(c => c.label).join(', ')}
                                    </span>
                                }
                            </h2>
                            <p className="chart-subtitle">
                                {forecastResult
                                    ? `Visualizing ${actualValues.length} historical points and ${periods} projected steps`
                                    : 'Upload data and select a model to begin forecasting'}
                                {toolbar.logScale && ' · Log scale'}
                                {hasOutliers && toolbar.showOutliers && ` · ${outlierSet.size} outlier${outlierSet.size > 1 ? 's' : ''} detected`}
                            </p>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="chart-legend">
                        <div className="legend-item">
                            <span className="legend-dot actual" />
                            <span>Actual</span>
                        </div>
                        {hasForecast && <div className="legend-item">
                            <span className="legend-dot forecast" />
                            <span>Forecast</span>
                        </div>}
                        {hasFitted && <div className="legend-item">
                            <span className="legend-dot fitted" />
                            <span>Fitted</span>
                        </div>}
                        {hasCI && <div className="legend-item">
                            <span className="legend-dot ci" />
                            <span>95% CI</span>
                        </div>}
                        {hasComparisons && toolbar.comparisonEnabled && comparisons.map(c => (
                            <div key={c.id} className="legend-item">
                                <span className="legend-dot" style={{ background: c.color }} />
                                <span>{c.label}</span>
                            </div>
                        ))}
                        {hasOutliers && toolbar.showOutliers && <div className="legend-item">
                            <span className="legend-dot outlier" />
                            <span>Outlier</span>
                        </div>}
                    </div>
                </div>

                <ChartToolbar
                    chartRef={activeRef as any}
                    state={toolbar}
                    onStateChange={updateToolbar}
                    hasData={actualValues.length > 0}
                    hasForecast={hasForecast}
                    hasFitted={hasFitted}
                    hasCI={hasCI}
                    hasComparison={hasComparisons}
                    hasAnnotations={hasAnnotations}
                    hasOutliers={hasOutliers}
                />

                <div
                    className="chart-wrapper"
                    style={inFullscreen ? { height: 'calc(100vh - 200px)' } : undefined}
                >
                    {actualValues.length > 0 ? (
                        <Line
                            ref={activeRef as any}
                            data={{ labels: allDates, datasets }}
                            options={buildOptions(inFullscreen)}
                        />
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">📊</div>
                            <h3>No Data Yet</h3>
                            <p>Upload a CSV file to visualize your time series data</p>
                        </div>
                    )}
                </div>
            </>
        );
    };

    return (
        <>
            <div className="chart-container">{renderChart(false)}</div>
            {isFullscreen && (
                <div className="fullscreen-modal" onClick={() => setIsFullscreen(false)}>
                    <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
                        {renderChart(true)}
                    </div>
                </div>
            )}
        </>
    );
};

export default ForecastChart;
