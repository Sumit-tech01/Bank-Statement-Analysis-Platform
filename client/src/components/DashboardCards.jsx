import { motion } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import Card from "./ui/Card.jsx";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const iconPaths = {
  income: (
    <path
      d="M12 19.5V4.5m0 0 4.5 4.5M12 4.5 7.5 9M4.5 19.5h15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  expense: (
    <path
      d="M12 4.5v15m0 0 4.5-4.5M12 19.5 7.5 15M4.5 4.5h15"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  balance: (
    <path
      d="M4.5 8.25h15m-15 7.5h15M7.5 4.5h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9a3 3 0 0 1 3-3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  transactions: (
    <path
      d="M5.25 5.25h13.5v13.5H5.25zM8.25 9h7.5m-7.5 3h7.5m-7.5 3h4.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

const DashboardCards = ({ summary, transactionCount, loading }) => {
  const totalCredit = Number(summary.totalCredit ?? summary.totalIncome ?? 0);
  const totalDebit = Number(summary.totalDebit ?? summary.totalExpenses ?? 0);
  const savingsRate = totalCredit
    ? ((summary.balance / totalCredit) * 100).toFixed(1)
    : "0.0";

  const metrics = [
    {
      key: "income",
      title: "Total Credit",
      value: formatCurrency(totalCredit),
      tone: "text-emerald-600 dark:text-emerald-400",
      trend: "+ cash inflow",
    },
    {
      key: "expense",
      title: "Total Debit",
      value: formatCurrency(totalDebit),
      tone: "text-rose-600 dark:text-rose-400",
      trend: "outflow tracked",
    },
    {
      key: "balance",
      title: "Net Balance",
      value: formatCurrency(summary.balance),
      tone:
        summary.balance >= 0
          ? "text-sky-700 dark:text-sky-300"
          : "text-amber-700 dark:text-amber-300",
      trend: `${Number(savingsRate) >= 0 ? "+" : ""}${savingsRate}% savings rate`,
    },
    {
      key: "transactions",
      title: "Transaction Count",
      value: Number(transactionCount || 0).toLocaleString("en-IN"),
      tone: "text-slate-900 dark:text-slate-100",
      trend: "activity log",
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
          Financial Snapshot
        </h2>
      </div>

      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.08,
            },
          },
        }}
      >
        {metrics.map((metric) => (
          <Card
            key={metric.key}
            asMotion
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            whileHover={{ y: -4 }}
            className="p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {metric.title}
                </p>
                {loading ? (
                  <div className="mt-3">
                    <Skeleton height={34} width={120} borderRadius={10} />
                  </div>
                ) : (
                  <p className={`mt-2 text-2xl font-bold ${metric.tone}`}>{metric.value}</p>
                )}
              </div>

              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  {iconPaths[metric.key]}
                </svg>
              </span>
            </div>

            {loading ? (
              <div className="mt-3">
                <Skeleton height={14} width={100} borderRadius={8} />
              </div>
            ) : (
              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                {metric.trend}
              </p>
            )}
          </Card>
        ))}
      </motion.div>
    </section>
  );
};

export default DashboardCards;
