import React from 'react';

interface FileUploadProps {
    onFileUpload: (file: File) => void;
    loading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, loading }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileUpload(file);
            // Reset the input so the same file can be re-selected after a Clear
            event.target.value = '';
        }
    };

    return (
        <label className="upload-btn">
            <span className="btn-icon">
                {/* Upload arrow icon */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
            </span>
            <span>{loading ? 'Loading...' : 'Import .csv'}</span>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
            />
        </label>
    );
};

export default FileUpload;
