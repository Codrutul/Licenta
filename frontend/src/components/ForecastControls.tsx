import React, { useState } from 'react';

interface ModelParameters {
    window?: number;
    alpha?: number;
    beta?: number;
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
}

const modelDescriptions: Record<string, string> = {
    moving_average: 'Averages recent data points to smooth out short-term fluctuations and highlight trends.',
    exponential_smoothing: 'Weighs recent observations more heavily than older ones using exponential decay.',
    holts_linear_trend: 'Extends exponential smoothing to capture both level and trend components.',
    arima: 'Autoregressive model with differencing AR(p,d) — applies autoregression on the d-th differenced series. Note: the MA (q) term is not implemented.',
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
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handlePeriodsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '') {
            onPeriodsChange(0);
        } else {
            const parsed = parseInt(value);
            if (!isNaN(parsed)) onPeriodsChange(parsed);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const currentValue = e.currentTarget.value;
        if (e.key === 'ArrowUp' && currentValue === '') {
            e.preventDefault();
            onPeriodsChange(1);
        } else if (e.key === 'ArrowDown' && currentValue === '') {
            e.preventDefault();
            onPeriodsChange(0);
        }
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
                    disabled={disabled}
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
                    disabled={disabled}
                    className="param-select-small"
                >
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
        );
    };

    const renderAdvancedParams = () => {
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

            default:
                return null;
        }
    };

    return (
        <>
            <div className="control-group">
                <label>Forecasting Model</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select
                        value={model}
                        onChange={(e) => { onModelChange(e.target.value); setShowAdvanced(false); }}
                        disabled={disabled}
                    >
                        <option value="moving_average">Moving Average</option>
                        <option value="exponential_smoothing">Exponential Smoothing</option>
                        <option value="holts_linear_trend">Holt's Linear Trend</option>
                        <option value="arima">AR(p,d)</option>
                    </select>
                    <div
                        className="model-tooltip"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <span className="tooltip-icon">?</span>
                        {showTooltip && (
                            <div className="tooltip-content">
                                {modelDescriptions[model]}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="control-group">
                <label>Forecast Horizon</label>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                        type="number"
                        value={periods || ''}
                        onChange={handlePeriodsChange}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        min={1}
                        max={365}
                    />
                    <span className="unit">Periods</span>
                </div>
            </div>

            {/* Advanced parameters toggle */}
            {!disabled && (
                <div className="control-group">
                    <label style={{ opacity: 0 }}>Params</label>
                    <button
                        className={`btn-advanced${showAdvanced ? ' btn-advanced--open' : ''}`}
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        type="button"
                    >
                        <span>⚙ Parameters</span>
                        <span className="adv-chevron">{showAdvanced ? '▲' : '▼'}</span>
                    </button>
                </div>
            )}

            <button
                className="btn btn-primary"
                onClick={onCalculate}
                disabled={disabled || loading}
            >
                {loading ? (
                    <>
                        <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                        <span>Calculating...</span>
                    </>
                ) : (
                    <span>Calculate Forecast</span>
                )}
            </button>

            {/* Advanced params panel */}
            {showAdvanced && !disabled && (
                <div className="advanced-params-panel">
                    <div className="advanced-params-title">
                        ⚙ {model.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} Parameters
                    </div>
                    {renderAdvancedParams()}
                </div>
            )}
        </>
    );
};

export default ForecastControls;
