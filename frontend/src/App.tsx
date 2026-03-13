import { useState, useCallback } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ForecastControls from './components/ForecastControls';
import ForecastChart from './components/ForecastChart';
import QuickStats from './components/QuickStats';
import AIAnalysis from './components/AIAnalysis';
import DecompositionPanel from './components/DecompositionPanel';
import DataTable from './components/DataTable';
import AnnotationsPanel, { type Annotation } from './components/AnnotationsPanel';

import ComparisonControls, { type ComparisonEntry } from './components/ComparisonControls';
import {
    uploadCSV,
    calculateForecast,
    decompose,
    type TimeSeriesData,
    type ForecastResult,
    type DecompositionResult,
} from './services/api';

// ---------------------------------------------------------------------------
// Tiny hook: useState that persists to sessionStorage across page refreshes
// ---------------------------------------------------------------------------
function useSessionState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const stored = sessionStorage.getItem(key);
            return stored !== null ? (JSON.parse(stored) as T) : initial;
        } catch {
            return initial;
        }
    });

    const setAndPersist: React.Dispatch<React.SetStateAction<T>> = (action) => {
        setState(prev => {
            const next = typeof action === 'function'
                ? (action as (prev: T) => T)(prev)
                : action;
            try {
                sessionStorage.setItem(key, JSON.stringify(next));
            } catch {
                // Quota exceeded or private-mode restriction — silently ignore
            }
            return next;
        });
    };

    return [state, setAndPersist];
}

function App() {
    // Core state — backed by sessionStorage for refresh persistence
    const [timeSeriesData, setTimeSeriesData] = useSessionState<TimeSeriesData | null>('ts_data', null);
    const [forecastResult, setForecastResult] = useSessionState<ForecastResult | null>('ts_forecast', null);
    const [decomposition, setDecomposition] = useSessionState<DecompositionResult | null>('ts_decomposition', null);

    // Model selection — persisted so the panel restores as-is after refresh
    const [selectedModel, setSelectedModel] = useSessionState<string>('ts_model', 'moving_average');
    const [forecastPeriods, setForecastPeriods] = useSessionState<number>('ts_periods', 6);
    const [modelParameters, setModelParameters] = useSessionState<Record<string, any>>('ts_params', {});

    // Comparison models — persisted (results are stored inline in each entry)
    const [comparisons, setComparisons] = useSessionState<ComparisonEntry[]>('ts_comparisons', []);
    const [comparisonLoading, setComparisonLoading] = useState(false);

    // Annotations — persisted
    const [annotations, setAnnotations] = useSessionState<Annotation[]>('ts_annotations', []);

    // Crosshair sync (ephemeral — no need to persist)
    const [crosshairLabel, setCrosshairLabel] = useState<string | null>(null);

    // Loading / error (always transient)
    const [uploadLoading, setUploadLoading] = useState(false);
    const [calculateLoading, setCalculateLoading] = useState(false);
    const [decomposeLoading, setDecomposeLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sidebar tab
    const [sidebarTab, setSidebarTab] = useState<'stats' | 'table'>('stats');


    // Generate future dates
    const generateFutureDates = useCallback((lastDate: string, count: number): string[] => {
        const result: string[] = [];
        const date = new Date(lastDate);
        for (let i = 1; i <= count; i++) {
            const d = new Date(date);
            d.setDate(d.getDate() + i);
            result.push(d.toISOString().split('T')[0]);
        }
        return result;
    }, []);

    const futureDates = timeSeriesData && forecastResult
        ? generateFutureDates(timeSeriesData.dates[timeSeriesData.dates.length - 1], forecastPeriods)
        : [];

    const handleFileUpload = async (file: File) => {
        setUploadLoading(true);
        setError(null);
        setForecastResult(null);
        setComparisons([]);
        setDecomposition(null);
        setAnnotations([]);

        try {
            const data = await uploadCSV(file);
            setTimeSeriesData(data);

            if (data.values.length >= 8) {
                setDecomposeLoading(true);
                try {
                    const dec = await decompose(data.values);
                    setDecomposition(dec);
                } catch {
                    // non-critical
                } finally {
                    setDecomposeLoading(false);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to upload file');
        } finally {
            setUploadLoading(false);
        }
    };

    const handleCalculateForecast = async () => {
        if (!timeSeriesData) return;
        setCalculateLoading(true);
        setError(null);
        setComparisons([]);
        try {
            const result = await calculateForecast(
                timeSeriesData.values,
                selectedModel,
                forecastPeriods,
                modelParameters
            );
            setForecastResult(result);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to calculate forecast');
        } finally {
            setCalculateLoading(false);
        }
    };

    const handleModelChange = (model: string) => {
        setSelectedModel(model);
        setModelParameters({});
        setComparisons([]);
    };

    const handleCompare = async (model: string, parameters: Record<string, any>, color: string) => {
        if (!timeSeriesData) return;
        setComparisonLoading(true);
        try {
            const result = await calculateForecast(timeSeriesData.values, model, forecastPeriods, parameters);
            const entry: ComparisonEntry = {
                id: `cmp_${Date.now()}`,
                model,
                label: result.method,
                color,
                result,
            };
            setComparisons(prev => [...prev, entry]);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Comparison failed');
        } finally {
            setComparisonLoading(false);
        }
    };

    const handleRemoveComparison = (id: string) => {
        setComparisons(prev => prev.filter(c => c.id !== id));
    };

    const handleClearComparisons = () => setComparisons([]);

    const handleExportCSV = () => {
        if (!forecastResult || !timeSeriesData) return;
        const rows: string[] = ['Index,Date,Value,Type'];
        timeSeriesData.data.forEach((d, i) => rows.push(`${i + 1},${d.date},${d.value.toFixed(4)},Actual`));
        const lastDate = timeSeriesData.dates[timeSeriesData.dates.length - 1];
        const fDates = generateFutureDates(lastDate, forecastPeriods);
        forecastResult.forecast.forEach((v, i) => {
            rows.push(`${timeSeriesData.data.length + i + 1},${fDates[i] ?? ''},${v.toFixed(4)},Forecast`);
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forecast_${selectedModel}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportJSON = () => {
        if (!forecastResult || !timeSeriesData) return;
        const exportData = {
            model: forecastResult.method,
            parameters: forecastResult.parameters,
            historical_data: timeSeriesData.data,
            forecast: forecastResult.forecast,
            confidence_intervals: forecastResult.confidenceIntervals,
            statistics: timeSeriesData.statistics,
            accuracy: forecastResult.accuracy,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `forecast_${selectedModel}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="app-logo">📈</div>
                <h1>Forecast Engine — Bachelor's Thesis · Afloarei Codrin</h1>
            </header>

            <main>
                {/* Control panel */}
                <div className="control-panel">
                    <FileUpload onFileUpload={handleFileUpload} loading={uploadLoading} />

                    {timeSeriesData && (
                        <>
                            <ForecastControls
                                model={selectedModel}
                                periods={forecastPeriods}
                                parameters={modelParameters}
                                onModelChange={handleModelChange}
                                onPeriodsChange={setForecastPeriods}
                                onParametersChange={setModelParameters}
                                onCalculate={handleCalculateForecast}
                                disabled={!timeSeriesData || uploadLoading}
                                loading={calculateLoading}
                            />
                            {forecastResult && (
                                <div className="export-group">
                                    <span className="export-label">Export</span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-secondary" onClick={handleExportCSV}>
                                            <span className="btn-icon">📋</span><span>CSV</span>
                                        </button>
                                        <button className="btn btn-secondary" onClick={handleExportJSON}>
                                            <span className="btn-icon">💾</span><span>JSON</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {error && <div className="error-banner">❌ {error}</div>}

                <div className="main-content">
                    {/* Left: Chart + tools */}
                    <div className="chart-column">
                        <ForecastChart
                            dates={timeSeriesData?.dates || []}
                            actualValues={timeSeriesData?.values || []}
                            forecastResult={forecastResult}
                            comparisons={comparisons}
                            periods={forecastPeriods}
                            futureDates={futureDates}
                            annotations={annotations}
                            onCrosshairMove={setCrosshairLabel}
                        />

                        {/* Decomposition */}
                        {timeSeriesData && (
                            <DecompositionPanel
                                dates={timeSeriesData.dates}
                                decomposition={decomposition}
                                loading={decomposeLoading}
                                crosshairLabel={crosshairLabel}
                            />
                        )}

                        {/* Annotations */}
                        {timeSeriesData && (
                            <AnnotationsPanel
                                dates={timeSeriesData.dates}
                                annotations={annotations}
                                onAnnotationsChange={setAnnotations}
                            />
                        )}

                        {/* Comparison controls */}
                        {timeSeriesData && forecastResult && (
                            <ComparisonControls
                                primaryModel={selectedModel}
                                comparisons={comparisons}
                                onCompare={handleCompare}
                                onRemove={handleRemoveComparison}
                                onClearAll={handleClearComparisons}
                                loading={comparisonLoading}
                                disabled={!timeSeriesData || uploadLoading}
                            />
                        )}
                    </div>

                    {/* Right sidebar */}
                    <div className="sidebar">
                        <div className="sidebar-tabs">
                            <button
                                className={`sidebar-tab${sidebarTab === 'stats' ? ' sidebar-tab--active' : ''}`}
                                onClick={() => setSidebarTab('stats')}
                            >
                                📊 Statistics
                            </button>
                            <button
                                className={`sidebar-tab${sidebarTab === 'table' ? ' sidebar-tab--active' : ''}`}
                                onClick={() => setSidebarTab('table')}
                            >
                                📋 Data Table
                            </button>
                        </div>

                        {sidebarTab === 'stats' && (
                            <>
                                <QuickStats forecastResult={forecastResult} timeSeriesData={timeSeriesData} />
                                <AIAnalysis />
                            </>
                        )}
                        {sidebarTab === 'table' && (
                            <DataTable
                                timeSeriesData={timeSeriesData}
                                forecastResult={forecastResult}
                                futureDates={futureDates}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
