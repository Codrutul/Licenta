import React, { useState } from 'react';
import type { ForecastResult } from '../services/api';

export interface ComparisonEntry {
    id: string;
    model: string;
    label: string;
    color: string;
    result: ForecastResult;
}

// Colors for each comparison slot
export const COMPARISON_COLORS = [
    '#F97316', // orange
    '#10B981', // green
    '#06B6D4', // cyan
    '#EC4899', // pink
    '#EAB308', // yellow
];

const MODEL_LABELS: Record<string, string> = {
    moving_average: 'Moving Avg',
    exponential_smoothing: 'Exp Smoothing',
    holts_linear_trend: "Holt's Trend",
    holts_winters: 'Holt-Winters',
    arima: 'ARIMA',
};

const MODEL_NAMES: Record<string, string> = {
    moving_average: 'Moving Average',
    exponential_smoothing: 'Exponential Smoothing',
    holts_linear_trend: "Holt's Linear Trend",
    holts_winters: 'Holt-Winters',
    arima: 'ARIMA',
};

const ALL_MODELS = Object.keys(MODEL_NAMES);
const MAX_COMPARISONS = 5;

interface ComparisonControlsProps {
    primaryModel: string;
    comparisons: ComparisonEntry[];
    onCompare: (model: string, parameters: Record<string, any>, color: string) => Promise<void>;
    onRemove: (id: string) => void;
    onClearAll: () => void;
    loading: boolean;
    disabled: boolean;
}

const ComparisonControls: React.FC<ComparisonControlsProps> = ({
    primaryModel,
    comparisons,
    onCompare,
    onRemove,
    onClearAll,
    loading,
    disabled,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [selectedModel, setSelectedModel] = useState(
        ALL_MODELS.find(m => m !== primaryModel) || ALL_MODELS[0]
    );
    const [alpha, setAlpha] = useState(0.3);
    const [beta, setBeta] = useState(0.1);
    const [window, setWindow] = useState(5);

    const nextColor = COMPARISON_COLORS[comparisons.length % COMPARISON_COLORS.length];
    const canAddMore = comparisons.length < MAX_COMPARISONS;

    const getParameters = (model: string): Record<string, any> => {
        switch (model) {
            case 'moving_average': return { window };
            case 'exponential_smoothing': return { alpha };
            case 'holts_linear_trend': return { alpha, beta };
            case 'arima': return { p: 2, d: 1, q: 1 };
            default: return {};
        }
    };

    const handleRun = () => {
        onCompare(selectedModel, getParameters(selectedModel), nextColor);
    };

    return (
        <div className="comparison-panel">
            <button className="comparison-toggle" onClick={() => setExpanded(!expanded)}>
                <span>⚖</span>
                <span>Model Comparison</span>
                {comparisons.length > 0 && (
                    <span className="ann-count-badge">{comparisons.length} active</span>
                )}
                <span className="decomp-chevron">{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <div className="comparison-body">
                    {/* Active comparisons list */}
                    {comparisons.length > 0 && (
                        <div className="comparison-list">
                            {comparisons.map((c) => (
                                <div key={c.id} className="comparison-item">
                                    <span
                                        className="comparison-item-dot"
                                        style={{ background: c.color }}
                                    />
                                    <span className="comparison-item-label">
                                        {c.label}
                                    </span>
                                    <button
                                        className="ann-remove-btn"
                                        onClick={() => onRemove(c.id)}
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                className="comparison-clear-all"
                                onClick={onClearAll}
                            >
                                ✕ Clear all
                            </button>
                        </div>
                    )}

                    {!canAddMore && (
                        <p className="comparison-desc" style={{ color: '#F97316' }}>
                            Maximum of {MAX_COMPARISONS} comparisons reached.
                        </p>
                    )}

                    {canAddMore && (
                        <>
                            <p className="comparison-desc">
                                Add models to overlay their forecasts on the chart (up to {MAX_COMPARISONS}).
                            </p>

                            {/* Color preview + model select */}
                            <div className="comparison-add-row">
                                <span
                                    className="comparison-next-color"
                                    style={{ background: nextColor }}
                                    title="Color for next comparison"
                                />
                                <div className="ann-field" style={{ flex: 1 }}>
                                    <label className="ann-label">Model to Add</label>
                                    <select
                                        value={selectedModel}
                                        onChange={e => setSelectedModel(e.target.value)}
                                        disabled={disabled}
                                        className="ann-select"
                                    >
                                        {ALL_MODELS
                                            .filter(m => m !== primaryModel)
                                            .map(m => (
                                                <option key={m} value={m}>{MODEL_NAMES[m]}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            {/* Inline params */}
                            {selectedModel === 'moving_average' && (
                                <div className="comparison-param">
                                    <label>Window: <strong style={{ color: nextColor }}>{window}</strong></label>
                                    <input type="range" min={2} max={20} step={1} value={window}
                                        onChange={e => setWindow(+e.target.value)}
                                        className="param-slider" disabled={disabled} />
                                </div>
                            )}
                            {selectedModel === 'exponential_smoothing' && (
                                <div className="comparison-param">
                                    <label>Alpha (α): <strong style={{ color: nextColor }}>{alpha.toFixed(2)}</strong></label>
                                    <input type="range" min={0.01} max={0.99} step={0.01} value={alpha}
                                        onChange={e => setAlpha(+e.target.value)}
                                        className="param-slider" disabled={disabled} />
                                </div>
                            )}
                            {selectedModel === 'holts_linear_trend' && (
                                <>
                                    <div className="comparison-param">
                                        <label>Alpha: <strong style={{ color: nextColor }}>{alpha.toFixed(2)}</strong></label>
                                        <input type="range" min={0.01} max={0.99} step={0.01} value={alpha}
                                            onChange={e => setAlpha(+e.target.value)}
                                            className="param-slider" disabled={disabled} />
                                    </div>
                                    <div className="comparison-param">
                                        <label>Beta: <strong style={{ color: nextColor }}>{beta.toFixed(2)}</strong></label>
                                        <input type="range" min={0.01} max={0.99} step={0.01} value={beta}
                                            onChange={e => setBeta(+e.target.value)}
                                            className="param-slider" disabled={disabled} />
                                    </div>
                                </>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={handleRun}
                                disabled={disabled || loading}
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            >
                                {loading ? (
                                    <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                        <span> Adding...</span></>
                                ) : (
                                    <>
                                        <span
                                            style={{
                                                display: 'inline-block',
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                background: nextColor,
                                                marginRight: 6,
                                            }}
                                        />
                                        {`+ Add ${MODEL_LABELS[selectedModel]}`}
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ComparisonControls;
