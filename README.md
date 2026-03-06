# Time Series Forecast Visualizer

**Bachelor Thesis Project - Afloarei Codrin**

A lightweight web application for time series forecasting with interactive visualizations and AI-powered interpretation (coming soon). Designed for non-technical users to easily understand and interpret forecasts.

## 🌟 Features

### Time Series Forecasting
- **Multiple Algorithms**: 
  - Moving Average
  - Exponential Smoothing
  - Holt's Linear Trend Method
  - ARIMA (AutoRegressive Integrated Moving Average)
- **CSV Upload**: Easy data import with automatic column detection
- **Configurable Forecast Horizon**: Predict 1-50 periods ahead
- **Accuracy Metrics**: RMSE, MAE, MAPE calculations

### Interactive Visualizations
- **Chart.js Integration**: Smooth, responsive, and interactive charts
- **Dual Dataset View**: Actual vs Forecast comparison
- **Hover Tooltips**: Inspect individual data points
- **Modern UI**: Premium dark theme with glassmorphism effects

### Quick Statistics
- Last actual value
- Projected next value
- Growth rate percentage
- Model accuracy metrics

### AI Analysis Engine (Placeholder)
- Future integration point for natural language explanations
- AI-powered trend interpretation
- Forecast insights and recommendations

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Easy Setup (Recommended)

Run both backend and frontend with a single command:

```bash
# Install all dependencies
npm run install:all

# Start both servers
npm run dev
```

The backend server will start on `http://localhost:3001` and the frontend on `http://localhost:5173`

### Manual Setup

If you prefer to run servers separately:

#### Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend server will start on `http://localhost:3001`

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:5173` (or the next available port)

### Testing with Sample Data

A sample CSV file (`sample_data.csv`) is provided in the root directory. Use this to test the application:

1. Start both backend and frontend servers
2. Click "Upload .csv file" button
3. Select `sample_data.csv`
4. Choose a forecasting model
5. Set forecast horizon (e.g., 6 periods)
6. Click "Calculate Forecast"

## 📊 Forecasting Algorithms

### Moving Average
Simple moving average forecast based on the last N observations. Best for stable time series without strong trends.

**Parameters:**
- Window size (default: 3)

### Exponential Smoothing
Weighted average giving more importance to recent observations. Automatically optimizes the smoothing parameter (alpha).

**Parameters:**
- Alpha (auto-optimized by default)

### Holt's Linear Trend
Double exponential smoothing that captures both level and trend. Ideal for time series with linear trends.

**Parameters:**
- Alpha: Level smoothing (default: 0.2)
- Beta: Trend smoothing (default: 0.1)

### ARIMA
AutoRegressive Integrated Moving Average model using differencing and autoregressive components.

**Parameters:**
- p: Autoregressive order (default: 2)
- d: Differencing order (default: 1)
- q: Moving average order (default: 1)

## 🏗️ Project Structure

```
.
├── backend/
│   ├── server.js              # Express server
│   ├── routes/
│   │   └── forecast.js        # API endpoints
│   ├── services/
│   │   └── forecastService.js # Forecasting algorithms
│   └── utils/
│       └── dataProcessor.js   # CSV parsing & statistics
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Main application
│   │   ├── components/        # React components
│   │   ├── services/          # API client
│   │   └── styles/            # CSS files
│   └── package.json
│
└── sample_data.csv            # Sample time series data
```

## 🔌 API Endpoints

### POST `/api/forecast/upload`
Upload and parse CSV file

**Request:** Multipart form data with CSV file
**Response:** Parsed time series data with statistics

### POST `/api/forecast/calculate`
Calculate forecast using selected model

**Request:**
```json
{
  "data": [1250, 1280, 1310, ...],
  "model": "moving_average",
  "periods": 6,
  "parameters": {}
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "method": "Moving Average",
    "forecast": [2410, 2420, ...],
    "fittedValues": [...],
    "parameters": { "window": 3 },
    "accuracy": {
      "rmse": 15.23,
      "mae": 12.45,
      "mape": 0.56
    },
    "stats": {
      "lastValue": 2400,
      "projectedValue": 2410,
      "growthRate": "0.42"
    }
  }
}
```

### GET `/api/forecast/health`
Health check endpoint

## 🎨 Technology Stack

### Backend
- **Express.js**: Web framework
- **simple-statistics**: Statistical calculations
- **csv-parser**: CSV file parsing
- **multer**: File upload handling
- **cors**: Cross-origin resource sharing

### Frontend
- **React 19**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Chart.js**: Interactive charts
- **Axios**: HTTP client

## 📚 Research Methodology

This application supports a user study comparing:
1. **Static charts** - Non-interactive visualizations
2. **Interactive charts** - Hover, zoom, toggle features
3. **AI-enhanced charts** - With natural language explanations (future)

The goal is to assess how different visualization features impact users' ability to:
- Understand forecast trends
- Make data-driven decisions
- Trust model predictions
- Interpret statistical results

## 🔮 Future Enhancements

- [ ] AI-powered natural language explanations
- [ ] Multiple time series support
- [ ] Advanced ARIMA parameter optimization
- [ ] Seasonal decomposition
- [ ] Confidence intervals
- [ ] Model comparison view
- [ ] User authentication
- [ ] Saved forecast history
- [ ] PDF export with charts and analysis

## 📝 CSV Format Requirements

Your CSV file should have:
- **Date column**: Any column with date, time, timestamp, period, year, month
- **Value column**: Numeric column with your time series values

Example:
```csv
date,value
2024-01-01,1250
2024-01-08,1280
2024-01-15,1310
```

The application automatically detects column types.

## 🤝 Contributing

This is a bachelor thesis project. For questions or collaboration:
- **Author**: Afloarei Codrin
- **Topic**: Web Tool for Time Series Forecast Visualizer + AI Interpreter

## 📄 License

MIT License - Created for academic purposes.

---

**Research Question**: How does combining interactive time series visualizations with AI-generated explanations improve non-technical users' ability to interpret and understand forecasts?
