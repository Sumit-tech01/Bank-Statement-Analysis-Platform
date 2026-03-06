import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../hooks/useAuth.js";
import { formatCurrency } from "../utils/formatters.js";

const AnalyticsSummaryPage = () => {
  const { user } = useAuth();
  const [adminUserId, setAdminUserId] = useState("");
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    categorySpendingSummary: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const maxCategorySpend = useMemo(() => {
    const values = summary.categorySpendingSummary.map((item) => Number(item.totalSpent || 0));
    return Math.max(...values, 1);
  }, [summary.categorySpendingSummary]);

  const fetchSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const params =
        user?.role === "admin" && adminUserId.trim() ? { userId: adminUserId.trim() } : {};
      const response = await axiosClient.get("/analysis/summary", { params });
      const data = response.data?.data || {};

      setSummary({
        totalIncome: Number(data.totalIncome || 0),
        totalExpenses: Number(data.totalExpenses || 0),
        balance: Number(data.balance || 0),
        categorySpendingSummary: Array.isArray(data.categorySpendingSummary)
          ? data.categorySpendingSummary
          : [],
      });
    } catch (fetchError) {
      setError(fetchError?.response?.data?.message || "Failed to load summary.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl text-slate-900">Analytics Summary</h2>
          <p className="mt-1 text-slate-600">
            Detailed spending analysis grouped by transaction category.
          </p>
        </div>

        {user?.role === "admin" ? (
          <div className="flex w-full max-w-md items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                User ID (Admin)
              </span>
              <input
                type="text"
                value={adminUserId}
                onChange={(event) => setAdminUserId(event.target.value)}
                placeholder="Optional user ObjectId"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-teal-500 transition focus:ring-2"
              />
            </label>
            <button
              type="button"
              onClick={fetchSummary}
              className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        ) : null}
      </div>

      {loading ? <p className="text-slate-700">Loading analytics...</p> : null}

      {error ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-orange-700">
          {error}
        </div>
      ) : null}

      {!loading ? (
        <div className="space-y-5">
          <section className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Income
              </p>
              <p className="mt-2 font-heading text-2xl text-emerald-900">
                {formatCurrency(summary.totalIncome)}
              </p>
            </article>
            <article className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
                Expenses
              </p>
              <p className="mt-2 font-heading text-2xl text-orange-900">
                {formatCurrency(summary.totalExpenses)}
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Balance
              </p>
              <p className="mt-2 font-heading text-2xl text-slate-900">
                {formatCurrency(summary.balance)}
              </p>
            </article>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-heading text-xl text-slate-900">Category Spending Summary</h3>
            {summary.categorySpendingSummary.length ? (
              <ul className="mt-5 space-y-3">
                {summary.categorySpendingSummary.map((item) => {
                  const amount = Number(item.totalSpent || 0);
                  const width = `${Math.max((amount / maxCategorySpend) * 100, 4)}%`;

                  return (
                    <li key={item.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">{item.category}</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-teal-500 to-amber-400"
                          style={{ width }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                No expense transactions available for summary.
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default AnalyticsSummaryPage;
