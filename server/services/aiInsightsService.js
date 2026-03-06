import crypto from "crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";
import { redisClient } from "../config/redis.js";

const AI_MODEL = "gemini-1.5-flash";
const AI_INSIGHTS_TTL_SECONDS = 30 * 60;
const MEMORY_CACHE = new Map();

const formatCurrency = (value = 0) =>
  `INR ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.round(Number(value || 0)))}`;

const normalizeTransaction = (transaction) => {
  const amount = Number(transaction?.amount || 0);
  const type = transaction?.type === "income" ? "income" : "expense";
  const date = new Date(transaction?.date);

  if (!Number.isFinite(amount) || Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date: date.toISOString().slice(0, 10),
    description: String(transaction?.description || "").trim(),
    amount: Math.abs(amount),
    type,
    category: String(transaction?.category || "general").trim() || "general",
  };
};

const normalizeTransactions = (transactions = []) =>
  transactions.map(normalizeTransaction).filter(Boolean);

const buildTransactionFingerprint = (transactions) => {
  const hash = crypto.createHash("sha256");
  const sorted = [...transactions].sort((left, right) => {
    const leftKey = `${left.date}|${left.description}|${left.amount}|${left.type}|${left.category}`;
    const rightKey = `${right.date}|${right.description}|${right.amount}|${right.type}|${right.category}`;
    return leftKey.localeCompare(rightKey);
  });

  for (const row of sorted) {
    hash.update(
      `${row.date}|${row.description}|${row.amount}|${row.type}|${row.category}\n`
    );
  }

  return hash.digest("hex");
};

const makeCacheKey = (userId, fingerprint) =>
  `ai-insights:${userId || "anonymous"}:${fingerprint}`;

const readMemoryCache = (key) => {
  const entry = MEMORY_CACHE.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    MEMORY_CACHE.delete(key);
    return null;
  }

  return entry.value;
};

const writeMemoryCache = (key, value, ttlSeconds) => {
  MEMORY_CACHE.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const readInsightsCache = async (key) => {
  if (redisClient.isReady) {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      logger.warn({ error: error.message }, "AI insights cache read failed, using memory cache");
    }
  }

  return readMemoryCache(key);
};

const writeInsightsCache = async (key, value, ttlSeconds) => {
  if (redisClient.isReady) {
    try {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      return;
    } catch (error) {
      logger.warn({ error: error.message }, "AI insights cache write failed, using memory cache");
    }
  }

  writeMemoryCache(key, value, ttlSeconds);
};

const computeSummary = (transactions) => {
  const summary = {
    count: transactions.length,
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    expenseByCategory: {},
    monthly: {},
  };

  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    if (!summary.monthly[month]) {
      summary.monthly[month] = { income: 0, expenses: 0 };
    }

    if (transaction.type === "income") {
      summary.totalIncome += transaction.amount;
      summary.monthly[month].income += transaction.amount;
    } else {
      summary.totalExpenses += transaction.amount;
      summary.monthly[month].expenses += transaction.amount;
      summary.expenseByCategory[transaction.category] =
        (summary.expenseByCategory[transaction.category] || 0) + transaction.amount;
    }
  }

  summary.balance = summary.totalIncome - summary.totalExpenses;

  const topCategories = Object.entries(summary.expenseByCategory)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    }));

  const recentMonths = Object.entries(summary.monthly)
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-6)
    .map(([month, totals]) => ({
      month,
      income: Number(totals.income.toFixed(2)),
      expenses: Number(totals.expenses.toFixed(2)),
    }));

  return {
    ...summary,
    totalIncome: Number(summary.totalIncome.toFixed(2)),
    totalExpenses: Number(summary.totalExpenses.toFixed(2)),
    balance: Number(summary.balance.toFixed(2)),
    topCategories,
    recentMonths,
  };
};

const toStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const parseGeminiJson = (rawText) => {
  const cleaned = String(rawText || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const directParse = () => JSON.parse(cleaned);
  const fallbackParse = () => {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start < 0 || end < 0 || end <= start) {
      throw new Error("Gemini response does not contain JSON object.");
    }

    const slice = cleaned.slice(start, end + 1);
    return JSON.parse(slice);
  };

  try {
    return directParse();
  } catch (_error) {
    return fallbackParse();
  }
};

const fallbackInsightPayload = (transactions) => {
  if (!transactions.length) {
    return {
      source: "fallback",
      insights: [
        "No transactions found yet. Upload statements to generate personalized insights.",
        "Set a monthly spending budget per category to start tracking financial health.",
        "Add your recurring income entries to improve saving projections.",
      ],
      sections: {
        spendingInsights: [],
        budgetingSuggestions: [],
        unusualPatterns: [],
      },
    };
  }

  const summary = computeSummary(transactions);
  const insights = [];

  insights.push(
    `You recorded ${summary.count} transactions with income ${formatCurrency(
      summary.totalIncome
    )} and expenses ${formatCurrency(summary.totalExpenses)}.`
  );

  const topCategory = summary.topCategories[0];
  if (topCategory && summary.totalExpenses > 0) {
    const percentage = ((topCategory.amount / summary.totalExpenses) * 100).toFixed(1);
    insights.push(
      `${topCategory.category} accounts for ${percentage}% of your total spending.`
    );
  }

  if (summary.balance >= 0) {
    insights.push(`You are cash-flow positive with net savings of ${formatCurrency(summary.balance)}.`);
  } else {
    insights.push(
      `You are spending more than income by ${formatCurrency(Math.abs(summary.balance))}.`
    );
  }

  if (summary.recentMonths.length >= 2) {
    const current = summary.recentMonths[summary.recentMonths.length - 1];
    const previous = summary.recentMonths[summary.recentMonths.length - 2];

    if (previous.expenses > 0) {
      const change = ((current.expenses - previous.expenses) / previous.expenses) * 100;
      insights.push(
        `Monthly expenses changed by ${change.toFixed(1)}% (${current.month} vs ${previous.month}).`
      );
    }
  }

  if (topCategory) {
    const savingsOpportunity = topCategory.amount * 0.1;
    insights.push(
      `Reducing ${topCategory.category} spending by 10% can save about ${formatCurrency(
        savingsOpportunity
      )} next month.`
    );
  }

  return {
    source: "fallback",
    insights: insights.slice(0, 6),
    sections: {
      spendingInsights: insights.slice(0, 2),
      budgetingSuggestions: insights.slice(2, 4),
      unusualPatterns: insights.slice(4, 6),
    },
  };
};

const callGeminiInsights = async (transactions) => {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const summary = computeSummary(transactions);
  const recentTransactions = [...transactions]
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-120);

  const prompt = `
You are a financial analytics assistant.
Analyze the provided transaction data and return strict JSON only.

Required JSON format:
{
  "spendingInsights": ["..."],
  "budgetingSuggestions": ["..."],
  "unusualPatterns": ["..."]
}

Rules:
- Keep each point concise (max 25 words).
- Provide 2-3 points for each array.
- Do not use markdown.
- Base all statements only on supplied data.

Data summary:
${JSON.stringify(
  {
    totals: {
      transactionCount: summary.count,
      totalIncome: summary.totalIncome,
      totalExpenses: summary.totalExpenses,
      balance: summary.balance,
    },
    topExpenseCategories: summary.topCategories,
    monthlyTrend: summary.recentMonths,
    recentTransactions,
  },
  null,
  2
)}
  `.trim();

  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: AI_MODEL });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const rawText = response.text();

  logger.debug(
    {
      provider: "gemini",
      responsePreview: rawText.slice(0, 1000),
    },
    "Gemini AI insights raw response"
  );

  const parsed = parseGeminiJson(rawText);

  const spendingInsights = toStringArray(parsed?.spendingInsights);
  const budgetingSuggestions = toStringArray(parsed?.budgetingSuggestions);
  const unusualPatterns = toStringArray(parsed?.unusualPatterns);

  const combined = [...spendingInsights, ...budgetingSuggestions, ...unusualPatterns].slice(0, 9);

  if (!combined.length) {
    throw new Error("Gemini returned no usable insights.");
  }

  return {
    source: "gemini",
    insights: combined,
    sections: {
      spendingInsights,
      budgetingSuggestions,
      unusualPatterns,
    },
  };
};

export const generateFallbackInsights = (transactions) =>
  fallbackInsightPayload(normalizeTransactions(transactions));

export const generateFinancialInsights = async (transactions, options = {}) => {
  const normalizedTransactions = normalizeTransactions(transactions);
  const fingerprint = buildTransactionFingerprint(normalizedTransactions);
  const cacheKey = makeCacheKey(options.userId || "user", fingerprint);

  const cached = await readInsightsCache(cacheKey);
  if (cached) {
    return { ...cached, cacheHit: true };
  }

  let payload;

  try {
    payload = await callGeminiInsights(normalizedTransactions);
  } catch (error) {
    logger.warn(
      {
        error: error.message,
        userId: options.userId || null,
      },
      "Gemini insights failed; returning fallback insights"
    );
    payload = fallbackInsightPayload(normalizedTransactions);
  }

  const response = {
    ...payload,
    cacheHit: false,
    generatedAt: new Date().toISOString(),
  };

  await writeInsightsCache(cacheKey, response, AI_INSIGHTS_TTL_SECONDS);
  return response;
};
