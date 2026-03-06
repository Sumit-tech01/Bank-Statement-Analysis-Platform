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
 * tags:
 *   - name: Analysis
 *     description: Financial analysis endpoints
 */

/**
 * @swagger
 * /api/v1/analysis/summary:
 *   get:
 *     tags: [Analysis]
 *     summary: Generate financial summary
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional user id filter (admin only)
 *     responses:
 *       200:
 *         description: Summary generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalysisSummaryResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/summary", authMiddleware, cacheResponse(60), generateSummary);

/**
 * @swagger
 * /api/v1/analysis/ai-insights:
 *   get:
 *     tags: [Analysis]
 *     summary: Generate AI-powered financial insights
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional user id filter (admin only)
 *     responses:
 *       200:
 *         description: AI insights generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 insights:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
router.get("/ai-insights", authMiddleware, generateAIInsights);

export default router;
