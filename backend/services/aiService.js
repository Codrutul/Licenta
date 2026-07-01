const { GoogleGenAI } = require('@google/genai');
/**
 * AI Service for Economic Interpretations
 * @class AIService
 * @description Connects the application to Google Gen AI (Gemini).
 * Converts forecast algorithms and changepoint detections into readable economic analysis reports.
 */
class AIService {
  constructor() {
    this.ai = null;
    this._initializeAPI();
  }

  _initializeAPI() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('Failed to initialize Google Gen AI SDK. Check your API key.');
      }
    }
  }

  /**
   * Generates a dynamic, professional economic analysis report using the Gemini LLM.
   * Based on 'promptType', it acts as an economic analyst to interpret historical context, structural breaks, or future trends.
   * 
   * @async
   * @param {Object} payload - The mathematical data payload
   * @param {'overview'|'breakpoints'|'trend'} payload.promptType - The specific contextual sub-query being requested
   * @param {string} [payload.context] - Optional user-provided context describing the dataset (e.g., 'Monthly Romanian GDP')
   * @param {number} payload.dataLength - Total number of historical observations
   * @param {number} payload.latestActualValue - The most recent historical data point
   * @param {number} payload.numberOfChangePoints - The count of structural breaks identified via PELT
   * @param {string[]} payload.changePointDates - An array of isolated structural regime boundaries
   * @param {string} payload.selectedModel - The mathematical model utilized for the global forecast
   * @param {number} payload.globalRMSE - The In-Sample Root Mean Square Error of the global baseline model
   * @param {number} payload.globalForecastEnd - The terminal value of the global projection trajectory
   * @param {number} payload.segmentRMSE - The In-Sample RMSE of the localized sub-segment model
   * @param {number} payload.segmentForecastEnd - The terminal value of the localized projection trajectory
   * @param {string} payload.segmentGrowthRate - The calculated total growth trajectory across the forecast horizon
   * @returns {Promise<string>} A Markdown string containing the AI's diagnostic report
   * @throws {Error} Throws if the Gemini generative process fails or API key is absent
   */
  async generateAnalysis(payload) {
    // Lazy initialization in case API key was added after startup
    if (!this.ai) {
      this._initializeAPI();
      if (!this.ai) {
        throw new Error('Google Gemini API Key is missing or invalid. Please add GEMINI_API_KEY to your backend .env file.');
      }
    }

    const {
      promptType,
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
      segmentGrowthRate
    } = payload;

    let systemPrompt = '';
    
    switch (promptType) {
      case 'overview':
        systemPrompt = `You are a helpful data assistant. Write a very simple, 1-paragraph summary of the forecasting results. 
Do not use academic jargon. Just state what the data is doing, and how many structural breaks there were. If a Segmented forecast is provided, state which model was more accurate based on the RMSE. Conclude with a plain English sentence explaining the final projected value. Crucially, explicitly evaluate if this final forecasted result is realistic and viable in the real world given the context (e.g., warn the user if a metric drops below zero when it shouldn't, or grows impossibly fast). Do not introduce yourself. Output in simple Markdown.`;
        break;
      case 'breakpoints':
        systemPrompt = `You are a critical economic analyst. The user has detected structural breaks in a time series dataset.
For EACH break date provided, write exactly ONE bullet point. Each bullet must:
- Start with the bold date (e.g. **2020-01-01**)
- Briefly name the most likely real-world economic event or shock that caused the regime change at that date
- State in one phrase how the trend shifted (e.g. "sharp upward spike", "prolonged decline", "volatility spike")
Do not group multiple dates into one sentence. Do not write paragraphs. Output strictly as a Markdown bullet list, one bullet per break. Do not introduce yourself.`;
        break;
      case 'trend':
        systemPrompt = `You are a skeptical, critical economic analyst. Your job is to rigorously evaluate whether the projected forecast is economically plausible — not to validate it.
Rules you MUST follow:
1. If a Segmented forecast exists, state which model has lower RMSE and why that matters.
2. Critically assess the projected landing value using real-world domain knowledge. Apply country- and metric-specific sanity checks. For example: CPI inflation below 1% is extremely unusual for emerging economies (e.g. Romania, Turkey, Brazil); unemployment rates cannot go below ~2%; GDP indices cannot grow 50% in one year.
3. If the projected value violates economic reality, explicitly call it out as UNREALISTIC and explain why. Do not soften this judgment with phrases like "it is possible" or "could reach".
4. If the trend is realistic, briefly confirm it and state why.
Be direct, skeptical, and concise. Do not introduce yourself. Output in simple Markdown.`;
        break;
      default:
        systemPrompt = `You are a simple data assistant. Summarize the results in 2 sentences in Markdown.`;
    }

    const userPrompt = `
Here is the mathematical and contextual data for this session:

**User Context/Description:** "${context || 'No specific context provided.'}"

**Historical Data Overview:**
- Total historical points: ${dataLength}
- Most recent observed value: ${latestActualValue}

**Structural Break Detection (PELT Algorithm):**
- Total Change Points Detected: ${numberOfChangePoints}
- Dates of Structural Breaks: ${changePointDates.join(', ') || 'None detected'}

**Forecasting Model Analyzed:** ${selectedModel}

**Global Model Performance (Trained on entire series):**
- In-sample RMSE: ${globalRMSE !== null ? globalRMSE.toFixed(4) : 'N/A'}
- Projected future forecast landing value: ${globalForecastEnd !== null ? globalForecastEnd.toFixed(4) : 'N/A'}

**Segmented Model Performance (Trained on final isolated segment):**
- In-sample RMSE: ${segmentRMSE !== null ? segmentRMSE.toFixed(4) : 'N/A'}
- Projected future forecast landing value: ${segmentForecastEnd !== null ? segmentForecastEnd.toFixed(4) : 'N/A'}
- Future Growth Rate: ${segmentGrowthRate}%

Please write the economic analysis report based strictly on these metrics.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.0, // Limit for analytical consistency
        }
      });
      return response.text;
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error('Failed to generate AI analysis. Please check your Gemini API key and quota.');
    }
  }
}

module.exports = new AIService();
