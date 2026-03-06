import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import api from "../api/api.js";
import { useTheme } from "../hooks/useTheme.js";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const monthLabel = (monthKey) => {
  const date = new Date(`${monthKey}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
};

const flattenTransactions = (statements) =>
  statements.flatMap((statement) =>
    (statement.transactions || []).map((transaction, index) => ({
      id: `${statement._id}-${index}`,
      date: transaction.date,
      amount: Number(transaction.amount || 0),
      type: transaction.type,
      category: transaction.category || "uncategorized",
    }))
  );

const Analytics = () => {
  const { isDarkMode } = useTheme();
  const axisColor = isDarkMode ? "#94a3b8" : "#475569";
  const gridColor = isDarkMode ? "#334155" : "#cbd5e1";
  const tooltipStyle = useMemo(
    () => ({
      borderRadius: "12px",
      border: isDarkMode ? "1px solid rgba(100,116,139,0.35)" : "1px solid rgba(148,163,184,0.5)",
      background: isDarkMode ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.95)",
      color: isDarkMode ? "#e2e8f0" : "#0f172a",
      boxShadow: isDarkMode
        ? "0 12px 30px rgba(2,6,23,0.35)"
        : "0 12px 30px rgba(15,23,42,0.12)",
    }),
    [isDarkMode]
  );

  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    categorySpendingSummary: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, statementsResponse] = await Promise.all([
        api.get("/analysis/summary"),
        api.get("/statements", { params: { page: 1, limit: 100 } }),
      ]);

      const summaryData = summaryResponse?.data?.data || {};
      const statementsData = Array.isArray(statementsResponse?.data?.data)
        ? statementsResponse.data.data
        : [];

      setSummary({
        totalIncome: Number(summaryData.totalIncome || 0),
        totalExpenses: Number(summaryData.totalExpenses || 0),
        balance: Number(summaryData.balance || 0),
        categorySpendingSummary: Array.isArray(summaryData.categorySpendingSummary)
          ? summaryData.categorySpendingSummary
          : [],
      });
      setTransactions(flattenTransactions(statementsData));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load analytics data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const handleDataUpdate = () => {
      loadAnalytics();
    };

    window.addEventListener("statement:updated", handleDataUpdate);
    return () => {
      window.removeEventListener("statement:updated", handleDataUpdate);
    };
  }, [loadAnalytics]);

  const monthlyComparisonData = useMemo(() => {
    const grouped = new Map();

    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = grouped.get(key) || { income: 0, expense: 0 };

      if (transaction.type === "income") {
        current.income += Number(transaction.amount || 0);
      }
      if (transaction.type === "expense") {
        current.expense += Number(transaction.amount || 0);
      }

      grouped.set(key, current);
    });

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({
        month: monthLabel(key),
        income: Number(value.income.toFixed(2)),
        expense: Number(value.expense.toFixed(2)),
      }));
  }, [transactions]);

  const categoryBreakdownData = useMemo(
    () =>
      summary.categorySpendingSummary.map((item, index) => ({
        name: item.category || "uncategorized",
        value: Number(item.totalSpent || 0),
        color: ["#0ea5e9", "#f97316", "#10b981", "#14b8a6", "#ef4444", "#64748b"][index % 6],
      })),
    [summary.categorySpendingSummary]
  );

  const topCategory = categoryBreakdownData[0];

  return (
    <div className="space-y-6">
      <Card asMotion initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Analytics
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deeper insights into spending trends, categories, and cash flow balance.
            </p>
          </div>

          <Button variant="secondary" onClick={loadAnalytics} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </Card>

      <motion.section className="grid gap-4 md:grid-cols-3" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}>
        <Card asMotion variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Total Income
          </p>
          {loading ? (
            <div className="mt-2"><Skeleton height={34} width={140} /></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(summary.totalIncome)}
            </p>
          )}
        </Card>

        <Card asMotion variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Total Expenses
          </p>
          {loading ? (
            <div className="mt-2"><Skeleton height={34} width={140} /></div>
          ) : (
            <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(summary.totalExpenses)}
            </p>
          )}
        </Card>

        <Card asMotion variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Top Expense Category
          </p>
          {loading ? (
            <div className="mt-2 space-y-2">
              <Skeleton height={24} width={120} />
              <Skeleton height={18} width={90} />
            </div>
          ) : (
            <>
              <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                {topCategory ? topCategory.name : "N/A"}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {topCategory ? formatCurrency(topCategory.value) : "No data"}
              </p>
            </>
          )}
        </Card>
      </motion.section>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <motion.section className="grid gap-4 xl:grid-cols-12" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}>
        <Card asMotion variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="xl:col-span-8">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly Spending Trend</h2>

          {loading ? (
            <div className="mt-6 space-y-3">
              <Skeleton height={18} width={180} />
              <Skeleton height={230} borderRadius={16} />
            </div>
          ) : monthlyComparisonData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyComparisonData}>
                  <defs>
                    <linearGradient id="analyticsExpenseGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#fb923c" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" stroke={axisColor} />
                  <YAxis stroke={axisColor} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="url(#analyticsExpenseGrad)"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive
                    animationDuration={850}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">No monthly trend data available.</p>
          )}
        </Card>

        <Card asMotion variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="xl:col-span-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category Breakdown</h2>

          {loading ? (
            <div className="mt-6 space-y-3">
              <Skeleton height={18} width={160} />
              <Skeleton height={230} borderRadius={16} />
            </div>
          ) : categoryBreakdownData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdownData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    isAnimationActive
                    animationDuration={900}
                  >
                    {categoryBreakdownData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">No category spending data available.</p>
          )}
        </Card>

        <Card asMotion variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="xl:col-span-12">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Income vs Expense Comparison</h2>

          {loading ? (
            <div className="mt-6 space-y-3">
              <Skeleton height={18} width={200} />
              <Skeleton height={260} borderRadius={16} />
            </div>
          ) : monthlyComparisonData.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyComparisonData}>
                  <defs>
                    <linearGradient id="incomeBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="expenseBarGradAnalytics" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" stroke={axisColor} />
                  <YAxis stroke={axisColor} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
                  <Bar dataKey="income" fill="url(#incomeBarGrad)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} />
                  <Bar dataKey="expense" fill="url(#expenseBarGradAnalytics)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
              No data available for income and expense comparison.
            </p>
          )}
        </Card>
      </motion.section>
    </div>
  );
};

export default Analytics;
