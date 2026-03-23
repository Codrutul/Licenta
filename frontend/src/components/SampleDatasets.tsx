import React, { useState } from 'react';

interface SampleDataset {
    id: string;
    label: string;
    description: string;
    frequency: string;
    breaks: string;
    file: string;
}

const SAMPLES: SampleDataset[] = [
    {
        id: 'us_gdp',
        label: 'US GDP Index',
        description: 'Quarterly US GDP index (base 100, 2000–2024)',
        frequency: 'Quarterly',
        breaks: '2008 Q4, 2020 Q1',
        file: '/samples/us_gdp_index.csv',
    },
    {
        id: 'eu_unemployment',
        label: 'EU Unemployment Rate',
        description: 'Monthly EU unemployment rate (%) 2005–2024',
        frequency: 'Monthly',
        breaks: '2009, 2020',
        file: '/samples/eu_unemployment.csv',
    },
    {
        id: 'romania_cpi',
        label: 'Romania CPI Inflation',
        description: 'Monthly Romania CPI inflation (%) 2010–2024',
        frequency: 'Monthly',
        breaks: '2016, 2022',
        file: '/samples/romania_cpi.csv',
    },
];

interface Props {
    onLoad: (file: File) => void;
    loading: boolean;
}

const SampleDatasets: React.FC<Props> = ({ onLoad, loading }) => {
    const [open, setOpen] = useState(false);

    const handleSelect = async (sample: SampleDataset) => {
        setOpen(false);
        try {
            const resp = await fetch(sample.file);
            if (!resp.ok) throw new Error('Failed to fetch sample dataset');
            const blob = await resp.blob();
            const file = new File([blob], sample.id + '.csv', { type: 'text/csv' });
            onLoad(file);
        } catch (err) {
            console.error('Sample dataset load error:', err);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button
                className="btn btn-secondary"
                onClick={() => setOpen(v => !v)}
                disabled={loading}
                title="Load a sample economic dataset"
                style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
                <span className="btn-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </span>
                <span>Sample Data</span>
            </button>

            {open && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setOpen(false)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 199,
                        }}
                    />
                    {/* Dropdown panel */}
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 200,
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        minWidth: '280px',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            padding: '0.6rem 1rem',
                            borderBottom: '1px solid var(--color-border)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--color-text-muted)',
                        }}>
                            Economic Sample Datasets
                        </div>
                        {SAMPLES.map(s => (
                            <button
                                key={s.id}
                                onClick={() => handleSelect(s)}
                                style={{
                                    display: 'block',
                                    width: '100%',
                                    textAlign: 'left',
                                    background: 'none',
                                    border: 'none',
                                    padding: '0.75rem 1rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid var(--color-border)',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)', marginBottom: '2px' }}>
                                    {s.label}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                    {s.description}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '4px' }}>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--color-accent)', opacity: 0.85 }}>
                                        📅 {s.frequency}
                                    </span>
                                    <span style={{ fontSize: '0.68rem', color: 'var(--color-warning)', opacity: 0.85 }}>
                                        ⚡ Breaks: {s.breaks}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default SampleDatasets;
