import Statement from "../models/Statement.js";
import StatementSummary from "../models/StatementSummary.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";
import { asyncHandler } from "../utils/async-handler.js";
import { generateFinancialInsights } from "../services/aiInsightsService.js";
import logger from "../utils/logger.js";

const resolveAnalysisContext = (req) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized.");
  }

  const matchFilter = {
    userId: new mongoose.Types.ObjectId(req.user.id),
  };
  let cacheScope = req.user.id;

  if (req.user.role === "admin" && req.query.userId) {
    if (req.query.userId === "all") {
      delete matchFilter.userId;
      cacheScope = "admin-all";
      return { matchFilter, cacheScope };
    }

    if (!mongoose.isValidObjectId(req.query.userId)) {
      throw new ApiError(400, "Invalid userId query parameter.");
    }

    matchFilter.userId = new mongoose.Types.ObjectId(req.query.userId);
    cacheScope = `admin-user:${req.query.userId}`;
  }

  return { matchFilter, cacheScope };
};

const getTransactionTotals = async (matchFilter) => {
  const [overallResult, transactionCount] = await Promise.all([
    Statement.aggregate([
      { $match: matchFilter },
      { $unwind: "$transactions" },
      {
        $group: {
          _id: null,
          totalIncome: {
            $sum: {
              $cond: [
                { $in: ["$transactions.type", ["income", "credit"]] },
                { $abs: "$transactions.amount" },
                0,
              ],
            },
          },
          totalExpenses: {
            $sum: {
              $cond: [
                { $in: ["$transactions.type", ["expense", "debit"]] },
                { $abs: "$transactions.amount" },
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
      { $count: "count" },
    ]),
  ]);

  const totals = overallResult[0] || { totalIncome: 0, totalExpenses: 0 };
  const count = transactionCount[0]?.count || 0;

  return {
    totalCredit: Number(totals.totalIncome || 0),
    totalDebit: Number(totals.totalExpenses || 0),
    balance: Number(totals.totalIncome || 0) - Number(totals.totalExpenses || 0),
    transactionCount: Number(count || 0),
  };
};

const getCategorySpendingSummary = async (matchFilter) => {
  return Statement.aggregate([
    { $match: matchFilter },
    { $unwind: "$transactions" },
    { $match: { "transactions.type": { $in: ["expense", "debit"] } } },
    {
      $group: {
        _id: "$transactions.category",
        totalSpent: { $sum: { $abs: "$transactions.amount" } },
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
  ]);
};

const hasAnySummaryData = (summary) =>
  Number(summary?.transactionCount || 0) > 0 ||
  Number(summary?.totalCredit || 0) > 0 ||
  Number(summary?.totalDebit || 0) > 0;

const isSummaryDocConsistent = (summary) => {
  const totalCredit = Number(summary?.totalCredit || 0);
  const totalDebit = Number(summary?.totalDebit || 0);
  const transactionCount = Number(summary?.transactionCount || 0);

  if (totalCredit < 0 || totalDebit < 0 || transactionCount < 0) {
    return false;
  }

  if (transactionCount > 0 && totalCredit === 0 && totalDebit === 0) {
    return false;
  }

  return true;
};

const toSummaryPayload = (summary, categorySpendingSummary = []) => ({
  totalCredit: Number(summary?.totalCredit || 0),
  totalDebit: Number(summary?.totalDebit || 0),
  totalIncome: Number(summary?.totalCredit || 0),
  totalExpenses: Number(summary?.totalDebit || 0),
  balance: Number(summary?.balance || 0),
  transactionCount: Number(summary?.transactionCount || 0),
  categorySpendingSummary,
  generatedAt: summary?.generatedAt || summary?.createdAt,
});

const getTrendFromTransactions = async (matchFilter) => {
  const trend = await Statement.aggregate([
    { $match: matchFilter },
    { $unwind: "$transactions" },
    {
      $addFields: {
        transactionDate: {
          $dateToString: {
            format: "%Y-%m",
            date: "$transactions.date",
          },
        },
      },
    },
    {
      $group: {
        _id: "$transactionDate",
        credit: {
          $sum: {
            $cond: [
              { $in: ["$transactions.type", ["income", "credit"]] },
              { $abs: "$transactions.amount" },
              0,
            ],
          },
        },
        debit: {
          $sum: {
            $cond: [
              { $in: ["$transactions.type", ["expense", "debit"]] },
              { $abs: "$transactions.amount" },
              0,
            ],
          },
        },
        transactionCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trend.map((item, index) => ({
    index: index + 1,
    label: `${item._id}-01`,
    createdAt: `${item._id}-01T00:00:00.000Z`,
    credit: Number(item.credit || 0),
    debit: Number(item.debit || 0),
    balance: Number(item.credit || 0) - Number(item.debit || 0),
    transactionCount: Number(item.transactionCount || 0),
  }));
};

export const generateSummary = asyncHandler(async (req, res) => {
  const { matchFilter } = resolveAnalysisContext(req);
  const hasScopedUser = Boolean(matchFilter.userId);

  const latestSummary = hasScopedUser
    ? await StatementSummary.findOne(matchFilter).sort({ createdAt: -1 }).lean()
    : null;

  if (latestSummary) {
    const latestHasData = hasAnySummaryData(latestSummary);
    const latestIsConsistent = isSummaryDocConsistent(latestSummary);

    if (!latestIsConsistent || !latestHasData) {
      const [totals, categoryResult] = await Promise.all([
        getTransactionTotals(matchFilter),
        getCategorySpendingSummary(matchFilter),
      ]);
      const aggregateHasData = hasAnySummaryData(totals);

      if (!latestIsConsistent || aggregateHasData) {
        const payload = {
          totalCredit: totals.totalCredit,
          totalDebit: totals.totalDebit,
          totalIncome: totals.totalCredit,
          totalExpenses: totals.totalDebit,
          balance: totals.balance,
          transactionCount: totals.transactionCount,
          categorySpendingSummary: categoryResult,
        };

        logger.warn(
          {
            userId: String(matchFilter.userId || "all"),
            summaryId: latestSummary._id,
            latestSummary,
            aggregatePayload: payload,
          },
          "Latest summary snapshot was empty/inconsistent; using aggregate fallback"
        );
        console.log("Returning summary", payload);

        res.status(200).json({
          success: true,
          data: payload,
          meta: {
            hasData: aggregateHasData,
            source: "aggregate-fallback",
          },
        });
        return;
      }
    }

    const categoryResult = await getCategorySpendingSummary(matchFilter);
    const hasData = latestHasData;

    console.log("Summary fetched", {
      userId: String(matchFilter.userId || "all"),
      summaryId: latestSummary._id,
      totalCredit: latestSummary.totalCredit,
      totalDebit: latestSummary.totalDebit,
      balance: latestSummary.balance,
      transactionCount: latestSummary.transactionCount,
      createdAt: latestSummary.createdAt,
    });
    logger.info(
      {
        userId: String(matchFilter.userId || "all"),
        summaryId: latestSummary._id,
        totalCredit: latestSummary.totalCredit,
        totalDebit: latestSummary.totalDebit,
        balance: latestSummary.balance,
        transactionCount: latestSummary.transactionCount,
        createdAt: latestSummary.createdAt,
      },
      "Summary fetched"
    );

    const payload = toSummaryPayload(latestSummary, categoryResult);

    logger.info(
      {
        userId: String(matchFilter.userId || "all"),
        source: "statement-summary",
        returnedSummary: payload,
      },
      "Summary returned"
    );
    console.log("Returning summary", payload);

    res.status(200).json({
      success: true,
      data: payload,
      meta: {
        hasData,
        source: "statement-summary",
      },
    });
    return;
  }

  logger.info(
    {
      userId: String(matchFilter.userId || "all"),
    },
    "Summary fetched: no latest summary document, using aggregate fallback"
  );
  console.log("Summary fetched", null);

  const [totals, categoryResult] = await Promise.all([
    getTransactionTotals(matchFilter),
    getCategorySpendingSummary(matchFilter),
  ]);

  const hasData =
    totals.transactionCount > 0 ||
    totals.totalCredit > 0 ||
    totals.totalDebit > 0;

  const payload = {
    totalCredit: totals.totalCredit,
    totalDebit: totals.totalDebit,
    totalIncome: totals.totalCredit,
    totalExpenses: totals.totalDebit,
    balance: totals.balance,
    transactionCount: totals.transactionCount,
    categorySpendingSummary: categoryResult,
  };

  logger.info(
    {
      userId: String(matchFilter.userId || "all"),
      source: "aggregate-fallback",
      hasData,
      returnedSummary: payload,
    },
    "Summary returned"
  );
  console.log("Returning summary", payload);

  res.status(200).json({
    success: true,
    data: payload,
    meta: {
      hasData,
      source: "aggregate-fallback",
      message: hasData ? undefined : "No summary available",
    },
  });
});

export const generateChart = asyncHandler(async (req, res) => {
  const { matchFilter } = resolveAnalysisContext(req);
  const hasScopedUser = Boolean(matchFilter.userId);
  const summaryQuery = hasScopedUser ? matchFilter : {};

  const recentSummaries = await StatementSummary.find(summaryQuery)
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  if (recentSummaries.length) {
    const trend = [...recentSummaries]
      .reverse()
      .map((item, index) => ({
        index: index + 1,
        label: new Date(item.createdAt).toISOString().slice(0, 10),
        createdAt: item.createdAt,
        credit: Number(item.totalCredit || 0),
        debit: Number(item.totalDebit || 0),
        balance: Number(item.balance || 0),
        transactionCount: Number(item.transactionCount || 0),
      }));

    const latest = trend[trend.length - 1] || null;
    const hasTrendData =
      trend.length > 0 &&
      trend.some(
        (item) =>
          Number(item.credit || 0) > 0 ||
          Number(item.debit || 0) > 0 ||
          Number(item.transactionCount || 0) > 0
      );

    if (latest && hasTrendData) {
      res.status(200).json({
        success: true,
        data: {
          credit: latest.credit,
          debit: latest.debit,
          balance: latest.balance,
          transactionCount: latest.transactionCount,
          trend,
        },
      });
      return;
    }
  }

  const statementTrend = await getTrendFromTransactions(matchFilter);
  if (statementTrend.length) {
    const latest = statementTrend[statementTrend.length - 1];

    res.status(200).json({
      success: true,
      data: {
        credit: latest.credit,
        debit: latest.debit,
        balance: latest.balance,
        transactionCount: latest.transactionCount,
        trend: statementTrend,
      },
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      credit: 0,
      debit: 0,
      balance: 0,
      transactionCount: 0,
      trend: [],
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
