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
        }
    };

    return (
        <label className="upload-btn">
            <span className="btn-icon">📤</span>
            <span>{loading ? 'Uploading...' : 'Upload .csv file'}</span>
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
