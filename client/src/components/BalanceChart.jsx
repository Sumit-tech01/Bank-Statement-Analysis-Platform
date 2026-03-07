import {
  CartesianGrid,
  Line,
  LineChart,
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

const BalanceChart = ({ trend = [], loading, className = "" }) => {
  const { isDarkMode } = useTheme();
  const axisColor = isDarkMode ? "#94a3b8" : "#475569";
  const gridColor = isDarkMode ? "#334155" : "#cbd5e1";

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
        Balance Trend
      </h3>
      {loading ? (
        <div className="mt-4 h-72 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ) : trend.length ? (
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" stroke={axisColor} />
              <YAxis stroke={axisColor} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={isDarkMode ? "#38bdf8" : "#0284c7"}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                isAnimationActive
                animationDuration={900}
              />
            </LineChart>
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

export default BalanceChart;
