import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { generateAIAnalysis, type AIAnalysisPayload } from '../services/api';

interface AIAnalysisPanelProps {
    dataLength: number;
    latestActualValue: number | null;
    hasChangePointsResult: boolean;
    numberOfChangePoints: number;
    changePointDates: string[];
    selectedModel: string;
    globalRMSE: number | null;
    globalForecastEnd: number | null;
    segmentRMSE: number | null;
    segmentForecastEnd: number | null;
    segmentGrowthRate: string | null;
}

const AIAnalysisPanel: React.FC<AIAnalysisPanelProps> = ({
    dataLength,
    latestActualValue,
    hasChangePointsResult,
    numberOfChangePoints,
    changePointDates,
    selectedModel,
    globalRMSE,
    globalForecastEnd,
    segmentRMSE,
    segmentForecastEnd,
    segmentGrowthRate
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [context, setContext] = useState('');
    
    // State for the different sections of the report
    const [loadingType, setLoadingType] = useState<'overview' | 'breakpoints' | 'trend' | null>(null);
    const [overview, setOverview] = useState<string | null>(null);
    const [breakReport, setBreakReport] = useState<string | null>(null);
    const [trendReport, setTrendReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async (type: 'overview' | 'breakpoints' | 'trend') => {
        if (latestActualValue === null) return;
        
        setLoadingType(type);
        setError(null);
        
        try {
            const payload: AIAnalysisPayload = {
                promptType: type,
                context,
                dataLength,
                latestActualValue,
                numberOfChangePoints,
                changePointDates,
                selectedModel,
                globalRMSE,
                globalForecastEnd,
                segmentRMSE,
                segmentForecastEnd,
                segmentGrowthRate: segmentGrowthRate || '0.00'
            };
            
            const markdownReport = await generateAIAnalysis(payload);
            
            if (type === 'overview') setOverview(markdownReport);
            if (type === 'breakpoints') setBreakReport(markdownReport);
            if (type === 'trend') setTrendReport(markdownReport);
            
        } catch (err: any) {
            console.error('AI Analysis Error:', err);
            setError(err.response?.data?.error || err.message || 'Failed to generate analysis. Check API key.');
        } finally {
            setLoadingType(null);
        }
    };

    const MarkdownRenderer = ({ content }: { content: string }) => (
        <ReactMarkdown
            components={{
                h1: ({node, ...props}) => <h1 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.75rem', marginTop: '1rem' }} {...props} />,
                h2: ({node, ...props}) => <h2 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '0.5rem', marginTop: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }} {...props} />,
                h3: ({node, ...props}) => <h3 style={{ fontSize: '1rem', color: '#4F7FFF', marginBottom: '0.5rem', marginTop: '0.75rem' }} {...props} />,
                p: ({node, ...props}) => <p style={{ marginBottom: '0.75rem' }} {...props} />,
                ul: ({node, ...props}) => <ul style={{ marginBottom: '0.75rem', paddingLeft: '1.5rem', listStyleType: 'disc' }} {...props} />,
                li: ({node, ...props}) => <li style={{ marginBottom: '0.25rem' }} {...props} />,
                strong: ({node, ...props}) => <strong style={{ color: '#fff', fontWeight: 600 }} {...props} />,
            }}
        >
            {content}
        </ReactMarkdown>
    );

    return (
        <div className="panel data-table-panel">
            <div
                className="panel-header"
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#4F7FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <h3 className="panel-title">AI Economic Analyst</h3>
                </div>
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 16, height: 16, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#9BA3B8' }}
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </div>

            {isOpen && (
                <div className="panel-content" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    
                    {!overview && (
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Data Context (Optional)</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. US Monthly GDP 2000-2024"
                                value={context}
                                onChange={(e) => setContext(e.target.value)}
                                disabled={loadingType !== null}
                            />
                            <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                                Help the AI understand the underlying economic significance of this dataset.
                            </p>
                            {(!globalRMSE || !hasChangePointsResult) && (
                                <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(255, 171, 0, 0.1)', color: '#FFAB00', border: '1px solid rgba(255, 171, 0, 0.3)', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    ⚠️ <span>Please run a <strong>Global Forecast</strong> and detect <strong>Change Points</strong> to enable AI Analysis.</span>
                                </div>
                            )}
                            
                            <button
                                className="btn btn-primary"
                                onClick={() => handleGenerate('overview')}
                                disabled={loadingType !== null || dataLength === 0 || !globalRMSE || !hasChangePointsResult}
                                style={{ width: '100%', justifyContent: 'center', marginTop: (!globalRMSE || !hasChangePointsResult) ? '0.75rem' : '1rem', opacity: (!globalRMSE || !hasChangePointsResult) ? 0.5 : 1 }}
                            >
                                {loadingType === 'overview' ? (
                                    <><span className="spinner" style={{ marginRight: '0.5rem' }}></span> Analyzing Data...</>
                                ) : 'Generate Brief Overview'}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="error-message" style={{ padding: '0.75rem', marginTop: '0.5rem', borderRadius: '4px' }}>
                            {error}
                        </div>
                    )}

                    {overview && (
                        <div className="ai-report-container" style={{
                            padding: '1rem', backgroundColor: 'rgba(79, 127, 255, 0.05)',
                            border: '1px solid rgba(79, 127, 255, 0.2)', borderRadius: '6px',
                            color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5'
                        }}>
                            <MarkdownRenderer content={overview} />
                            
                            {/* Interactive Follow-up Buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                                {!breakReport && (
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => handleGenerate('breakpoints')}
                                        disabled={loadingType !== null || numberOfChangePoints === 0}
                                        style={{ flex: 1, minWidth: '140px', fontSize: '0.8rem', padding: '0.5rem' }}
                                    >
                                        {loadingType === 'breakpoints' ? <span className="spinner"></span> : '🔍 Analyze Breaks'}
                                    </button>
                                )}
                                {!trendReport && (
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => handleGenerate('trend')}
                                        disabled={loadingType !== null}
                                        style={{ flex: 1, minWidth: '140px', fontSize: '0.8rem', padding: '0.5rem' }}
                                    >
                                        {loadingType === 'trend' ? <span className="spinner"></span> : '📈 Explain Trend'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {breakReport && (
                        <div className="ai-report-container" style={{
                            padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px',
                            color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5'
                        }}>
                            <MarkdownRenderer content={breakReport} />
                        </div>
                    )}

                    {trendReport && (
                        <div className="ai-report-container" style={{
                            padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px',
                            color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.5'
                        }}>
                            <MarkdownRenderer content={trendReport} />
                        </div>
                    )}

                    {overview && (
                        <button 
                            className="btn btn-secondary" 
                            onClick={() => { setOverview(null); setBreakReport(null); setTrendReport(null); }}
                            style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', color: '#9BA3B8', border: '1px dashed #2A3143' }}
                        >
                            Reset Analysis
                        </button>
                    )}

                </div>
            )}
        </div>
    );
};

export default AIAnalysisPanel;
