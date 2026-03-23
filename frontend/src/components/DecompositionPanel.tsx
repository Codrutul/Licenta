import React, { useState, useRef, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DecompositionResult } from '../services/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface DecompositionPanelProps {
    dates: string[];
    decomposition: DecompositionResult | null;
    loading: boolean;
    crosshairLabel?: string | null;
}

const miniOptions = (label: string, color: string): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600 },
    plugins: {
        legend: { display: false },
        title: {
            display: true,
            text: label,
            color: '#9BA3B8',
            font: { size: 11, weight: 500 as const },
            padding: { bottom: 4 },
        },
        tooltip: {
            backgroundColor: 'rgba(18, 24, 41, 0.95)',
            titleColor: '#FFFFFF',
            bodyColor: '#9BA3B8',
            borderColor: color,
            borderWidth: 1,
            padding: 8,
            callbacks: {
                label: (ctx) => ctx.parsed.y !== null ? ctx.parsed.y.toFixed(3) : 'N/A',
            },
        },
    },
    scales: {
        x: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: { color: '#6B7280', maxTicksLimit: 8, autoSkip: true, maxRotation: 0 },
        },
        y: {
            grid: { color: 'rgba(255,255,255,0.04)' },
            ticks: {
                color: '#6B7280', maxTicksLimit: 5,
                callback: (v) => typeof v === 'number' ? v.toFixed(1) : v
            },
        },
    },
});

const DecompositionPanel: React.FC<DecompositionPanelProps> = ({
    dates,
    decomposition,
    loading,
    crosshairLabel,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const trendRef = useRef<ChartJS<'line'>>(null);
    const seasonalRef = useRef<ChartJS<'line'>>(null);
    const residualRef = useRef<ChartJS<'line'>>(null);

    // Sync crosshair from main chart
    useEffect(() => {
        if (!crosshairLabel || !isExpanded || !decomposition) return;
        const idx = dates.indexOf(crosshairLabel);
        if (idx === -1) return;

        [trendRef, seasonalRef, residualRef].forEach(ref => {
            const chart = ref.current;
            if (!chart) return;
            // Simulate tooltip at crosshair position
            const meta = chart.getDatasetMeta(0);
            const point = meta.data[idx];
            if (point) {
                (chart as any).tooltip.setActiveElements(
                    [{ datasetIndex: 0, index: idx }],
                    { x: point.x, y: point.y }
                );
                chart.update('none');
            }
        });
    }, [crosshairLabel, isExpanded, decomposition, dates]);

    if (!decomposition && !loading) return null;

    const buildDataset = (values: (number | null)[], color: string, fill = false) => ({
        label: '',
        data: values,
        borderColor: color,
        backgroundColor: fill ? `${color}22` : 'transparent',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 3,
        tension: 0.3,
        fill,
        spanGaps: true,
    });

    return (
        <div className="decomposition-panel">
            <button
                className="decomposition-toggle"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <span className="decomp-toggle-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
                        <path d="M3 3v18h18" />
                        <polyline points="7 8 11 13 15 10 19 16" />
                    </svg>
                </span>
                <span>Time Series Decomposition</span>
                <span className="decomp-toggle-badge">
                    {decomposition ? `Period: ${decomposition.period}` : ''}
                </span>
                {crosshairLabel && isExpanded && (
                    <span className="decomp-crosshair-label">
                        x = {crosshairLabel}
                    </span>
                )}
                <span className="decomp-chevron">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
                <div className="decomposition-charts">
                    {loading && (
                        <div className="decomp-loading">
                            <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                            <span>Decomposing...</span>
                        </div>
                    )}
                    {decomposition && !loading && (
                        <>
                            <div className="decomp-chart-wrapper">
                                <Line ref={trendRef}
                                    data={{ labels: dates, datasets: [buildDataset(decomposition.trend, '#4F7FFF', true)] }}
                                    options={miniOptions('Trend', '#4F7FFF')}
                                />
                            </div>
                            <div className="decomp-chart-wrapper">
                                <Line ref={seasonalRef}
                                    data={{ labels: dates, datasets: [buildDataset(decomposition.seasonal, '#10B981')] }}
                                    options={miniOptions('Seasonal', '#10B981')}
                                />
                            </div>
                            <div className="decomp-chart-wrapper">
                                <Line ref={residualRef}
                                    data={{ labels: dates, datasets: [buildDataset(decomposition.residual, '#F59E0B')] }}
                                    options={miniOptions('Residual', '#F59E0B')}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default DecompositionPanel;
