import { Router } from "express";
import {
  generateAIInsights,
  generateChart,
  generateSummary,
} from "../controllers/analysisController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

/**
 * @swagger
 * /api/v1/analysis/summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Generate financial summary analytics
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional userId filter (admin only)
 *     responses:
 *       200:
 *         description: Summary generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisSummaryResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/summary", authMiddleware, generateSummary);

/**
 * @swagger
 * /api/v1/analysis/chart:
 *   get:
 *     tags: [Analytics]
 *     summary: Get chart-friendly summary metrics and trend points
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional userId filter (admin only)
 *     responses:
 *       200:
 *         description: Chart data generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisChartResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/chart", authMiddleware, generateChart);

/**
 * @swagger
 * /api/v1/analysis/ai-insights:
 *   get:
 *     tags: [Analytics]
 *     summary: Generate AI-powered financial insights
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional userId filter (admin only)
 *     responses:
 *       200:
 *         description: AI insights generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AIInsightsResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/ai-insights", authMiddleware, generateAIInsights);

export default router;
