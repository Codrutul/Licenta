import React, { useRef, useState, useEffect } from 'react';
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
import zoomPlugin from 'chartjs-plugin-zoom';
import type { ForecastResult } from '../services/api';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    zoomPlugin
);

interface ForecastChartProps {
    dates: string[];
    actualValues: number[];
    forecastResult: ForecastResult | null;
    periods: number;
}

const ForecastChart: React.FC<ForecastChartProps> = ({
    dates,
    actualValues,
    forecastResult,
    periods,
}) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const chartRef = useRef<ChartJS<'line'>>(null);

    // Handle escape key to close fullscreen and manage body scroll
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };

        // Disable body scroll when fullscreen is active
        if (isFullscreen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isFullscreen]);

    // Generate future dates
    const generateFutureDates = (lastDate: string, count: number): string[] => {
        const futureDates: string[] = [];
        const date = new Date(lastDate);

        for (let i = 1; i <= count; i++) {
            const newDate = new Date(date);
            newDate.setDate(date.getDate() + i);
            futureDates.push(newDate.toISOString().split('T')[0]);
        }

        return futureDates;
    };

    const futureDates = dates.length > 0
        ? generateFutureDates(dates[dates.length - 1], periods)
        : [];

    const allDates = [...dates, ...futureDates];

    // Prepare chart data
    const actualData = [
        ...actualValues,
        ...Array(periods).fill(null),
    ];

    const forecastData = actualValues.length > 0
        ? [
            ...Array(actualValues.length - 1).fill(null),
            actualValues[actualValues.length - 1], // Connect to last actual value
            ...(forecastResult?.forecast || Array(periods).fill(null)),
        ]
        : [];

    const chartData = {
        labels: allDates,
        datasets: [
            {
                label: 'Actual',
                data: actualData,
                borderColor: '#4F7FFF',
                backgroundColor: 'rgba(79, 127, 255, 0.1)',
                borderWidth: 3,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#4F7FFF',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Forecast',
                data: forecastData,
                borderColor: '#A78BFA',
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                borderWidth: 3,
                borderDash: [8, 4],
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#A78BFA',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(18, 24, 41, 0.95)',
                titleColor: '#FFFFFF',
                bodyColor: '#9BA3B8',
                borderColor: 'rgba(79, 127, 255, 0.3)',
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(2);
                        }
                        return label;
                    },
                },
            },
            zoom: isFullscreen ? {
                zoom: {
                    wheel: {
                        enabled: true,
                        speed: 0.1,
                    },
                    pinch: {
                        enabled: true,
                    },
                    mode: 'xy',
                },
                pan: {
                    enabled: true,
                    mode: 'xy',
                },
                limits: {
                    x: { min: 'original', max: 'original' },
                    y: { min: 'original', max: 'original' },
                },
            } : undefined,
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawOnChartArea: true,
                },
                ticks: {
                    color: '#9BA3B8',
                    maxRotation: 45,
                    minRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 12,
                },
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                },
                ticks: {
                    color: '#9BA3B8',
                    callback: function (value) {
                        return typeof value === 'number' ? value.toFixed(0) : value;
                    },
                },
            },
        },
    };

    const renderChart = () => (
        <>
            <div className="chart-header">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                    <button
                        className="fullscreen-btn"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title={isFullscreen ? "Exit fullscreen" : "View fullscreen"}
                    >
                        {isFullscreen ? '✕' : '⛶'}
                    </button>
                    <div>
                        <h2 className="chart-title">
                            {forecastResult ? `${forecastResult.method} Results` : 'Time Series Data'}
                        </h2>
                        <p className="chart-subtitle">
                            {forecastResult
                                ? `Visualizing historical data and ${periods} projected steps`
                                : 'Upload data and select a model to begin forecasting'}
                            {isFullscreen && ' • Use mouse wheel to zoom, click and drag to pan'}
                        </p>
                    </div>
                </div>
                <div className="chart-legend">
                    <div className="legend-item">
                        <span className="legend-dot actual"></span>
                        <span>Actual</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-dot forecast"></span>
                        <span>Forecast</span>
                    </div>
                </div>
            </div>

            <div className="chart-wrapper" style={isFullscreen ? { height: 'calc(100vh - 120px)' } : undefined}>
                {actualValues.length > 0 ? (
                    <Line ref={chartRef} data={chartData} options={options} />
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

    return (
        <>
            <div className="chart-container">
                {renderChart()}
            </div>

            {isFullscreen && (
                <div className="fullscreen-modal" onClick={() => setIsFullscreen(false)}>
                    <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
                        {renderChart()}
                    </div>
                </div>
            )}
        </>
    );
};

export default ForecastChart;
