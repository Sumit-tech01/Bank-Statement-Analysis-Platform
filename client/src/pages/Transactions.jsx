import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/api.js";
import TransactionsTable from "../components/TransactionsTable.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import Input from "../components/ui/Input.jsx";
import Modal from "../components/ui/Modal.jsx";
import {
  removeNotificationsByPrefix,
  upsertNotification,
} from "../utils/notifications.js";

const toInputDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
};

const flattenTransactions = (statements) =>
  statements.flatMap((statement) =>
    (statement.transactions || []).map((transaction, index) => ({
      id: `${statement._id}-${index}`,
      statementId: statement._id,
      transactionIndex: index,
      fileName: statement.fileName,
      date: transaction.date,
      description: transaction.description,
      amount: Number(transaction.amount || 0),
      type: transaction.type,
      category: transaction.category || "Uncategorized",
    }))
  );

const initialEditState = {
  statementId: "",
  transactionIndex: -1,
  date: "",
  description: "",
  amount: "",
  type: "expense",
  category: "",
};

const Transactions = () => {
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(initialEditState);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const notifyDataUpdated = () => {
    window.dispatchEvent(new Event("statement:updated"));
  };

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/statements", {
        params: { page: 1, limit: 100 },
      });
      const records = Array.isArray(response?.data?.data) ? response.data.data : [];
      setStatements(records);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to load transactions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  useEffect(() => {
    const handleDataUpdate = () => {
      fetchStatements();
    };

    window.addEventListener("statement:updated", handleDataUpdate);
    return () => {
      window.removeEventListener("statement:updated", handleDataUpdate);
    };
  }, [fetchStatements]);

  const allTransactions = useMemo(() => {
    const rows = flattenTransactions(statements);
    return rows.sort((left, right) => new Date(right.date) - new Date(left.date));
  }, [statements]);

  const categories = useMemo(() => {
    const unique = new Set();
    allTransactions.forEach((transaction) => {
      const category = String(transaction.category || "Uncategorized").trim();
      if (category) {
        unique.add(category);
      }
    });

    return [...unique].sort((left, right) => left.localeCompare(right));
  }, [allTransactions]);

  useEffect(() => {
    const threshold = 50000;
    const recentLargeTransactions = [...allTransactions]
      .filter((transaction) => Number(transaction.amount || 0) >= threshold)
      .sort((left, right) => Number(right.amount) - Number(left.amount))
      .slice(0, 3);

    removeNotificationsByPrefix("large-transaction-");

    recentLargeTransactions.forEach((transaction) => {
      upsertNotification({
        id: `large-transaction-${transaction.id}`,
        type: "warning",
        title: "Large Transaction Alert",
        message: `${transaction.description} (${transaction.type}) of ₹${Number(
          transaction.amount
        ).toLocaleString("en-IN")} detected.`,
      });
    });
  }, [allTransactions]);

  const filteredTransactions = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const startTime = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endTime = endDate ? new Date(`${endDate}T23:59:59`).getTime() : null;

    return allTransactions.filter((transaction) => {
      const dateValue = new Date(transaction.date).getTime();

      if (typeFilter !== "all" && transaction.type !== typeFilter) {
        return false;
      }

      if (categoryFilter !== "all" && transaction.category !== categoryFilter) {
        return false;
      }

      if (startTime && dateValue < startTime) {
        return false;
      }

      if (endTime && dateValue > endTime) {
        return false;
      }

      if (searchValue) {
        const description = String(transaction.description || "").toLowerCase();
        if (!description.includes(searchValue)) {
          return false;
        }
      }

      return true;
    });
  }, [allTransactions, categoryFilter, endDate, search, startDate, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, categoryFilter, startDate, endDate, rowsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * rowsPerPage;
  const pageRows = filteredTransactions.slice(pageStart, pageStart + rowsPerPage);

  const handleDelete = async (row) => {
    if (!row.statementId || deleteLoadingId) {
      return;
    }

    const shouldDelete = window.confirm("Delete this transaction?");
    if (!shouldDelete) {
      return;
    }

    const rowId = `${row.statementId}-${row.transactionIndex}`;
    setDeleteLoadingId(rowId);
    setError("");

    try {
      await api.delete(`/statements/${row.statementId}/transactions/${row.transactionIndex}`);
      await fetchStatements();
      notifyDataUpdated();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to delete the selected transaction."
      );
    } finally {
      setDeleteLoadingId("");
    }
  };

  const handleOpenEdit = (row) => {
    setEditingTransaction({
      statementId: row.statementId,
      transactionIndex: row.transactionIndex,
      date: toInputDate(row.date),
      description: row.description,
      amount: String(row.amount),
      type: row.type,
      category: row.category,
    });
  };

  const handleEditChange = (field, value) => {
    setEditingTransaction((current) => ({ ...current, [field]: value }));
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingTransaction.statementId || editingTransaction.transactionIndex < 0) {
      return;
    }

    setEditLoading(true);
    setError("");

    try {
      await api.patch(
        `/statements/${editingTransaction.statementId}/transactions/${editingTransaction.transactionIndex}`,
        {
          date: editingTransaction.date,
          description: editingTransaction.description,
          amount: Number(editingTransaction.amount),
          type: editingTransaction.type,
          category: editingTransaction.category,
        }
      );

      setEditingTransaction(initialEditState);
      await fetchStatements();
      notifyDataUpdated();
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to update transaction."
      );
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card asMotion initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Transactions
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Review, filter, edit, and remove statement transactions.
            </p>
          </div>

          <Button variant="secondary" onClick={fetchStatements} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </Card>

      <TransactionsTable
        loading={loading}
        error={error}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        pageRows={pageRows}
        filteredCount={filteredTransactions.length}
        currentPage={safePage}
        totalPages={totalPages}
        onPrevPage={() => setCurrentPage((page) => Math.max(page - 1, 1))}
        onNextPage={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        deleteLoadingId={deleteLoadingId}
      />

      <Modal
        open={Boolean(editingTransaction.statementId)}
        title="Edit Transaction"
        onClose={() => setEditingTransaction(initialEditState)}
      >
        <form onSubmit={handleSaveEdit} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-700 dark:text-slate-200">
            Date
            <Input
              type="date"
              required
              value={editingTransaction.date}
              onChange={(event) => handleEditChange("date", event.target.value)}
              className="mt-1"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Amount
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={editingTransaction.amount}
              onChange={(event) => handleEditChange("amount", event.target.value)}
              className="mt-1"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
            Description
            <Input
              type="text"
              required
              value={editingTransaction.description}
              onChange={(event) => handleEditChange("description", event.target.value)}
              className="mt-1"
            />
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Type
            <select
              value={editingTransaction.type}
              onChange={(event) => handleEditChange("type", event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </label>

          <label className="text-sm text-slate-700 dark:text-slate-200">
            Category
            <Input
              type="text"
              required
              value={editingTransaction.category}
              onChange={(event) => handleEditChange("category", event.target.value)}
              className="mt-1"
            />
          </label>

          <div className="mt-2 flex items-center justify-end gap-2 sm:col-span-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingTransaction(initialEditState)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Link
          to="/upload?tab=manual"
          className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-xl shadow-sky-600/30 transition hover:scale-105 hover:bg-sky-500 sm:hidden"
          aria-label="Add transaction"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M12 5.25v13.5m6.75-6.75H5.25"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      </motion.div>
    </div>
  );
};

export default Transactions;
