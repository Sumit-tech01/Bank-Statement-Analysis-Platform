import { useState } from "react";
import api from "../api/api.js";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import Input from "./ui/Input.jsx";

const initialForm = {
  date: "",
  description: "",
  amount: "",
  type: "expense",
  category: "",
};

const ManualTransactionForm = ({ onSuccess }) => {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setLoading(true);

    try {
      const payload = {
        date: form.date,
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        category: form.category,
      };

      await api.post("/statements/manual", payload);
      setSuccessMessage("Transaction added successfully.");
      setForm(initialForm);
      onSuccess?.();
    } catch (error) {
      setErrorMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save manual transaction."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">Manual Entry</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Add a transaction manually when file parsing is not required.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-700 dark:text-slate-200">
          Date
          <Input
            type="date"
            required
            value={form.date}
            onChange={(event) => updateField("date", event.target.value)}
            className="mt-1"
          />
        </label>

        <label className="text-sm text-slate-700 dark:text-slate-200">
          Amount
          <Input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={form.amount}
            onChange={(event) => updateField("amount", event.target.value)}
            className="mt-1"
            placeholder="0.00"
          />
        </label>

        <label className="text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
          Description
          <Input
            type="text"
            required
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            className="mt-1"
            placeholder="Transaction description"
          />
        </label>

        <label className="text-sm text-slate-700 dark:text-slate-200">
          Type
          <select
            value={form.type}
            onChange={(event) => updateField("type", event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="text-sm text-slate-700 dark:text-slate-200">
          Category
          <Input
            type="text"
            required
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            className="mt-1"
            placeholder="e.g. Groceries"
          />
        </label>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add Transaction"}
          </Button>
        </div>
      </form>

      {successMessage ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {errorMessage}
        </p>
      ) : null}
    </Card>
  );
};

export default ManualTransactionForm;
