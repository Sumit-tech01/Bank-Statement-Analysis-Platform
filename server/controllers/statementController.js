import Statement from "../models/Statement.js";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parseStatementFile } from "../services/statementParser.js";
import { clearUserCache } from "../middleware/cache.middleware.js";
import logger from "../utils/logger.js";

const ensureAuthenticated = (req) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized.");
  }
};

const canAccessStatement = (req, statement) => {
  if (req.user.role === "admin") {
    return true;
  }

  return statement.userId.toString() === req.user.id;
};

const resolveOwnerId = (req, providedUserId) => {
  if (req.user.role !== "admin" && providedUserId && providedUserId !== req.user.id) {
    throw new ApiError(403, "You can upload statements only for your own account.");
  }

  return req.user.role === "admin" && providedUserId ? providedUserId : req.user.id;
};

const assertTransactionsPresent = (transactions, message = "No transactions detected.") => {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    throw new ApiError(422, message);
  }
};

const normalizeDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const normalizeTextKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const buildTransactionKey = (transaction) => {
  const dateKey = normalizeDateKey(transaction?.date);
  if (!dateKey) {
    return null;
  }

  const amount = Number(transaction?.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const description = normalizeTextKey(transaction?.description);
  const category = normalizeTextKey(transaction?.category || "uncategorized");
  const type = transaction?.type === "income" ? "income" : "expense";

  if (!description || description.length < 3) {
    return null;
  }

  return [
    dateKey,
    description,
    Number(amount).toFixed(2),
    type,
    category || "uncategorized",
  ].join("|");
};

const dedupeIncomingTransactions = (transactions) => {
  const seen = new Set();
  const unique = [];

  for (const transaction of transactions || []) {
    const key = buildTransactionKey(transaction);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(transaction);
  }

  return unique;
};

const getDateBounds = (transactions) => {
  let min = null;
  let max = null;

  for (const transaction of transactions) {
    const date = new Date(transaction.date);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    if (!min || date < min) {
      min = date;
    }
    if (!max || date > max) {
      max = date;
    }
  }

  if (!min || !max) {
    return null;
  }

  min.setUTCHours(0, 0, 0, 0);
  max.setUTCHours(23, 59, 59, 999);
  return { min, max };
};

const filterExistingTransactions = async (ownerId, transactions) => {
  const uniqueIncoming = dedupeIncomingTransactions(transactions);
  if (!uniqueIncoming.length) {
    return { transactions: [], duplicatesRemoved: transactions.length };
  }

  const bounds = getDateBounds(uniqueIncoming);
  const query = { userId: ownerId };

  if (bounds) {
    query["transactions.date"] = {
      $gte: bounds.min,
      $lte: bounds.max,
    };
  }

  const existingStatements = await Statement.find(query, { transactions: 1 }).lean();
  const existingKeys = new Set();

  for (const statement of existingStatements) {
    for (const transaction of statement.transactions || []) {
      const key = buildTransactionKey(transaction);
      if (key) {
        existingKeys.add(key);
      }
    }
  }

  const filtered = uniqueIncoming.filter(
    (transaction) => !existingKeys.has(buildTransactionKey(transaction))
  );

  return {
    transactions: filtered,
    duplicatesRemoved: (transactions?.length || 0) - filtered.length,
  };
};

const invalidateStatementCaches = async (req, ownerId) => {
  await clearUserCache(ownerId);
  if (req.user?.id && req.user.id !== ownerId) {
    await clearUserCache(req.user.id);
  }
};

const getStatementWithAccess = async (req, statementId) => {
  const statement = await Statement.findById(statementId);

  if (!statement) {
    throw new ApiError(404, "Statement not found.");
  }

  if (!canAccessStatement(req, statement)) {
    throw new ApiError(403, "You are not allowed to access this statement.");
  }

  return statement;
};

export const uploadStatement = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  const payload = req.validated?.body || req.body;
  const { fileName, uploadDate, transactions = [], userId } = payload;

  if (!fileName) {
    throw new ApiError(400, "fileName is required.");
  }

  const ownerId = resolveOwnerId(req, userId);
  const { transactions: filteredTransactions, duplicatesRemoved } =
    await filterExistingTransactions(ownerId, transactions);
  assertTransactionsPresent(
    filteredTransactions,
    "No new valid transactions to save. Uploaded data may be empty or duplicated."
  );

  const statement = await Statement.create({
    userId: ownerId,
    fileName,
    uploadDate: uploadDate || new Date(),
    transactions: filteredTransactions,
  });
  await invalidateStatementCaches(req, ownerId);

  res.status(201).json({
    success: true,
    message: "Statement uploaded successfully.",
    data: statement,
    meta: {
      savedTransactions: filteredTransactions.length,
      duplicatesRemoved,
    },
  });
});

export const uploadStatementFile = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  if (!req.file) {
    throw new ApiError(400, "No file uploaded. Please attach a statement file.");
  }

  const ownerId = resolveOwnerId(req, req.body?.userId);
  const parsed = await parseStatementFile(req.file);
  assertTransactionsPresent(
    parsed.transactions,
    "No valid transactions detected. Please upload a clearer statement or add transactions manually."
  );

  const { transactions: filteredTransactions, duplicatesRemoved } =
    await filterExistingTransactions(ownerId, parsed.transactions);
  assertTransactionsPresent(
    filteredTransactions,
    "All extracted transactions already exist in your account."
  );

  const statement = await Statement.create({
    userId: ownerId,
    fileName: req.file.originalname,
    uploadDate: new Date(),
    transactions: filteredTransactions,
  });
  await invalidateStatementCaches(req, ownerId);

  logger.info(
    {
      parserStage: parsed.stage,
      stageChain: parsed.debug?.stageChain || [parsed.stage],
      parsedTransactions: parsed.transactions.length,
      savedTransactions: filteredTransactions.length,
      duplicatesRemoved,
      fileName: req.file.originalname,
    },
    "Statement upload parsing pipeline completed"
  );

  res.status(201).json({
    success: true,
    message: "Statement file uploaded and parsed successfully.",
    data: statement,
    meta: {
      parsedTransactions: parsed.transactions.length,
      savedTransactions: filteredTransactions.length,
      duplicatesRemoved,
      parserStage: parsed.stage,
      stageChain: parsed.debug?.stageChain || [parsed.stage],
    },
  });
});

export const addManualTransaction = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  const payload = req.validated?.body || req.body;
  const { date, description, amount, type, category, userId } = payload;
  const ownerId = resolveOwnerId(req, userId);
  const { transactions: filteredTransactions, duplicatesRemoved } =
    await filterExistingTransactions(ownerId, [
      {
        date,
        description,
        amount,
        type,
        category,
      },
    ]);
  assertTransactionsPresent(
    filteredTransactions,
    "This transaction already exists and was not added again."
  );

  const statement = await Statement.create({
    userId: ownerId,
    fileName: `manual-entry-${new Date().toISOString()}`,
    uploadDate: new Date(),
    transactions: filteredTransactions,
  });
  await invalidateStatementCaches(req, ownerId);

  res.status(201).json({
    success: true,
    message: "Manual transaction added successfully.",
    data: statement,
    meta: {
      savedTransactions: filteredTransactions.length,
      duplicatesRemoved,
    },
  });
});

export const getUserStatements = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  const query = req.user.role === "admin" ? {} : { userId: req.user.id };
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 10;
  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? Math.min(limit, 100) : 10;
  const skip = (safePage - 1) * safeLimit;

  const [statements, total] = await Promise.all([
    Statement.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Statement.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    data: statements,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  });
});

export const getStatementById = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  const { id } = req.params;
  const statement = await getStatementWithAccess(req, id);

  res.status(200).json({
    success: true,
    data: statement,
  });
});

export const updateStatementTransaction = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  const payload = req.validated || {};
  const { id } = req.params;
  const transactionIndex = Number.parseInt(req.params.transactionIndex, 10);
  const updates = payload.body || req.body || {};
  const statement = await getStatementWithAccess(req, id);

  if (
    Number.isNaN(transactionIndex) ||
    transactionIndex < 0 ||
    transactionIndex >= statement.transactions.length
  ) {
    throw new ApiError(404, "Transaction not found.");
  }

  const transaction = statement.transactions[transactionIndex];

  if (updates.date) {
    transaction.date = updates.date;
  }
  if (updates.description) {
    transaction.description = updates.description;
  }
  if (updates.amount) {
    transaction.amount = updates.amount;
  }
  if (updates.type) {
    transaction.type = updates.type;
  }
  if (updates.category) {
    transaction.category = updates.category;
  }

  await statement.save();
  await invalidateStatementCaches(req, statement.userId.toString());

  res.status(200).json({
    success: true,
    message: "Transaction updated successfully.",
    data: {
      statementId: statement._id,
      transactionIndex,
      transaction: statement.transactions[transactionIndex],
    },
  });
});

export const deleteStatementTransaction = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  const { id } = req.params;
  const transactionIndex = Number.parseInt(req.params.transactionIndex, 10);
  const statement = await getStatementWithAccess(req, id);

  if (
    Number.isNaN(transactionIndex) ||
    transactionIndex < 0 ||
    transactionIndex >= statement.transactions.length
  ) {
    throw new ApiError(404, "Transaction not found.");
  }

  statement.transactions.splice(transactionIndex, 1);

  if (statement.transactions.length === 0) {
    await statement.deleteOne();
    await invalidateStatementCaches(req, statement.userId.toString());

    res.status(200).json({
      success: true,
      message: "Transaction deleted. Statement removed because it had no transactions left.",
    });
    return;
  }

  await statement.save();
  await invalidateStatementCaches(req, statement.userId.toString());

  res.status(200).json({
    success: true,
    message: "Transaction deleted successfully.",
    data: {
      statementId: statement._id,
      remainingTransactions: statement.transactions.length,
    },
  });
});

export const deleteStatement = asyncHandler(async (req, res) => {
  ensureAuthenticated(req);

  const { id } = req.params;
  const statement = await getStatementWithAccess(req, id);
  const ownerId = statement.userId.toString();
  await statement.deleteOne();
  await invalidateStatementCaches(req, ownerId);

  res.status(200).json({
    success: true,
    message: "Statement deleted successfully.",
  });
});
