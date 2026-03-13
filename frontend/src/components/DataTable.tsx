import React, { useState, useMemo } from 'react';
import type { TimeSeriesData, ForecastResult } from '../services/api';

interface DataTableProps {
    timeSeriesData: TimeSeriesData | null;
    forecastResult: ForecastResult | null;
    futureDates: string[];
}

type Filter = 'all' | 'actual' | 'forecast';

const DataTable: React.FC<DataTableProps> = ({ timeSeriesData, forecastResult, futureDates }) => {
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<Filter>('all');
    const PAGE_SIZE = 10;

    // Build unified rows
    const rows = useMemo(() => {
        const result: Array<{ index: number; date: string; value: number; type: 'Actual' | 'Forecast' }> = [];

        if (timeSeriesData) {
            timeSeriesData.data.forEach((d, i) => {
                result.push({ index: i + 1, date: d.date, value: d.value, type: 'Actual' });
            });
        }

        if (forecastResult && futureDates.length > 0) {
            forecastResult.forecast.forEach((v, i) => {
                if (futureDates[i]) {
                    result.push({
                        index: (timeSeriesData?.data.length ?? 0) + i + 1,
                        date: futureDates[i],
                        value: v,
                        type: 'Forecast',
                    });
                }
            });
        }

        return result;
    }, [timeSeriesData, forecastResult, futureDates]);

    const filtered = filter === 'all' ? rows : rows.filter(r => r.type.toLowerCase() === filter);
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleFilterChange = (f: Filter) => {
        setFilter(f);
        setPage(1);
    };

    if (!timeSeriesData) {
        return null;
    }

    return (
        <div className="data-table-container">
            <div className="data-table-header">
                <div className="data-table-filters">
                    {(['all', 'actual', 'forecast'] as Filter[]).map(f => (
                        <button
                            key={f}
                            className={`filter-tab${filter === f ? ' filter-tab--active' : ''}`}
                            onClick={() => handleFilterChange(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            <span className="filter-tab-count">
                                {f === 'all' ? rows.length
                                    : rows.filter(r => r.type.toLowerCase() === f).length}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="data-table-scroll">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Value</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map(row => (
                            <tr key={row.index} className={row.type === 'Forecast' ? 'row-forecast' : 'row-actual'}>
                                <td className="td-index">{row.index}</td>
                                <td className="td-date">{row.date}</td>
                                <td className="td-value">{row.value.toFixed(4)}</td>
                                <td>
                                    <span className={`type-badge type-badge--${row.type.toLowerCase()}`}>
                                        {row.type}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="data-table-pagination">
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        ‹
                    </button>
                    <span className="page-info">
                        Page {page} of {totalPages}
                        <span className="page-total"> ({filtered.length} rows)</span>
                    </span>
                    <button
                        className="page-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        ›
                    </button>
                </div>
            )}
        </div>
    );
};

export default DataTable;
