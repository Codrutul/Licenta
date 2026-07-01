# Time Series Forecast Visualizer

**Bachelor Thesis Project - Afloarei Codrin**

A high-performance web architecture for time series forecasting featuring interactive visualizations, mathematical structural break detection, and deterministic generative AI interpretation. Designed to democratize complex econometric analytics for non-technical users without sacrificing mathematical rigor.

## Core Features

### High-Speed Time Series Forecasting
- **Native V8 Execution:** All econometric algorithms are coded directly in JavaScript, entirely eliminating slow cross-language network calls to Python microservices.
- **Supported Models:** Moving Average, Exponential Smoothing, Holt's Linear Trend, Holt-Winters (Triple ES), and ARIMA (AutoRegressive Integrated Moving Average).
- **Statistical Rigor:** Comprehensive tracking of RMSE, MAE, MAPE, and auto-scaling Confidence Intervals.

### Structural Break Detection (PELT)
- **Mathematical Integrity:** Utilizes the Pruned Exact Linear Time (PELT) algorithm and Bayesian Information Criterion (BIC) to identify definitive regime shifts in the historical data.
- **Segmented Forecasting:** When a shock is detected, the system intelligently segments the data, discarding obsolete pre-shock history to dramatically improve predictive accuracy.

### Generative AI Analyst (Google Gemini)
- **Automated Interpretation:** Translates complex mathematical arrays and structural breaks into formal, human-readable economic analysis reports.
- **Deterministic Guardrails:** Employs strict Prompt Engineering with a locked API temperature (`0.0`) to prevent LLM hallucinations and enforce analytical consistency.

### Interactive Visualizations
- **Chart.js Integration:** High-fidelity, 60FPS cartesian rendering utilizing HTML5 Canvas.
- **Dual Dataset View:** Overlay multiple forecast models directly over actual historical data for instant visual comparison.
- **Modern UI:** Professional, progressive dark-mode interface designed to minimize eye strain.

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- **Google Gemini API Key** (Required for the AI Analyst feature)

### Setup

1. **Clone and Install:**
```bash
# Install all dependencies across backend and frontend
npm run install:all
```

2. **Environment Variables:**
Create a `.env` file in the `backend/` directory:
```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_google_api_key_here
```

3. **Start the Application:**
```bash
# Start both backend and frontend concurrently
npm run dev
```

The backend server will start on `http://localhost:3001` and the frontend UI on `http://localhost:5173`.

### Testing with Sample Data
A sample CSV file (`sample_data.csv`) is provided in the root directory. 
1. Open the UI at `localhost:5173`.
2. Click "Upload .csv file" and select `sample_data.csv`.
3. Experiment with generating Global Forecasts, detecting Change Points, and triggering the AI Analyst.

## Project Structure

```text
.
├── backend/
│   ├── server.js                   # Express server & Middleware
│   ├── routes/
│   │   ├── forecast.js             # Routes for math algorithms
│   │   └── ai.js                   # Routes for Gemini integration
│   ├── services/
│   │   ├── forecastService.js      # Core ARIMA/Holt-Winters logic
│   │   ├── changePointService.js   # PELT algorithm logic
│   │   └── aiService.js            # LLM Prompt Engineering
│   └── utils/
│       └── dataProcessor.js        # CSV parsing & dataset statistics
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 # Main React Application
│   │   ├── components/             # Reusable UI Modules
│   │   ├── services/               # Axios API client
│   │   └── styles/                 # Application CSS
│   └── package.json
│
└── sample_data.csv                 # Testing data
```

## Core API Endpoints

### Mathematical Computations (/api/forecast)
- `POST /upload` - Ingests and structuralizes raw CSV data.
- `POST /calculate` - Calculates global projections using the selected mathematical model.
- `POST /changepoints` - Executes the PELT algorithm to flag historical epochs.
- `POST /segment-forecast` - Runs targeted forecasting exclusively on isolated data segments.
- `POST /decompose` - Extracts structural components (Trend, Seasonal, Residual).

### Generative AI (/api/ai)
- `POST /analyze` - Generates the deterministic economic report based on mathematical payloads.

## Future Enhancements
While the core architecture is complete, future iterations could explore:
- [ ] Upgrading the backend engines to support deep-learning architectures (e.g., LSTM neural networks).
- [ ] User authentication and saved workspace sessions.
- [ ] Support for multiple simultaneous time-series ingestions (Multivariate forecasting).
- [ ] PDF export functionality for the generated charts and AI reports.

## CSV Format Requirements
The system intuitively ingests comma-separated values. At minimum, the CSV requires:
- **Date column**: e.g., date, time, timestamp, period.
- **Value column**: Numeric column containing the primary dataset.

## Contributing
**Bachelor Thesis Project**
- **Author**: Afloarei Codrin
- **Topic**: Web Tool for Time Series Forecast Visualizer + AI Interpreter

## License
MIT License - Created for academic purposes.
