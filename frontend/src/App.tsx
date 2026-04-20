import { useState, useCallback } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ForecastControls from './components/ForecastControls';
import ForecastChart from './components/ForecastChart';
import QuickStats from './components/QuickStats';
import AIAnalysisPanel from './components/AIAnalysisPanel';
import DecompositionPanel from './components/DecompositionPanel';
import DataTable from './components/DataTable';
import AnnotationsPanel, { type Annotation } from './components/AnnotationsPanel';
import ComparisonControls, { type ComparisonEntry } from './components/ComparisonControls';
import ChangePointPanel from './components/ChangePointPanel';
import SampleDatasets from './components/SampleDatasets';
import {
    uploadCSV,
    calculateForecast,
    decompose,
    detectChangePoints,
    runSegmentForecast,
    type TimeSeriesData,
    type ForecastResult,
    type DecompositionResult,
    type ChangePointResult,
    type SegmentForecastResult,
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

    // Change-point detection — persisted
    const [cpResult, setCpResult] = useSessionState<ChangePointResult | null>('ts_cp_result', null);
    const [segmentForecastResult, setSegmentForecastResult] = useSessionState<SegmentForecastResult | null>('ts_seg_forecast', null);
    const [cpLoading, setCpLoading] = useState(false);

    // Sidebar tab
    const [sidebarTab, setSidebarTab] = useState<'ai' | 'stats' | 'table'>('ai');


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
        setCpResult(null);
        setSegmentForecastResult(null);

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
    const handleClearData = () => {
        setTimeSeriesData(null);
        setForecastResult(null);
        setComparisons([]);
        setDecomposition(null);
        setAnnotations([]);
        setCpResult(null);
        setSegmentForecastResult(null);
        setError(null);
    };

    const handleCalculateForecast = async () => {
        if (!timeSeriesData) return;
        setCalculateLoading(true);
        setError(null);
        setComparisons([]);
        setSegmentForecastResult(null); // Clear segment forecast when recalculating global forecast
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

    // ── Change-point handlers ──────────────────────────────────────────────────
    const handleDetectChangePoints = async (penaltyMultiplier: number) => {
        if (!timeSeriesData) return;
        setCpLoading(true);
        setError(null);
        setSegmentForecastResult(null);
        try {
            // Send the raw multiplier — the backend PELT will apply it as:
            // beta = penaltyMultiplier × log(n) × σ²
            const result = await detectChangePoints(timeSeriesData.values, timeSeriesData.dates, penaltyMultiplier);
            setCpResult(result);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Change-point detection failed');
        } finally {
            setCpLoading(false);
        }
    };


    const handleSegmentForecast = async () => {
        if (!timeSeriesData || !cpResult) return;
        setCpLoading(true);
        setError(null);
        try {
            const result = await runSegmentForecast(
                timeSeriesData.values,
                timeSeriesData.dates,
                cpResult.changePoints,
                selectedModel,
                forecastPeriods,
                modelParameters
            );
            setSegmentForecastResult(result);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Segment forecast failed');
        } finally {
            setCpLoading(false);
        }
    };

    const handleClearChangePoints = () => {
        setCpResult(null);
        setSegmentForecastResult(null);
    };

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
        const modelLabel = selectedModel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/ /g, '_');
        a.download = `forecast_${modelLabel}_${new Date().toISOString().split('T')[0]}.csv`;
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
        const modelLabel = selectedModel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()).replace(/ /g, '_');
        a.download = `forecast_${modelLabel}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="app-logo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
                        <path d="M3 3v18h18" />
                        <polyline points="7 14 11 9 14 12 19 6" />
                    </svg>
                </div>
                <div className="app-header-text">
                    <h1>Forecast Engine — Bachelor's Thesis · Afloarei Codrin</h1>
                    <span className="app-header-subtitle">Time Series Analysis &amp; Forecasting</span>
                </div>
            </header>

            <main>
                {/* Control panel */}
                <div className="control-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {timeSeriesData && (
                            <button 
                                className="btn btn-secondary" 
                                onClick={handleClearData}
                                title="Clear imported data and reset application"
                                style={{ height: '36px', padding: '0 0.5rem' }}
                            >
                                <span className="btn-icon" style={{ margin: 0 }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                    </svg>
                                </span>
                            </button>
                        )}
                        <FileUpload onFileUpload={handleFileUpload} loading={uploadLoading} />
                        <SampleDatasets onLoad={handleFileUpload} loading={uploadLoading} />
                        {timeSeriesData && (
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
                                forecastMethodLabel={forecastResult?.method}
                            />
                        )}
                        {forecastResult && (
                            <>
                                <button className="btn btn-secondary" onClick={handleExportCSV} title="Export forecast as CSV">
                                    <span className="btn-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="16" y1="13" x2="8" y2="13" />
                                            <line x1="16" y1="17" x2="8" y2="17" />
                                            <polyline points="10 9 9 9 8 9" />
                                        </svg>
                                    </span>
                                    <span>Export CSV</span>
                                </button>
                                <button className="btn btn-secondary" onClick={handleExportJSON} title="Export forecast as JSON">
                                    <span className="btn-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                            <line x1="12" y1="18" x2="12" y2="12" />
                                            <line x1="9" y1="15" x2="15" y2="15" />
                                        </svg>
                                    </span>
                                    <span>Export JSON</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {error && <div className="error-banner">Error: {error}</div>}

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
                            changePoints={cpResult?.changePoints || []}
                            segmentForecastResult={segmentForecastResult}
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

                        {/* Change-point detection */}
                        <ChangePointPanel
                            hasData={!!timeSeriesData}
                            currentModel={selectedModel}
                            cpResult={cpResult}
                            segmentResult={segmentForecastResult}
                            onDetect={handleDetectChangePoints}
                            onSegmentForecast={handleSegmentForecast}
                            onClear={handleClearChangePoints}
                            loading={cpLoading}
                            hasGlobalForecast={!!forecastResult}
                        />
                    </div>

                    {/* Right sidebar */}
                    <div className="sidebar">
                        <div className="sidebar-tabs">
                            <button
                                className={`sidebar-tab${sidebarTab === 'ai' ? ' sidebar-tab--active' : ''}`}
                                onClick={() => setSidebarTab('ai')}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: sidebarTab === 'ai' ? '#4F7FFF' : '' }}
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                AI Analyst
                            </button>
                            <button
                                className={`sidebar-tab${sidebarTab === 'stats' ? ' sidebar-tab--active' : ''}`}
                                onClick={() => setSidebarTab('stats')}
                            >
                                Stats
                            </button>
                            <button
                                className={`sidebar-tab${sidebarTab === 'table' ? ' sidebar-tab--active' : ''}`}
                                onClick={() => setSidebarTab('table')}
                            >
                                Data Table
                            </button>
                        </div>

                        {sidebarTab === 'ai' && (
                            <div className="ai-tab-content">
                                <AIAnalysisPanel 
                                    dataLength={timeSeriesData?.values.length || 0}
                                    latestActualValue={timeSeriesData ? timeSeriesData.values[timeSeriesData.values.length - 1] : null}
                                    hasChangePointsResult={!!cpResult}
                                    numberOfChangePoints={cpResult?.changePoints.length || 0}
                                    changePointDates={cpResult?.segments.slice(0, -1).map(s => s.endDate) || []}
                                    selectedModel={selectedModel}
                                    globalRMSE={forecastResult?.accuracy?.rmse || null}
                                    globalForecastEnd={forecastResult?.forecast ? forecastResult.forecast[forecastResult.forecast.length - 1] : null}
                                    segmentRMSE={segmentForecastResult?.segments?.[segmentForecastResult.segments.length - 1]?.accuracy?.rmse || null}
                                    segmentForecastEnd={segmentForecastResult?.forecast ? segmentForecastResult.forecast[segmentForecastResult.forecast.length - 1] : null}
                                    segmentGrowthRate={segmentForecastResult?.stats?.growthRate || null}
                                />
                            </div>
                        )}
                        {sidebarTab === 'stats' && (
                            <QuickStats forecastResult={forecastResult} timeSeriesData={timeSeriesData} />
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
