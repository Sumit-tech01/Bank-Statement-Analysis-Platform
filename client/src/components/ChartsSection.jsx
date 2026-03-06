import { useMemo } from "react";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
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
import { useTheme } from "../hooks/useTheme.js";
import Card from "./ui/Card.jsx";

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

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const ChartsSection = ({ summary, transactions, loading, error }) => {
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

  const pieData = useMemo(
    () =>
      [
        { name: "Income", value: Number(summary.totalIncome || 0), color: "#10b981" },
        { name: "Expense", value: Number(summary.totalExpenses || 0), color: "#f43f5e" },
      ].filter((item) => item.value > 0),
    [summary.totalExpenses, summary.totalIncome]
  );

  const monthlyExpenseData = useMemo(() => {
    const grouped = new Map();

    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") {
        return;
      }

      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      grouped.set(key, (grouped.get(key) || 0) + Number(transaction.amount || 0));
    });

    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => ({
        month: monthLabel(key),
        expenses: Number(value.toFixed(2)),
      }));
  }, [transactions]);

  const balanceTrendData = useMemo(() => {
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
      } else if (transaction.type === "expense") {
        current.expense += Number(transaction.amount || 0);
      }

      grouped.set(key, current);
    });

    let runningBalance = 0;
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => {
        runningBalance += value.income - value.expense;
        return {
          month: monthLabel(key),
          balance: Number(runningBalance.toFixed(2)),
        };
      });
  }, [transactions]);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          Analytics Overview
        </h2>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <motion.div
        className="grid gap-4 xl:grid-cols-12"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.09,
            },
          },
        }}
      >
        <Card
          asMotion
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.24 }}
          className="xl:col-span-4"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Income vs Expense</h3>
          {loading ? (
            <div className="mt-6 space-y-3">
              <Skeleton height={18} width={140} borderRadius={8} />
              <Skeleton height={220} borderRadius={16} />
            </div>
          ) : pieData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={90}
                    isAnimationActive
                    animationDuration={850}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.name === "Income" ? "url(#incomeGrad)" : "url(#expenseGrad)"}
                        stroke="rgba(255,255,255,0.4)"
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">No data available for this chart.</p>
          )}
        </Card>

        <Card
          asMotion
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.24 }}
          className="xl:col-span-8"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly Expense Trend</h3>
          {loading ? (
            <div className="mt-6 space-y-3">
              <Skeleton height={18} width={180} borderRadius={8} />
              <Skeleton height={220} borderRadius={16} />
            </div>
          ) : monthlyExpenseData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenseData}>
                  <defs>
                    <linearGradient id="expenseBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb923c" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" stroke={axisColor} />
                  <YAxis stroke={axisColor} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="expenses"
                    fill="url(#expenseBarGrad)"
                    radius={[10, 10, 0, 0]}
                    isAnimationActive
                    animationDuration={900}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">No expense records available yet.</p>
          )}
        </Card>

        <Card
          asMotion
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
          transition={{ duration: 0.24 }}
          className="xl:col-span-12"
        >
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Balance Trend</h3>
          {loading ? (
            <div className="mt-6 space-y-3">
              <Skeleton height={18} width={140} borderRadius={8} />
              <Skeleton height={250} borderRadius={16} />
            </div>
          ) : balanceTrendData.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceTrendData}>
                  <defs>
                    <linearGradient id="balanceLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="month" stroke={axisColor} />
                  <YAxis stroke={axisColor} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="url(#balanceLineGrad)"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#38bdf8" }}
                    activeDot={{ r: 7, fill: "#0ea5e9" }}
                    isAnimationActive
                    animationDuration={980}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
              Upload transactions to generate a balance trend.
            </p>
          )}
        </Card>
      </motion.div>
    </section>
  );
};

export default ChartsSection;
