const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const cardBaseClass =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";

const SummaryCards = ({ summary, transactionCount, loading }) => {
  const metrics = [
    {
      label: "Total Income",
      value: formatCurrency(summary.totalIncome),
      tone: "text-emerald-600",
    },
    {
      label: "Total Expenses",
      value: formatCurrency(summary.totalExpenses),
      tone: "text-rose-600",
    },
    {
      label: "Net Balance",
      value: formatCurrency(summary.balance),
      tone: summary.balance >= 0 ? "text-sky-700" : "text-amber-700",
    },
    {
      label: "Transactions Count",
      value: Number(transactionCount || 0).toLocaleString("en-IN"),
      tone: "text-slate-900",
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Key Metrics</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className={cardBaseClass}>
            <p className="text-sm font-medium text-slate-500">{metric.label}</p>
            {loading ? (
              <div className="mt-3 h-8 w-36 animate-pulse rounded-md bg-slate-200" />
            ) : (
              <p className={`mt-2 text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

export default SummaryCards;
