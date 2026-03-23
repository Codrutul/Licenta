import React, { useState, useEffect, useRef } from 'react';

interface ModelParameters {
    window?: number;
    alpha?: number;
    beta?: number;
    gamma?: number;
    seasonPeriod?: number;
    p?: number;
    d?: number;
    q?: number;
}

interface ForecastControlsProps {
    model: string;
    periods: number;
    parameters: ModelParameters;
    onModelChange: (model: string) => void;
    onPeriodsChange: (periods: number) => void;
    onParametersChange: (params: ModelParameters) => void;
    onCalculate: () => void;
    disabled: boolean;
    loading: boolean;
    forecastMethodLabel?: string;
}


const modelDescriptions: Record<string, string> = {
    moving_average: 'Averages recent data points to smooth out short-term fluctuations and highlight trends.',
    exponential_smoothing: 'Weighs recent observations more heavily than older ones using exponential decay.',
    holts_linear_trend: 'Extends exponential smoothing to capture both level and trend components.',
    arima: 'ARIMA(p,d,q) — Autoregressive Integrated Moving Average. Differences the series d times, fits AR(p) and MA(q) coefficients via OLS, then integrates back to the original scale.',
    holts_winters: 'Triple Exponential Smoothing — captures level, trend, and seasonal patterns. Ideal for economic data with quarterly or monthly seasonality (e.g. GDP, unemployment).',
};

const ForecastControls: React.FC<ForecastControlsProps> = ({
    model,
    periods,
    parameters,
    onModelChange,
    onPeriodsChange,
    onParametersChange,
    onCalculate,
    disabled,
    loading,
    forecastMethodLabel,
}) => {
    const [open, setOpen] = useState(false);
    const backdropRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        if (open) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const handlePeriodsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') { onPeriodsChange(0); return; }
        const parsed = parseInt(value);
        if (!isNaN(parsed)) onPeriodsChange(parsed);
    };

    const setParam = (key: keyof ModelParameters, value: number) => {
        onParametersChange({ ...parameters, [key]: value });
    };

    const renderSlider = (
        label: string,
        key: keyof ModelParameters,
        min: number,
        max: number,
        step: number,
        defaultVal: number
    ) => {
        const val = (parameters[key] as number | undefined) ?? defaultVal;
        return (
            <div className="param-row" key={key}>
                <label className="param-label">
                    <span>{label}</span>
                    <span className="param-value">{val.toFixed(step < 1 ? 2 : 0)}</span>
                </label>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={val}
                    onChange={(e) => setParam(key, parseFloat(e.target.value))}
                    className="param-slider"
                />
                <div className="param-range-labels">
                    <span>{min}</span>
                    <span>{max}</span>
                </div>
            </div>
        );
    };

    const renderSelect = (
        label: string,
        key: keyof ModelParameters,
        options: number[],
        defaultVal: number
    ) => {
        const val = (parameters[key] as number | undefined) ?? defaultVal;
        return (
            <div className="param-row" key={key}>
                <label className="param-label">
                    <span>{label}</span>
                    <span className="param-value">{val}</span>
                </label>
                <select
                    value={val}
                    onChange={(e) => setParam(key, parseInt(e.target.value))}
                    className="param-select-small"
                >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
        );
    };

    const renderParams = () => {
        switch (model) {
            case 'moving_average':
                return renderSlider('Window Size', 'window', 2, 20, 1, 3);
            case 'exponential_smoothing':
                return renderSlider('Alpha (α)', 'alpha', 0.01, 0.99, 0.01, 0.3);
            case 'holts_linear_trend':
                return (
                    <>
                        {renderSlider('Alpha (α) — Level', 'alpha', 0.01, 0.99, 0.01, 0.2)}
                        {renderSlider('Beta (β) — Trend', 'beta', 0.01, 0.99, 0.01, 0.1)}
                    </>
                );
            case 'arima':
                return (
                    <>
                        {renderSelect('AR Order (p)', 'p', [0, 1, 2, 3, 4, 5], 2)}
                        {renderSelect('Differencing (d)', 'd', [0, 1, 2], 1)}
                        {renderSelect('MA Order (q)', 'q', [0, 1, 2, 3], 1)}
                    </>
                );
            case 'holts_winters':
                return (
                    <>
                        {renderSlider('Alpha (α) — Level', 'alpha', 0.01, 0.99, 0.01, 0.3)}
                        {renderSlider('Beta (β) — Trend', 'beta', 0.01, 0.99, 0.01, 0.1)}
                        {renderSlider('Gamma (γ) — Seasonal', 'gamma', 0.01, 0.99, 0.01, 0.2)}
                        {renderSelect('Season Period', 'seasonPeriod', [0, 4, 6, 12, 24], 0)}
                    </>
                );
            default:
                return null;
        }
    };

    const handleRun = async () => {
        setOpen(false);
        onCalculate();
    };


    return (
        <>
            {/* ── Trigger button in the toolbar ── */}
            <button
                className="btn btn-primary"
                onClick={() => setOpen(true)}
                disabled={disabled || loading}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px', padding: '0.45rem 1rem' }}
            >
                {loading ? (
                    <>
                        <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                        <span>Calculating...</span>
                    </>
                ) : (
                    <>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.02em' }}>Calculate Forecast</span>
                        {forecastMethodLabel && (
                            <span style={{ fontSize: '0.66rem', opacity: 0.6, fontWeight: 400 }}>{forecastMethodLabel}</span>
                        )}
                    </>
                )}
            </button>

            {/* ── Modal overlay ── */}
            {open && (
                <div
                    ref={backdropRef}
                    className="forecast-modal-backdrop"
                    onClick={(e) => { if (e.target === backdropRef.current) setOpen(false); }}
                >
                    <div className="forecast-modal">
                        {/* Header */}
                        <div className="forecast-modal-header">
                            <div>
                                <div className="forecast-modal-title">Configure Forecast</div>
                                <div className="forecast-modal-subtitle">Select model, horizon, and parameters</div>
                            </div>
                            <button className="forecast-modal-close" onClick={() => setOpen(false)} aria-label="Close">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" style={{ width: 16, height: 16 }}>
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="forecast-modal-body">
                            {/* Model selector */}
                            <div className="forecast-modal-section">
                                <label className="forecast-modal-label">Forecasting Model</label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <select
                                        value={model}
                                        onChange={(e) => onModelChange(e.target.value)}
                                        className="forecast-modal-select"
                                    >
                                        <option value="moving_average">Moving Average</option>
                                        <option value="exponential_smoothing">Exponential Smoothing</option>
                                        <option value="holts_linear_trend">Holt's Linear Trend</option>
                                        <option value="holts_winters">Holt-Winters (Triple ES)</option>
                                        <option value="arima">ARIMA</option>
                                    </select>
                                </div>
                                <p className="forecast-modal-desc">{modelDescriptions[model]}</p>
                            </div>

                            {/* Forecast horizon */}
                            <div className="forecast-modal-section">
                                <label className="forecast-modal-label">Forecast Horizon</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <input
                                        type="number"
                                        value={periods || ''}
                                        onChange={handlePeriodsChange}
                                        min={1}
                                        max={365}
                                        className="forecast-modal-number"
                                    />
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>periods ahead</span>
                                </div>
                            </div>

                            {/* Parameters */}
                            <div className="forecast-modal-section">
                                <label className="forecast-modal-label">Model Parameters</label>
                                <div className="advanced-params-panel" style={{ marginTop: '0.5rem' }}>
                                    {renderParams()}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="forecast-modal-footer">
                            <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleRun}
                                disabled={!periods || periods < 1}
                            >
                                Run Forecast
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ForecastControls;
