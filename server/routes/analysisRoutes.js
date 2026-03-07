import { Router } from "express";
import {
  generateAIInsights,
  generateSummary,
} from "../controllers/analysisController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { cacheResponse } from "../middleware/cache.middleware.js";

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
router.get("/summary", authMiddleware, cacheResponse(60), generateSummary);

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
