import { useEffect, useState } from "react";
import ThemeToggle from "../components/ThemeToggle.jsx";
import { useTheme } from "../hooks/useTheme.js";

const SETTINGS_KEY = "bsa_settings";

const defaultSettings = {
  notificationsEnabled: true,
  currency: "INR",
};

const readSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (_error) {
    return null;
  }
};

const Settings = () => {
  const { isDarkMode, setTheme } = useTheme();
  const [settings, setSettings] = useState(defaultSettings);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const storedSettings = readSettings();

    setSettings({
      ...defaultSettings,
      ...(storedSettings || {}),
    });
  }, []);

  const updateSetting = (key, value) => {
    setSuccessMessage("");
    setSettings((current) => {
      const next = { ...current, [key]: value };

      return next;
    });
  };

  const handleSave = (event) => {
    event.preventDefault();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSuccessMessage("Settings saved successfully.");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Control display preferences, notifications, and currency defaults.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-panel dark:border-slate-800 dark:bg-slate-900/85">
        <form onSubmit={handleSave} className="space-y-4">
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Dark Mode</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Enable dark theme UI across the dashboard.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {isDarkMode ? "Dark" : "Light"}
              </span>
              <ThemeToggle className="h-10 w-10 px-0" />
            </div>
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Notifications</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Receive alerts for uploads and monthly insights.</p>
            </div>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(event) => updateSetting("notificationsEnabled", event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
          </label>

          <label className="block rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Currency</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">Select preferred currency formatting for finance cards.</p>
            <select
              value={settings.currency}
              onChange={(event) => updateSetting("currency", event.target.value)}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/70">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">Quick Theme Preset</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Force a specific mode from settings.
              </p>
            </div>
            <select
              value={isDarkMode ? "dark" : "light"}
              onChange={(event) => setTheme(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              Save Settings
            </button>
          </div>
        </form>

        {successMessage ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
            {successMessage}
          </p>
        ) : null}
      </section>
    </div>
  );
};

export default Settings;
