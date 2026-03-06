import Statement from "../models/Statement.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { generateFinancialInsights } from "../services/aiInsightsService.js";

const resolveAnalysisContext = (req) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized.");
  }

  const matchFilter = {};
  let cacheScope = req.user.id;

  if (req.user.role !== "admin") {
    matchFilter.userId = new mongoose.Types.ObjectId(req.user.id);
  } else if (req.query.userId) {
    if (!mongoose.isValidObjectId(req.query.userId)) {
      throw new ApiError(400, "Invalid userId query parameter.");
    }

    matchFilter.userId = new mongoose.Types.ObjectId(req.query.userId);
    cacheScope = `admin-user:${req.query.userId}`;
  } else {
    cacheScope = "admin-all";
  }

  return { matchFilter, cacheScope };
};

export const generateSummary = asyncHandler(async (req, res) => {
  const { matchFilter } = resolveAnalysisContext(req);

  const [overallResult, categoryResult] = await Promise.all([
    Statement.aggregate([
      { $match: matchFilter },
      { $unwind: "$transactions" },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [
                { $eq: ["$transactions.type", "income"] },
                "$transactions.amount",
                0,
              ],
            },
          },
          totalExpenses: {
            $sum: {
              $cond: [
                { $eq: ["$transactions.type", "expense"] },
                "$transactions.amount",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalExpenses: 1,
        },
      },
    ]),
    Statement.aggregate([
      { $match: matchFilter },
      { $unwind: "$transactions" },
      { $match: { "transactions.type": "expense" } },
      {
        $group: {
          _id: "$transactions.category",
          totalSpent: { $sum: "$transactions.amount" },
        },
      },
      { $sort: { totalSpent: -1 } },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalSpent: 1,
        },
      },
    ]),
  ]);

  const totals = overallResult[0] || { totalIncome: 0, totalExpenses: 0 };
  const balance = totals.totalIncome - totals.totalExpenses;

  res.status(200).json({
    success: true,
    data: {
      totalIncome: totals.totalIncome,
      totalExpenses: totals.totalExpenses,
      balance,
      categorySpendingSummary: categoryResult,
    },
  });
});

export const generateAIInsights = asyncHandler(async (req, res) => {
  const { matchFilter, cacheScope } = resolveAnalysisContext(req);

  const transactions = await Statement.aggregate([
    { $match: matchFilter },
    { $unwind: "$transactions" },
    {
      $project: {
        _id: 0,
        date: "$transactions.date",
        description: "$transactions.description",
        amount: "$transactions.amount",
        category: "$transactions.category",
        type: "$transactions.type",
      },
    },
    { $sort: { date: 1 } },
  ]);

  const aiResult = await generateFinancialInsights(transactions, { userId: cacheScope });

  res.status(200).json({
    success: true,
    insights: aiResult.insights,
    source: aiResult.source,
    cacheHit: aiResult.cacheHit,
    generatedAt: aiResult.generatedAt,
    sections: aiResult.sections,
  });
});
