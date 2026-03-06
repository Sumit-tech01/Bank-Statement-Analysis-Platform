import { Router } from "express";
import {
  addManualTransaction,
  deleteStatement,
  deleteStatementTransaction,
  getStatementById,
  getUserStatements,
  updateStatementTransaction,
  uploadStatement,
  uploadStatementFile,
} from "../controllers/statementController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { cacheResponse } from "../middleware/cache.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { statementUploadMiddleware } from "../middleware/upload.middleware.js";
import {
  manualTransactionSchema,
  statementUploadSchema,
  updateTransactionSchema,
} from "../utils/validation-schemas.js";

const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   - name: Statements
 *     description: Bank statement management endpoints
 */

/**
 * @swagger
 * /api/v1/statements:
 *   post:
 *     tags: [Statements]
 *     summary: Upload a bank statement
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatementUploadRequest'
 *     responses:
 *       201:
 *         description: Statement uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatementResponse'
 *       401:
 *         description: Unauthorized
 */
router.post("/", validate(statementUploadSchema), uploadStatement);
router.post("/upload", statementUploadMiddleware, uploadStatementFile);
router.post("/manual", validate(manualTransactionSchema), addManualTransaction);

/**
 * @swagger
 * /api/v1/statements:
 *   get:
 *     tags: [Statements]
 *     summary: Get statements for current user (admin sees all)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statements fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatementsListResponse'
 *       401:
 *         description: Unauthorized
 */
router.get("/", cacheResponse(60), getUserStatements);

/**
 * @swagger
 * /api/v1/statements/{id}:
 *   get:
 *     tags: [Statements]
 *     summary: Get a statement by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Statement ID
 *     responses:
 *       200:
 *         description: Statement found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatementResponse'
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Statement not found
 */
router.get("/:id", getStatementById);
router.patch(
  "/:id/transactions/:transactionIndex",
  validate(updateTransactionSchema),
  updateStatementTransaction
);
router.delete("/:id/transactions/:transactionIndex", deleteStatementTransaction);

/**
 * @swagger
 * /api/v1/statements/{id}:
 *   delete:
 *     tags: [Statements]
 *     summary: Delete a statement by ID
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Statement ID
 *     responses:
 *       200:
 *         description: Statement deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteStatementResponse'
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Statement not found
 */
router.delete("/:id", deleteStatement);

export default router;
