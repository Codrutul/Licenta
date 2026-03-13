import React, { useState } from 'react';

export interface Annotation {
    id: string;
    date: string;        // x-axis label / date string
    label: string;       // display label
    color: string;
}

interface AnnotationsPanelProps {
    dates: string[];
    annotations: Annotation[];
    onAnnotationsChange: (annotations: Annotation[]) => void;
}

const PRESET_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#6366F1', '#EC4899', '#06B6D4'];

const AnnotationsPanel: React.FC<AnnotationsPanelProps> = ({
    dates,
    annotations,
    onAnnotationsChange,
}) => {
    const [newDate, setNewDate] = useState(dates[0] || '');
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
    const [expanded, setExpanded] = useState(false);

    const addAnnotation = () => {
        if (!newDate || !newLabel.trim()) return;
        const ann: Annotation = {
            id: `ann_${Date.now()}`,
            date: newDate,
            label: newLabel.trim(),
            color: newColor,
        };
        onAnnotationsChange([...annotations, ann]);
        setNewLabel('');
    };

    const removeAnnotation = (id: string) => {
        onAnnotationsChange(annotations.filter(a => a.id !== id));
    };

    return (
        <div className="annotations-panel">
            <button className="annotations-toggle" onClick={() => setExpanded(!expanded)}>
                <span>📌</span>
                <span>Annotation Markers</span>
                {annotations.length > 0 && (
                    <span className="ann-count-badge">{annotations.length}</span>
                )}
                <span className="decomp-chevron">{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <div className="annotations-body">
                    {/* Add new annotation form */}
                    <div className="ann-form">
                        <div className="ann-form-row">
                            <div className="ann-field">
                                <label className="ann-label">Date</label>
                                <select
                                    value={newDate}
                                    onChange={e => setNewDate(e.target.value)}
                                    className="ann-select"
                                >
                                    {dates.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="ann-field ann-field--grow">
                                <label className="ann-label">Label</label>
                                <input
                                    type="text"
                                    value={newLabel}
                                    onChange={e => setNewLabel(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addAnnotation()}
                                    placeholder="e.g. Policy Change"
                                    className="ann-input"
                                    maxLength={40}
                                />
                            </div>
                        </div>
                        <div className="ann-form-row" style={{ alignItems: 'flex-end' }}>
                            <div className="ann-field">
                                <label className="ann-label">Color</label>
                                <div className="ann-color-swatches">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            className={`ann-swatch${newColor === c ? ' ann-swatch--active' : ''}`}
                                            style={{ background: c }}
                                            onClick={() => setNewColor(c)}
                                            title={c}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={addAnnotation}
                                disabled={!newLabel.trim()}
                                style={{ padding: '0.5rem 1rem', marginLeft: 'auto', height: 'fit-content' }}
                            >
                                + Add Marker
                            </button>
                        </div>
                    </div>

                    {/* Existing annotations list */}
                    {annotations.length > 0 && (
                        <div className="ann-list">
                            {annotations.map(ann => (
                                <div key={ann.id} className="ann-item">
                                    <span
                                        className="ann-item-color"
                                        style={{ background: ann.color }}
                                    />
                                    <span className="ann-item-date">{ann.date}</span>
                                    <span className="ann-item-label">{ann.label}</span>
                                    <button
                                        className="ann-remove-btn"
                                        onClick={() => removeAnnotation(ann.id)}
                                        title="Remove marker"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {annotations.length === 0 && (
                        <p className="ann-empty">
                            No markers added. Select a date and label above to annotate important events on the chart.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnnotationsPanel;
