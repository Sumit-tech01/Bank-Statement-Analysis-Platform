import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../hooks/useTheme.js";
import Card from "./ui/Card.jsx";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const TransactionChart = ({ data, loading, className = "" }) => {
  const { isDarkMode } = useTheme();
  const axisColor = isDarkMode ? "#94a3b8" : "#475569";
  const gridColor = isDarkMode ? "#334155" : "#cbd5e1";

  const chartData = [
    { metric: "Credit", value: Number(data?.credit || 0), type: "money" },
    { metric: "Debit", value: Number(data?.debit || 0), type: "money" },
    { metric: "Balance", value: Number(data?.balance || 0), type: "money" },
    {
      metric: "Transactions",
      value: Number(data?.transactionCount || 0),
      type: "count",
    },
  ];

  const tooltipStyle = {
    borderRadius: "10px",
    border: isDarkMode
      ? "1px solid rgba(100,116,139,0.35)"
      : "1px solid rgba(148,163,184,0.5)",
    background: isDarkMode ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.96)",
    color: isDarkMode ? "#e2e8f0" : "#0f172a",
  };

  return (
    <Card className={className}>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Summary Totals
      </h3>
      {loading ? (
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : (
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="metric" stroke={axisColor} />
              <YAxis stroke={axisColor} />
              <Tooltip
                formatter={(value, _name, payload) => {
                  if (payload?.payload?.type === "count") {
                    return Number(value || 0).toLocaleString("en-IN");
                  }
                  return formatCurrency(value);
                }}
                contentStyle={tooltipStyle}
              />
              <Bar
                dataKey="value"
                radius={[10, 10, 0, 0]}
                fill={isDarkMode ? "#60a5fa" : "#2563eb"}
                isAnimationActive
                animationDuration={850}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default TransactionChart;
