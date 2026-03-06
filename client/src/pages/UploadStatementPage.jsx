import { useMemo, useState } from "react";
import axiosClient from "../api/axiosClient.js";

const buildEmptyTransaction = () => ({
  date: "",
  description: "",
  amount: "",
  category: "",
  type: "expense",
});

const UploadStatementPage = () => {
  const [fileName, setFileName] = useState("");
  const [uploadDate, setUploadDate] = useState("");
  const [transactions, setTransactions] = useState([buildEmptyTransaction()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const transactionCount = useMemo(() => transactions.length, [transactions]);

  const handleTransactionChange = (index, field, value) => {
    setTransactions((prev) =>
      prev.map((transaction, transactionIndex) =>
        transactionIndex === index ? { ...transaction, [field]: value } : transaction
      )
    );
  };

  const addTransaction = () => {
    setTransactions((prev) => [...prev, buildEmptyTransaction()]);
  };

  const removeTransaction = (index) => {
    setTransactions((prev) => {
      if (prev.length === 1) {
        return prev;
      }

      return prev.filter((_, transactionIndex) => transactionIndex !== index);
    });
  };

  const validateTransactions = (list) => {
    return list.every(
      (item) =>
        item.date &&
        item.description.trim() &&
        item.category.trim() &&
        item.type &&
        Number.isFinite(Number(item.amount))
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!fileName.trim()) {
      setError("fileName is required.");
      return;
    }

    if (!validateTransactions(transactions)) {
      setError("Please complete all transaction fields with valid values.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fileName: fileName.trim(),
        uploadDate: uploadDate || undefined,
        transactions: transactions.map((item) => ({
          ...item,
          amount: Number(item.amount),
        })),
      };

      await axiosClient.post("/statements", payload);

      setSuccess("Statement uploaded successfully.");
      setFileName("");
      setUploadDate("");
      setTransactions([buildEmptyTransaction()]);
    } catch (submitError) {
      setError(submitError?.response?.data?.message || "Failed to upload statement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-slate-900">Upload Statement</h2>
        <p className="mt-1 text-slate-600">
          Add statement metadata and transaction rows for analysis.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">File Name</span>
            <input
              required
              type="text"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              placeholder="jan-2026-statement.pdf"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-teal-500 transition focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Upload Date</span>
            <input
              type="date"
              value={uploadDate}
              onChange={(event) => setUploadDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none ring-teal-500 transition focus:ring-2"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-lg text-slate-900">
              Transactions ({transactionCount})
            </h3>
            <button
              type="button"
              onClick={addTransaction}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Add transaction
            </button>
          </div>

          <div className="space-y-3">
            {transactions.map((transaction, index) => (
              <div
                key={`${index}-${transaction.date}-${transaction.description}`}
                className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-6"
              >
                <input
                  type="date"
                  value={transaction.date}
                  onChange={(event) =>
                    handleTransactionChange(index, "date", event.target.value)
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                />
                <input
                  type="text"
                  value={transaction.description}
                  onChange={(event) =>
                    handleTransactionChange(index, "description", event.target.value)
                  }
                  placeholder="Description"
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                />
                <input
                  type="number"
                  step="0.01"
                  value={transaction.amount}
                  onChange={(event) =>
                    handleTransactionChange(index, "amount", event.target.value)
                  }
                  placeholder="Amount"
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                />
                <input
                  type="text"
                  value={transaction.category}
                  onChange={(event) =>
                    handleTransactionChange(index, "category", event.target.value)
                  }
                  placeholder="Category"
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                />
                <select
                  value={transaction.type}
                  onChange={(event) =>
                    handleTransactionChange(index, "type", event.target.value)
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 outline-none ring-teal-500 focus:ring-2"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeTransaction(index)}
                  className="rounded-lg bg-orange-100 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-200"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-teal-600 px-5 py-2 font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Uploading..." : "Upload Statement"}
        </button>
      </form>
    </div>
  );
};

export default UploadStatementPage;
