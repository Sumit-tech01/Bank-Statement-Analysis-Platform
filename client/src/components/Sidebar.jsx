import {
  BarChart3,
  Home,
  List,
  Settings,
  Upload,
  User,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.jsx";

const links = [
  { label: "Overview", to: "/dashboard", Icon: Home },
  { label: "Upload Statement", to: "/upload", Icon: Upload },
  { label: "Transactions", to: "/transactions", Icon: List },
  { label: "Analytics", to: "/analytics", Icon: BarChart3 },
  { label: "Budget", to: "/budget", Icon: Wallet },
  { label: "Settings", to: "/settings", Icon: Settings },
  { label: "Profile", to: "/profile", Icon: User },
];

const navItemClass = ({ isActive }) =>
  [
    "group flex items-center gap-3 rounded-lg border border-transparent px-4 py-3 text-sm font-semibold transition duration-200",
    isActive
      ? "border-blue-400/20 bg-blue-500/20 text-blue-400"
      : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700/40 dark:hover:text-white",
  ].join(" ");

const Sidebar = ({ open, onNavigate }) => {
  const [isDesktop, setIsDesktop] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const updateDesktopState = () => setIsDesktop(media.matches);

    updateDesktopState();
    media.addEventListener("change", updateDesktopState);

    return () => {
      media.removeEventListener("change", updateDesktopState);
    };
  }, []);

  return (
    <motion.aside
      className={[
        "fixed inset-y-0 left-0 z-40 w-72 px-4 pb-6 pt-24 md:sticky md:top-24 md:h-[calc(100vh-6.5rem)] md:px-0 md:pt-0",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
      initial={false}
      animate={{ x: isDesktop ? 0 : open ? 0 : -320 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      <motion.div
        className="h-full rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-panel backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/70"
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Workspace
        </p>

        <nav className="mt-3 space-y-2">
          {links.map((link) => {
            const Icon = link.Icon;

            return (
              <motion.div key={link.to} whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
                <NavLink to={link.to} className={navItemClass} onClick={onNavigate}>
                  {({ isActive }) => (
                    <>
                      <span
                        className={[
                          "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition duration-200",
                          isActive
                            ? "border-blue-400/30 bg-blue-500/15 text-blue-400"
                            : "border-slate-200 bg-white/80 text-gray-400 group-hover:text-gray-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-gray-300 dark:group-hover:text-gray-100",
                        ].join(" ")}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>{link.label}</span>
                    </>
                  )}
                </NavLink>
              </motion.div>
            );
          })}
        </nav>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Current Plan
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">FinOps Pro</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            AI insights and statement parsing active.
          </p>
        </div>

        <ThemeToggle showLabel className="mt-3 w-full justify-between" />
      </motion.div>
    </motion.aside>
  );
};

export default Sidebar;
