import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/forecast';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * @interface TimeSeriesData
 * @description Data structure representing the historical dataset.
 * Contains the coordinate arrays for plotting and computed statistics.
 */

export interface TimeSeriesData {
    data: Array<{ date: string; value: number }>;
    values: number[];
    dates: string[];
    statistics: {
        count: number;
        mean: number;
        median: number;
        stdDev: number;
        min: number;
        max: number;
        range: number;
        trend: string;
        seasonality: {
            detected: boolean;
            period: number | null;
            strength: number;
        };
    };
    metadata: {
        dateColumn: string;
        valueColumn: string;
        length: number;
    };
}

export interface ForecastResult {
    method: string;
    forecast: number[];
    fittedValues: number[];
    parameters: any;
    accuracy: {
        mse: number;
        rmse: number;
        mae: number;
        mape: number;
    } | null;
    confidenceIntervals: {
        upper: number[];
        lower: number[];
        confidence: number;
    } | null;
    stats: {
        lastValue: number;
        projectedValue: number;
        growthRate: string;
    };
}

/**
 * @interface DecompositionResult
 * @description Represents the extraction of Trend, Seasonal, and Residual components from the time series.
 */
export interface DecompositionResult {
    trend: (number | null)[];
    seasonal: number[];
    residual: (number | null)[];
    period: number;
    original: number[];
}

/**
 * @function uploadCSV
 * @description Transmits the CSV file to the Node.js backend for parsing.
 */

export const uploadCSV = async (file: File): Promise<TimeSeriesData> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return response.data.data;
};

export const calculateForecast = async (
    data: number[],
    model: string,
    periods: number,
    parameters?: any
): Promise<ForecastResult> => {
    const response = await api.post('/calculate', {
        data,
        model,
        periods,
        parameters,
    });

    return response.data.result;
};

export const healthCheck = async (): Promise<any> => {
    const response = await api.get('/health');
    return response.data;
};

export const decompose = async (
    data: number[],
    period?: number
): Promise<DecompositionResult> => {
    const response = await api.post('/decompose', { data, period });
    return response.data.result;
};

// Change-Point Detection

export interface SegmentStats {
    index: number;
    startIndex: number;
    endIndex: number;
    startDate: string;
    endDate: string;
    n: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    slope: number;
    trend: string;
}

export interface ChangePointResult {
    changePoints: number[];   // indices of first point of each new segment
    segments: SegmentStats[];
    penalty: number;
    cost: number;
    n: number;
}

export interface SegmentResult {
    segmentIndex: number;
    startIndex: number;
    endIndex: number;
    startDate: string;
    endDate: string;
    n: number;
    method: string;
    parameters: any;
    accuracy: { mse: number; rmse: number; mae: number; mape: number } | null;
    forecast: number[];
    confidenceIntervals: { upper: number[]; lower: number[]; confidence: number } | null;
    isLastSegment: boolean;
}

export interface SegmentForecastResult {
    segments: SegmentResult[];
    forecast: number[];
    confidenceIntervals: { upper: number[]; lower: number[]; confidence: number } | null;
    fittedValues: (number | null)[];
    method: string;
    parameters: any;
    stats: { lastValue: number; projectedValue: number | null; growthRate: string };
    baselineAccuracy: { mse: number; rmse: number; mae: number; mape: number } | null;
    changePoints: number[];
}

export const detectChangePoints = async (
    data: number[],
    dates: string[],
    penalty?: number
): Promise<ChangePointResult> => {
    const response = await api.post('/changepoints', { data, dates, penalty });
    return response.data.result;
};

export const runSegmentForecast = async (
    data: number[],
    dates: string[],
    changePoints: number[],
    model: string,
    periods: number,
    parameters?: any
): Promise<SegmentForecastResult> => {
    const response = await api.post('/segment-forecast', {
        data, dates, changePoints, model, periods, parameters,
    });
    return response.data.result;
};

export interface AIAnalysisPayload {
    promptType: 'overview' | 'breakpoints' | 'trend';
    context?: string;
    dataLength: number;
    latestActualValue: number;
    numberOfChangePoints: number;
    changePointDates: string[];
    selectedModel: string;
    globalRMSE: number | null;
    globalForecastEnd: number | null;
    segmentRMSE: number | null;
    segmentForecastEnd: number | null;
    segmentGrowthRate: string;
}

export const generateAIAnalysis = async (payload: AIAnalysisPayload): Promise<string> => {
    const aiBaseUrl = API_BASE_URL.replace('/forecast', '');
    const response = await axios.post(`${aiBaseUrl}/ai/analyze`, payload, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data.result.report;
};

