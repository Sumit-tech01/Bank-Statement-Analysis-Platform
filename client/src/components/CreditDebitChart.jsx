import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTheme } from "../hooks/useTheme.js";
import Card from "./ui/Card.jsx";

const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const CreditDebitChart = ({ data, loading, className = "" }) => {
  const { isDarkMode } = useTheme();
  const credit = Number(data?.credit || 0);
  const debit = Number(data?.debit || 0);

  const chartData = [
    { name: "Credit", value: credit, color: "#10b981" },
    { name: "Debit", value: debit, color: "#f43f5e" },
  ].filter((item) => item.value > 0);

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
        Credit vs Debit
      </h3>
      {loading ? (
        <div className="mt-4 h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : chartData.length ? (
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={54}
                outerRadius={92}
                isAnimationActive
                animationDuration={800}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-6 text-sm text-amber-700 dark:text-amber-300">
          No transactions detected.
        </p>
      )}
    </Card>
  );
};

export default CreditDebitChart;
