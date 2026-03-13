import React from 'react';

export interface DateRange {
    start: string;
    end: string;
}

interface DateRangeSelectorProps {
    dates: string[];
    range: DateRange;
    onRangeChange: (range: DateRange) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
    dates,
    range,
    onRangeChange,
}) => {
    if (dates.length === 0) return null;

    const handleReset = () => {
        onRangeChange({ start: dates[0], end: dates[dates.length - 1] });
    };

    const isFiltered = range.start !== dates[0] || range.end !== dates[dates.length - 1];

    return (
        <div className="date-range-selector">
            <span className="date-range-label">📅 Date Range</span>

            <div className="date-range-inputs">
                <div className="date-range-field">
                    <label>From</label>
                    <select
                        value={range.start}
                        onChange={e => {
                            if (e.target.value <= range.end) {
                                onRangeChange({ ...range, start: e.target.value });
                            }
                        }}
                        className="date-range-select"
                    >
                        {dates.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>

                <span className="date-range-arrow">→</span>

                <div className="date-range-field">
                    <label>To</label>
                    <select
                        value={range.end}
                        onChange={e => {
                            if (e.target.value >= range.start) {
                                onRangeChange({ ...range, end: e.target.value });
                            }
                        }}
                        className="date-range-select"
                    >
                        {dates.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                </div>
            </div>

            {isFiltered && (
                <button className="date-range-reset" onClick={handleReset} title="Reset to full range">
                    ⟳ Full Range
                </button>
            )}
        </div>
    );
};

export default DateRangeSelector;
