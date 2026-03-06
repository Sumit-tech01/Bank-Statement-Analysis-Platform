import { useRef } from "react";
import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import Button from "./ui/Button.jsx";
import Card from "./ui/Card.jsx";
import Input from "./ui/Input.jsx";

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

const TransactionsTable = ({
  loading,
  error,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  rowsPerPage,
  onRowsPerPageChange,
  pageRows,
  filteredCount,
  currentPage,
  totalPages,
  onPrevPage,
  onNextPage,
  onEdit,
  onDelete,
  deleteLoadingId,
}) => {
  const touchStartX = useRef(0);

  return (
    <>
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Search Description
            </label>
            <Input
              type="text"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search description..."
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(event) => onTypeFilterChange(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(event) => onCategoryFilterChange(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">All</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              From
            </label>
            <Input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              To
            </label>
            <Input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} />
          </div>
        </div>
      </Card>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <Card className="mt-4 overflow-hidden p-0">
        <div
          className="overflow-x-auto"
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches?.[0]?.clientX || 0;
          }}
          onTouchEnd={(event) => {
            const endX = event.changedTouches?.[0]?.clientX || 0;
            const delta = endX - touchStartX.current;

            if (Math.abs(delta) < 60 || loading) {
              return;
            }

            if (delta < 0 && currentPage < totalPages) {
              onNextPage();
            }
            if (delta > 0 && currentPage > 1) {
              onPrevPage();
            }
          }}
        >
          {loading ? (
            <div className="space-y-4 p-4">
              <Skeleton height={16} width={180} />
              <Skeleton height={44} borderRadius={10} count={8} />
            </div>
          ) : pageRows.length ? (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50/90 dark:bg-slate-950/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageRows.map((row) => {
                  const rowId = `${row.statementId}-${row.transactionIndex}`;

                  return (
                    <motion.tr
                      key={row.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/35"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{row.description}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.fileName}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        {row.category}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-sm font-semibold ${
                          row.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            row.type === "income"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onEdit(row)}>
                            Edit
                          </Button>
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            disabled={deleteLoadingId === rowId}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25"
                          >
                            {deleteLoadingId === rowId ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-slate-600 dark:text-slate-300">
              No transactions match the selected filters.
            </p>
          )}
        </div>
      </Card>

      <section className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Showing <span className="font-semibold text-slate-900 dark:text-slate-100">{pageRows.length}</span> of{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredCount}</span> filtered
          transactions
        </p>

        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            Rows:
            <select
              value={rowsPerPage}
              onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
              className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onPrevPage} disabled={currentPage <= 1} className="px-3 py-1.5">
              Prev
            </Button>

            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="secondary"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5"
            >
              Next
            </Button>
          </div>
        </div>
      </section>
      <p className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">Swipe table left or right to change pages.</p>
    </>
  );
};

export default TransactionsTable;
