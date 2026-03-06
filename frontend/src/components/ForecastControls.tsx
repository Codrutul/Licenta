import React, { useState } from 'react';

interface ForecastControlsProps {
    model: string;
    periods: number;
    onModelChange: (model: string) => void;
    onPeriodsChange: (periods: number) => void;
    onCalculate: () => void;
    disabled: boolean;
    loading: boolean;
}

const modelDescriptions: Record<string, string> = {
    moving_average: 'Averages recent data points to smooth out short-term fluctuations and highlight trends.',
    exponential_smoothing: 'Weighs recent observations more heavily than older ones using exponential decay.',
    holts_linear_trend: 'Extends exponential smoothing to capture both level and trend components.',
    arima: 'Auto-Regressive Integrated Moving Average - combines autoregression, differencing, and moving averages for complex patterns.',
};

const ForecastControls: React.FC<ForecastControlsProps> = ({
    model,
    periods,
    onModelChange,
    onPeriodsChange,
    onCalculate,
    disabled,
    loading,
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const handlePeriodsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow empty string or parse as number
        if (value === '') {
            onPeriodsChange(0);
        } else {
            const parsed = parseInt(value);
            if (!isNaN(parsed)) {
                onPeriodsChange(parsed);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const currentValue = input.value;

        // Handle up arrow when input is empty
        if (e.key === 'ArrowUp' && currentValue === '') {
            e.preventDefault();
            onPeriodsChange(1);
        }
        // Handle down arrow when input is empty
        else if (e.key === 'ArrowDown' && currentValue === '') {
            e.preventDefault();
            onPeriodsChange(0);
        }
    };

    return (
        <>
            <div className="control-group">
                <label>Forecasting Model</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select
                        value={model}
                        onChange={(e) => onModelChange(e.target.value)}
                        disabled={disabled}
                    >
                        <option value="moving_average">Moving Average</option>
                        <option value="exponential_smoothing">Exponential Smoothing</option>
                        <option value="holts_linear_trend">Holt's Linear Trend</option>
                        <option value="arima">ARIMA</option>
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
                    />
                    <span className="unit">Periods</span>
                </div>
            </div>

            <button
                className="btn btn-primary"
                onClick={onCalculate}
                disabled={disabled || loading}
            >
                {loading ? (
                    <>
                        <span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></span>
                        <span>Calculating...</span>
                    </>
                ) : (
                    <>
                        <span>Calculate Forecast</span>
                    </>
                )}
            </button>
        </>
    );
};

export default ForecastControls;
