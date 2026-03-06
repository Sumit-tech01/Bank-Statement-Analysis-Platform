import { useTheme } from "../hooks/useTheme.js";

const iconClass = "h-5 w-5";

const ThemeToggle = ({ showLabel = false, className = "", labelClassName = "" }) => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        className,
      ].join(" ")}
    >
      {isDarkMode ? (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path
            d="M12 4.5v2.25m0 10.5V19.5m7.5-7.5h-2.25m-10.5 0H4.5m12.803 4.803-1.59-1.59M8.287 8.287l-1.59-1.59m10.606 0-1.59 1.59m-7.426 7.426-1.59 1.59M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className={iconClass}>
          <path
            d="M21 12.9A9 9 0 1 1 11.1 3a7.5 7.5 0 0 0 9.9 9.9Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {showLabel ? (
        <span className={labelClassName || "truncate"}>
          {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </span>
      ) : null}
    </button>
  );
};

export default ThemeToggle;
