import { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ForecastControls from './components/ForecastControls';
import ForecastChart from './components/ForecastChart';
import QuickStats from './components/QuickStats';
import AIAnalysis from './components/AIAnalysis';
import { uploadCSV, calculateForecast, type TimeSeriesData, type ForecastResult } from './services/api';

function App() {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData | null>(null);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [selectedModel, setSelectedModel] = useState('moving_average');
  const [forecastPeriods, setForecastPeriods] = useState(6);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    setError(null);
    setForecastResult(null);

    try {
      const data = await uploadCSV(file);
      setTimeSeriesData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleCalculateForecast = async () => {
    if (!timeSeriesData) return;

    setCalculateLoading(true);
    setError(null);

    try {
      const result = await calculateForecast(
        timeSeriesData.values,
        selectedModel,
        forecastPeriods
      );
      setForecastResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to calculate forecast');
      console.error('Forecast error:', err);
    } finally {
      setCalculateLoading(false);
    }
  };

  const handleExport = () => {
    if (!forecastResult || !timeSeriesData) return;

    const exportData = {
      model: forecastResult.method,
      parameters: forecastResult.parameters,
      historical_data: timeSeriesData.data,
      forecast: forecastResult.forecast,
      statistics: timeSeriesData.statistics,
      accuracy: forecastResult.accuracy,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_${selectedModel}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Forecast Engine - Bachelors Thesis Afloarei Codrin</h1>
      </header>

      <main>
        <div className="control-panel">
          <FileUpload onFileUpload={handleFileUpload} loading={uploadLoading} />

          {timeSeriesData && (
            <>
              <ForecastControls
                model={selectedModel}
                periods={forecastPeriods}
                onModelChange={setSelectedModel}
                onPeriodsChange={setForecastPeriods}
                onCalculate={handleCalculateForecast}
                disabled={!timeSeriesData || uploadLoading}
                loading={calculateLoading}
              />

              {forecastResult && (
                <button className="btn btn-secondary" onClick={handleExport}>
                  <span className="btn-icon">💾</span>
                  <span>Export</span>
                </button>
              )}
            </>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: '1rem 1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-lg)',
              color: '#EF4444',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            ❌ {error}
          </div>
        )}

        <div className="main-content">
          <div>
            <ForecastChart
              dates={timeSeriesData?.dates || []}
              actualValues={timeSeriesData?.values || []}
              forecastResult={forecastResult}
              periods={forecastPeriods}
            />
          </div>

          <div className="sidebar">
            <QuickStats forecastResult={forecastResult} timeSeriesData={timeSeriesData} />
            <AIAnalysis />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
