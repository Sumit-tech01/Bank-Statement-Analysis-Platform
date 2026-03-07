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
 * /api/v1/statements:
 *   post:
 *     tags: [Statements]
 *     summary: Create a statement from structured JSON payload
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatementUploadRequest'
 *           example:
 *             fileName: march-2026-statement.csv
 *             uploadDate: "2026-03-05T08:15:00.000Z"
 *             transactions:
 *               - date: "2026-03-01T00:00:00.000Z"
 *                 description: AMAZON PAYMENT
 *                 amount: 2000
 *                 type: expense
 *                 category: shopping
 *     responses:
 *       201:
 *         description: Statement uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatementResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/", validate(statementUploadSchema), uploadStatement);

/**
 * @swagger
 * /api/v1/statements/upload:
 *   post:
 *     tags: [Statements]
 *     summary: Upload and parse statement file (CSV/PDF/Image)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               userId:
 *                 type: string
 *                 description: Optional userId (admin only)
 *     responses:
 *       201:
 *         description: Statement file uploaded and parsed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatementResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/upload", statementUploadMiddleware, uploadStatementFile);

/**
 * @swagger
 * /api/v1/statements/manual:
 *   post:
 *     tags: [Statements, Transactions]
 *     summary: Add a manual transaction entry
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManualTransactionRequest'
 *           example:
 *             date: "2026-03-06T00:00:00.000Z"
 *             description: UPI Grocery Store
 *             amount: 1450
 *             type: expense
 *             category: groceries
 *     responses:
 *       201:
 *         description: Manual transaction added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatementResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/UnprocessableEntity'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/manual", validate(manualTransactionSchema), addManualTransaction);

/**
 * @swagger
 * /api/v1/statements:
 *   get:
 *     tags: [Statements]
 *     summary: Get paginated statements (admin sees all)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Statements fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatementsListResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/:id", getStatementById);

/**
 * @swagger
 * /api/v1/statements/{id}/transactions/{transactionIndex}:
 *   patch:
 *     tags: [Transactions]
 *     summary: Update a specific transaction within a statement
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Statement ID
 *       - in: path
 *         name: transactionIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Zero-based transaction index
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTransactionRequest'
 *           example:
 *             description: Updated electricity bill
 *             amount: 2500
 *             category: utilities
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch(
  "/:id/transactions/:transactionIndex",
  validate(updateTransactionSchema),
  updateStatementTransaction
);

/**
 * @swagger
 * /api/v1/statements/{id}/transactions/{transactionIndex}:
 *   delete:
 *     tags: [Transactions]
 *     summary: Delete a specific transaction in a statement
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Statement ID
 *       - in: path
 *         name: transactionIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Zero-based transaction index
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete("/:id", deleteStatement);

export default router;
