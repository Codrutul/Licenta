const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

/**
 * POST /api/ai/analyze
 * Generates an economic analysis report using Google Gemini.
 * Body: { context, dataLength, latestActualValue, numberOfChangePoints, changePointDates, selectedModel, globalRMSE, globalForecastEnd, segmentRMSE, segmentForecastEnd, segmentGrowthRate }
 */
router.post('/analyze', async (req, res) => {
  try {
    const payload = req.body;
    
    // Quick validation
    if (!payload || !payload.selectedModel) {
      return res.status(400).json({ error: 'Invalid payload for AI analysis.' });
    }

    const reportMarkdown = await aiService.generateAnalysis(payload);

    res.json({
      success: true,
      result: {
        report: reportMarkdown
      }
    });

  } catch (error) {
    console.error('AI Analysis Route Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to generate AI analysis.'
    });
  }
});

module.exports = router;
