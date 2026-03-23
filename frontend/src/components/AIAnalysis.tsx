import React from 'react';

const AIAnalysis: React.FC = () => {
    return (
        <div className="ai-card">
            <div className="ai-header">
                <div className="ai-title">
                    <div className="ai-icon">
                        {/* CPU / circuit icon */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
                            <rect x="7" y="7" width="10" height="10" />
                            <path d="M9 7V4M12 7V4M15 7V4M9 17v3M12 17v3M15 17v3M7 9H4M7 12H4M7 15H4M17 9h3M17 12h3M17 15h3" />
                        </svg>
                    </div>
                    <h3>Statistical Analysis Engine</h3>
                </div>
                <div className="ai-badge">Coming Soon</div>
            </div>

            <div className="ai-content">
                <div className="ai-placeholder">
                    <div className="ai-placeholder-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter">
                            <path d="M3 3v18h18" />
                            <path d="M7 16l4-5 4 3 4-6" />
                        </svg>
                    </div>
                    <p className="ai-placeholder-text">
                        Automated statistical interpretation and<br />model diagnostics will be available in the next version.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIAnalysis;
