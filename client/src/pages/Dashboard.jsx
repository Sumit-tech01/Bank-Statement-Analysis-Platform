import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import api from "../api/api.js";
import BalanceChart from "../components/BalanceChart.jsx";
import CreditDebitChart from "../components/CreditDebitChart.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import TransactionChart from "../components/TransactionChart.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";

const BUDGET_STORAGE_KEY = "bsa_budgets";

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const flattenTransactions = (statements) =>
  statements.flatMap((statement) =>
    (statement.transactions || []).map((transaction, index) => ({
      id: `${statement._id}-${index}`,
      statementId: statement._id,
      date: transaction.date,
      description: transaction.description,
      amount: Number(transaction.amount || 0),
      category: transaction.category || "Uncategorized",
      type: transaction.type,
    }))
  );

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeCategory = (value) => String(value || "").trim().toLowerCase();

const readBudgets = () => {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item?.category && Number(item?.limit) > 0)
      : [];
  } catch (_error) {
    return [];
  }
};

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [statements, setStatements] = useState([]);
  const [chartData, setChartData] = useState({
    credit: 0,
    debit: 0,
    balance: 0,
    transactionCount: 0,
    trend: [],
  });
  const [hasSummaryData, setHasSummaryData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiInsights, setAiInsights] = useState([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState("");
  const [aiSource, setAiSource] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setAiLoading(true);
    setAiError("");

    try {
      const [summaryResponse, chartResponse, statementsResponse] = await Promise.all([
        api.get("/analysis/summary"),
        api.get("/analysis/chart"),
        api.get("/statements", { params: { page: 1, limit: 100 } }),
      ]);

      const summaryData = summaryResponse?.data?.data || {};
      const summaryMeta = summaryResponse?.data?.meta || {};
      const chartApiData = chartResponse?.data?.data || {};
      const statementsData = Array.isArray(statementsResponse?.data?.data)
        ? statementsResponse.data.data
        : [];

      const totalCredit = Number(
        summaryData.totalCredit ?? summaryData.totalIncome ?? chartApiData.credit ?? 0
      );
      const totalDebit = Number(
        summaryData.totalDebit ?? summaryData.totalExpenses ?? chartApiData.debit ?? 0
      );
      const balance = Number(summaryData.balance ?? (totalCredit - totalDebit));
      const transactionCount = Number(
        summaryData.transactionCount ?? chartApiData.transactionCount ?? 0
      );
      const trendFromApi = Array.isArray(chartApiData.trend) ? chartApiData.trend : [];
      const chartHasTotals =
        trendFromApi.length > 0 ||
        [chartApiData.credit, chartApiData.debit, chartApiData.balance, chartApiData.transactionCount]
          .map((value) => Number(value || 0))
          .some((value) => value !== 0);
      const inferredHasData =
        transactionCount > 0 || totalCredit > 0 || totalDebit > 0;
      const resolvedHasData =
        typeof summaryMeta.hasData === "boolean"
          ? summaryMeta.hasData
          : inferredHasData;

      setSummary({
        totalCredit,
        totalDebit,
        totalIncome: totalCredit,
        totalExpenses: totalDebit,
        balance,
        transactionCount,
      });
      console.log("Summary state", {
        totalCredit,
        totalDebit,
        balance,
        transactionCount,
      });
      setChartData({
        credit: chartHasTotals ? Number(chartApiData.credit || 0) : totalCredit,
        debit: chartHasTotals ? Number(chartApiData.debit || 0) : totalDebit,
        balance: chartHasTotals ? Number(chartApiData.balance || 0) : balance,
        transactionCount: chartHasTotals
          ? Number(chartApiData.transactionCount || 0)
          : transactionCount,
        trend:
          trendFromApi.length > 0
            ? trendFromApi
            : resolvedHasData
              ? [
                  {
                    index: 1,
                    label: new Date().toISOString().slice(0, 10),
                    createdAt: new Date().toISOString(),
                    credit: totalCredit,
                    debit: totalDebit,
                    balance,
                    transactionCount,
                  },
                ]
              : [],
      });
      setHasSummaryData(resolvedHasData);
      setStatements(statementsData);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "Unable to load dashboard analytics."));
      setSummary(null);
      setHasSummaryData(false);
    } finally {
      setLoading(false);
    }

    try {
      const aiResponse = await api.get("/analysis/ai-insights");
      const nextInsights = Array.isArray(aiResponse?.data?.insights)
        ? aiResponse.data.insights
        : [];
      setAiInsights(nextInsights);
      setAiSource(String(aiResponse?.data?.source || ""));
    } catch (requestError) {
      setAiError(getErrorMessage(requestError, "Unable to load AI insights."));
      setAiInsights([]);
      setAiSource("");
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const handleDataUpdate = () => {
      fetchDashboard();
    };

    window.addEventListener("statement:updated", handleDataUpdate);
    return () => {
      window.removeEventListener("statement:updated", handleDataUpdate);
    };
  }, [fetchDashboard]);

  const transactions = useMemo(() => flattenTransactions(statements), [statements]);

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort((left, right) => new Date(right.date) - new Date(left.date))
        .slice(0, 7),
    [transactions]
  );

  const categorySpending = useMemo(() => {
    const grouped = new Map();

    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") {
        return;
      }

      const category = String(transaction.category || "Uncategorized").trim();
      grouped.set(category, (grouped.get(category) || 0) + Number(transaction.amount || 0));
    });

    const total = [...grouped.values()].reduce((sum, value) => sum + value, 0);

    return [...grouped.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percent: total ? Math.min(100, (amount / total) * 100) : 0,
      }));
  }, [transactions]);

  const budgetProgress = useMemo(() => {
    const budgets = readBudgets();
    if (!budgets.length) {
      return [];
    }

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const monthSpending = new Map();

    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") {
        return;
      }

      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime()) || date.getMonth() !== month || date.getFullYear() !== year) {
        return;
      }

      const key = normalizeCategory(transaction.category || "uncategorized");
      monthSpending.set(key, (monthSpending.get(key) || 0) + Number(transaction.amount || 0));
    });

    return budgets.slice(0, 4).map((item) => {
      const category = String(item.category || "Uncategorized");
      const limit = Number(item.limit || 0);
      const spent = Number(monthSpending.get(normalizeCategory(category)) || 0);
      const percent = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;

      return {
        category,
        limit,
        spent,
        percent,
        exceeded: spent > limit,
      };
    });
  }, [transactions]);

  return (
    <div className="space-y-6">
      <Card asMotion initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
              Fintech Overview
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Financial Command Center
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Real-time analytics for statement uploads, spending behavior, and monthly trends.
            </p>
          </div>

          <Button variant="secondary" onClick={fetchDashboard} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </Card>

      {!loading && !hasSummaryData ? (
        <Card>
          <p className="text-sm text-slate-600 dark:text-slate-300">No summary yet</p>
        </Card>
      ) : (
        <SummaryCards
          summary={summary}
          transactionCount={summary?.transactionCount ?? 0}
          loading={loading}
        />
      )}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && !hasSummaryData ? null : (
        <section className="grid gap-4 xl:grid-cols-12">
          <CreditDebitChart
            className="xl:col-span-4"
            data={chartData}
            loading={loading}
          />
          <TransactionChart
            className="xl:col-span-8"
            data={chartData}
            loading={loading}
          />
          <BalanceChart
            className="xl:col-span-12"
            trend={chartData.trend}
            loading={loading}
          />
        </section>
      )}

      <motion.section
        className="grid gap-4 xl:grid-cols-12"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.08,
            },
          },
        }}
      >
        <Card
          asMotion
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="xl:col-span-7"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent Transactions
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              latest 7
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton height={14} width={100} />
              <Skeleton height={38} borderRadius={12} count={5} />
            </div>
          ) : recentTransactions.length ? (
            <div className="space-y-2">
              {recentTransactions.map((transaction) => (
                <article
                  key={transaction.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-800/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(transaction.date)} • {transaction.category || "Uncategorized"}
                    </p>
                  </div>
                  <p
                    className={`ml-3 whitespace-nowrap text-sm font-semibold ${
                      transaction.type === "income"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              No transactions available yet.
            </p>
          )}
        </Card>

        <Card
          asMotion
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="xl:col-span-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              Budget Progress
            </h2>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              this month
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton height={18} width={140} />
              <Skeleton height={22} borderRadius={999} count={4} />
            </div>
          ) : budgetProgress.length ? (
            <div className="space-y-3">
              {budgetProgress.map((item) => (
                <div key={item.category}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                      {item.category}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatCurrency(item.spent)} / {formatCurrency(item.limit)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className={`h-full transition-all ${item.exceeded ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              Set budgets in the Budget page to track category limits here.
            </p>
          )}
        </Card>

        <Card
          asMotion
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="xl:col-span-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              Spending Categories
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              <Skeleton height={18} width={120} />
              <Skeleton height={18} borderRadius={999} count={5} />
            </div>
          ) : categorySpending.length ? (
            <div className="space-y-3">
              {categorySpending.map((item) => (
                <div key={item.category}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{item.category}</span>
                    <span className="text-slate-500 dark:text-slate-400">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-sky-500/90 transition-all"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              No expense categories available yet.
            </p>
          )}
        </Card>

        <Card
          asMotion
          variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
          className="xl:col-span-8"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI Financial Insights
            </h2>
            {aiSource ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Source: {aiSource}
              </span>
            ) : null}
          </div>

          {aiLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton height={96} borderRadius={14} count={4} />
            </div>
          ) : null}

          {aiError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
              {aiError}
            </p>
          ) : null}

          {!aiLoading && !aiError ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {aiInsights.length ? (
                aiInsights.slice(0, 6).map((insight, index) => (
                  <motion.article
                    key={`${insight}-${index}`}
                    className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 transition dark:border-slate-700 dark:bg-slate-800/40"
                    whileHover={{ y: -3 }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">
                      Insight {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">{insight}</p>
                  </motion.article>
                ))
              ) : (
                <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 sm:col-span-2">
                  No AI insights available yet. Upload more transactions to improve analysis quality.
                </p>
              )}
            </div>
          ) : null}
        </Card>
      </motion.section>
    </div>
  );
};

export default Dashboard;
