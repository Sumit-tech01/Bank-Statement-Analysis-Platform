import Card from "./ui/Card.jsx";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const SummaryCards = ({ summary, transactionCount, loading }) => {
  const totalCredit = Number(summary?.totalCredit ?? summary?.totalIncome ?? 0);
  const totalDebit = Number(summary?.totalDebit ?? summary?.totalExpenses ?? 0);
  const resolvedCount = Number(transactionCount ?? summary?.transactionCount ?? 0);

  const metrics = [
    {
      label: "Total Credit",
      value: formatCurrency(totalCredit),
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Debit",
      value: formatCurrency(totalDebit),
      tone: "text-rose-600 dark:text-rose-400",
    },
    {
      label: "Balance",
      value: formatCurrency(summary?.balance),
      tone:
        Number(summary?.balance || 0) >= 0
          ? "text-sky-700 dark:text-sky-300"
          : "text-amber-700 dark:text-amber-300",
    },
    {
      label: "Transactions",
      value: resolvedCount.toLocaleString("en-IN"),
      tone: "text-slate-900 dark:text-slate-100",
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          Summary Snapshot
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            {loading ? (
              <div className="mt-3 h-8 w-36 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
            ) : (
              <p className={`mt-2 text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
};

export default SummaryCards;
