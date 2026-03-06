import { useEffect, useMemo, useState } from "react";
import api from "../api/api.js";
import {
  removeNotificationsByPrefix,
  upsertNotification,
} from "../utils/notifications.js";

const STORAGE_KEY = "bsa_budgets";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const normalizeCategory = (value) => String(value || "").trim().toLowerCase();

const loadBudgets = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item.category && Number(item.limit) > 0)
      : [];
  } catch (_error) {
    return [];
  }
};

const flattenTransactions = (statements) =>
  statements.flatMap((statement) => statement.transactions || []);

const Budget = () => {
  const [budgets, setBudgets] = useState(() => loadBudgets());
  const [transactions, setTransactions] = useState([]);
  const [categoryInput, setCategoryInput] = useState("");
  const [limitInput, setLimitInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    const fetchStatements = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/statements", {
          params: { page: 1, limit: 100 },
        });
        const statements = Array.isArray(response?.data?.data) ? response.data.data : [];
        setTransactions(flattenTransactions(statements));
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load transactions for budget tracking."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStatements();

    const handleDataUpdate = () => {
      fetchStatements();
    };

    window.addEventListener("statement:updated", handleDataUpdate);
    return () => {
      window.removeEventListener("statement:updated", handleDataUpdate);
    };
  }, []);

  const currentMonthSpending = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const totals = new Map();

    transactions.forEach((transaction) => {
      if (transaction.type !== "expense") {
        return;
      }

      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) {
        return;
      }

      if (date.getMonth() !== month || date.getFullYear() !== year) {
        return;
      }

      const key = normalizeCategory(transaction.category || "uncategorized");
      totals.set(key, (totals.get(key) || 0) + Number(transaction.amount || 0));
    });

    return totals;
  }, [transactions]);

  const budgetCards = useMemo(
    () =>
      budgets.map((budget) => {
        const key = normalizeCategory(budget.category);
        const spent = Number(currentMonthSpending.get(key) || 0);
        const limit = Number(budget.limit || 0);
        const percent = limit > 0 ? (spent / limit) * 100 : 0;

        return {
          ...budget,
          spent,
          limit,
          percent,
          exceeded: spent > limit,
        };
      }),
    [budgets, currentMonthSpending]
  );

  const totalBudget = budgetCards.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = budgetCards.reduce((sum, item) => sum + item.spent, 0);

  useEffect(() => {
    removeNotificationsByPrefix("budget-exceeded-");

    budgetCards
      .filter((item) => item.exceeded)
      .forEach((item) => {
        upsertNotification({
          id: `budget-exceeded-${normalizeCategory(item.category)}`,
          type: "warning",
          title: "Budget Alert",
          message: `${item.category} exceeded budget by ${formatCurrency(item.spent - item.limit)}.`,
        });
      });
  }, [budgetCards]);

  const handleAddBudget = (event) => {
    event.preventDefault();

    const category = categoryInput.trim();
    const limit = Number(limitInput);

    if (!category || !Number.isFinite(limit) || limit <= 0) {
      return;
    }

    setBudgets((current) => {
      const key = normalizeCategory(category);
      const existingIndex = current.findIndex(
        (item) => normalizeCategory(item.category) === key
      );

      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex ? { ...item, category, limit } : item
        );
      }

      return [...current, { category, limit }];
    });

    setCategoryInput("");
    setLimitInput("");
  };

  const handleRemove = (category) => {
    setBudgets((current) =>
      current.filter((item) => normalizeCategory(item.category) !== normalizeCategory(category))
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Budget Management
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Set monthly category budgets and monitor if spending exceeds your limits.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Total Budget
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatCurrency(totalBudget)}
          </p>
        </article>

        <article className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Current Month Spent
          </p>
          <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(totalSpent)}
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          Set Monthly Budget
        </h2>
        <form onSubmit={handleAddBudget} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="text"
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            placeholder="Category (e.g. food)"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <input
            type="number"
            min="1"
            step="0.01"
            value={limitInput}
            onChange={(event) => setLimitInput(event.target.value)}
            placeholder="Monthly limit"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            Add / Update Budget
          </button>
        </form>
      </section>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-3xl border border-slate-200/80 bg-white/95 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100" />
          </div>
        ) : budgetCards.length ? (
          budgetCards.map((item) => {
            const progressWidth = `${Math.min(item.percent, 100)}%`;

            return (
              <article
                key={normalizeCategory(item.category)}
                className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-panel dark:border-slate-800 dark:bg-slate-900/85"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {item.category}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {formatCurrency(item.spent)} spent of {formatCurrency(item.limit)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(item.category)}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className={`h-full ${
                      item.exceeded ? "bg-rose-500" : "bg-emerald-500"
                    } transition-all`}
                    style={{ width: progressWidth }}
                  />
                </div>

                <p
                  className={`mt-2 text-sm font-medium ${
                    item.exceeded
                      ? "text-rose-600 dark:text-rose-300"
                      : "text-emerald-600 dark:text-emerald-300"
                  }`}
                >
                  {item.exceeded
                    ? `Budget exceeded by ${formatCurrency(item.spent - item.limit)}`
                    : `Remaining ${formatCurrency(item.limit - item.spent)}`}
                </p>
              </article>
            );
          })
        ) : (
          <p className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 text-sm text-slate-600 shadow-panel dark:border-slate-800 dark:bg-slate-900/85 dark:text-slate-300">
            No budgets set yet. Add category budgets to start tracking progress.
          </p>
        )}
      </section>
    </div>
  );
};

export default Budget;
