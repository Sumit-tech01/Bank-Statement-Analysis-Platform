import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

const Charts = ({ summary, transactions, loading, error }) => {
  const pieData = useMemo(
    () =>
      [
        { name: "Income", value: Number(summary.totalIncome || 0), color: "#10b981" },
        { name: "Expenses", value: Number(summary.totalExpenses || 0), color: "#f43f5e" },
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
      .sort(([a], [b]) => a.localeCompare(b))
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
      .sort(([a], [b]) => a.localeCompare(b))
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
      <h2 className="text-lg font-semibold text-slate-900">Financial Analytics</h2>
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="mt-3 grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-1">
          <h3 className="text-sm font-semibold text-slate-700">Income vs Expense</h3>
          {loading ? (
            <div className="mt-8 flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            </div>
          ) : pieData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500">No data to draw this chart yet.</p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700">Monthly Expense Trend</h3>
          {loading ? (
            <div className="mt-8 flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            </div>
          ) : monthlyExpenseData.length ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenseData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="expenses" fill="#f97316" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500">No expense data to draw this chart yet.</p>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <h3 className="text-sm font-semibold text-slate-700">Balance Trend</h3>
          {loading ? (
            <div className="mt-8 flex h-72 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            </div>
          ) : balanceTrendData.length ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={balanceTrendData}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-8 text-sm text-slate-500">No trend data to draw this chart yet.</p>
          )}
        </article>
      </div>
    </section>
  );
};

export default Charts;
