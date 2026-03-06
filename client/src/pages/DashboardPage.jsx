import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";

const DashboardPage = () => {
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    categorySpendingSummary: [],
  });
  const [recentStatements, setRecentStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const [summaryResponse, statementsResponse] = await Promise.all([
          axiosClient.get("/analysis/summary"),
          axiosClient.get("/statements"),
        ]);

        if (!isMounted) {
          return;
        }

        const summaryData = summaryResponse.data?.data || {};
        const statementsData = Array.isArray(statementsResponse.data?.data)
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
        setRecentStatements(statementsData.slice(0, 5));
      } catch (loadError) {
        if (isMounted) {
          setError(loadError?.response?.data?.message || "Failed to load dashboard data.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <p className="text-slate-700">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl text-slate-900">Dashboard</h2>
        <p className="mt-1 text-slate-600">
          Snapshot of your income, expenses, and latest uploaded statements.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-orange-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">
            Total Income
          </p>
          <p className="mt-2 font-heading text-3xl text-teal-900">
            {formatCurrency(summary.totalIncome)}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-700">
            Total Expenses
          </p>
          <p className="mt-2 font-heading text-3xl text-orange-900">
            {formatCurrency(summary.totalExpenses)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-700">Balance</p>
          <p className="mt-2 font-heading text-3xl text-slate-900">
            {formatCurrency(summary.balance)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-heading text-xl text-slate-900">Category Spending</h3>
          {summary.categorySpendingSummary.length ? (
            <ul className="mt-4 space-y-3">
              {summary.categorySpendingSummary.slice(0, 6).map((item) => (
                <li
                  key={item.category}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="font-semibold text-slate-700">{item.category}</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(item.totalSpent)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No expense categories found yet. Upload a statement to populate this section.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="font-heading text-xl text-slate-900">Recent Statements</h3>
          {recentStatements.length ? (
            <ul className="mt-4 space-y-3">
              {recentStatements.map((statement) => (
                <li
                  key={statement._id}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="font-semibold text-slate-800">{statement.fileName}</p>
                  <p className="text-sm text-slate-500">
                    Uploaded: {formatDate(statement.uploadDate || statement.createdAt)}
                  </p>
                  <p className="text-sm text-slate-500">
                    Transactions: {statement.transactions?.length || 0}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              No statements uploaded yet. Add your first statement from Upload Statement.
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
