import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/forecast';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
    stats: {
        lastValue: number;
        projectedValue: number;
        growthRate: string;
    };
}

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
