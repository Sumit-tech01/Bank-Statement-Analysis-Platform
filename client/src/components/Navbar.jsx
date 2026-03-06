import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import ThemeToggle from "./ThemeToggle.jsx";
import {
  readNotifications,
  removeNotification,
} from "../utils/notifications.js";

const Navbar = ({ onToggleSidebar, pageTitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const profileMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const [notifications, setNotifications] = useState(() => readNotifications());

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const onWindowClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setShowProfileMenu(false);
      }

      if (!notificationsRef.current?.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    const refreshNotifications = () => {
      setNotifications(readNotifications());
    };

    window.addEventListener("click", onWindowClick);
    window.addEventListener("bsa-notifications-updated", refreshNotifications);
    window.addEventListener("storage", refreshNotifications);

    return () => {
      window.removeEventListener("click", onWindowClick);
      window.removeEventListener("bsa-notifications-updated", refreshNotifications);
      window.removeEventListener("storage", refreshNotifications);
    };
  }, []);

  const userInitial = String(user?.name || "U").trim().charAt(0).toUpperCase();
  const unreadCount = notifications.length;

  const notificationStyles = useMemo(
    () => ({
      success:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
      warning:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
      info: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
    }),
    []
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-lg transition-colors dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M4.5 7.5h15m-15 4.5h15m-15 4.5h15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <Link to="/dashboard" className="inline-flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-teal-500 text-white shadow-lg shadow-sky-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M12 4.5v15m7.5-7.5h-15M17.3 6.7l-10.6 10.6m10.6 0L6.7 6.7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div className="hidden sm:block">
              <p className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                Bank Statement
              </p>
              <p className="font-heading text-base font-semibold text-slate-900 dark:text-slate-100">
                Analysis Platform
              </p>
            </div>
          </Link>

          <div className="hidden h-8 border-l border-slate-300 dark:border-slate-700 lg:block" />
          <p className="hidden font-heading text-lg font-semibold text-slate-900 dark:text-slate-100 lg:block">
            {pageTitle}
          </p>
        </div>

        <div className="hidden w-full max-w-md flex-1 lg:flex">
          <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition focus-within:border-sky-400 focus-within:bg-white dark:border-slate-700 dark:bg-slate-900 dark:focus-within:bg-slate-950">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-500">
              <path
                d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              type="search"
              placeholder="Search transactions, categories, statements..."
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle className="h-10 w-10 px-0" />

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setShowNotifications((value) => !value);
                setShowProfileMenu(false);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <span className="relative inline-flex">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M14.25 18.75a2.25 2.25 0 0 1-4.5 0m-4.5-1.5h13.5c-.8-.76-1.5-1.88-1.5-3.75V10.5a5.25 5.25 0 1 0-10.5 0v3c0 1.87-.7 2.99-1.5 3.75Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {unreadCount ? (
                  <span className="absolute -right-2 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
            </button>

            {showNotifications ? (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-2 flex items-center justify-between px-2 py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Notifications
                  </p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{unreadCount}</span>
                </div>

                <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                  {notifications.length ? (
                    notifications.slice(0, 8).map((notification) => (
                      <article
                        key={notification.id}
                        className={`rounded-xl border p-2 text-xs ${notificationStyles[notification.type] || notificationStyles.info}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{notification.title}</p>
                            <p className="mt-1 opacity-90">{notification.message}</p>
                            <p className="mt-1 text-[11px] opacity-70">
                              {new Date(notification.createdAt).toLocaleString("en-IN")}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              removeNotification(notification.id);
                              setNotifications(readNotifications());
                            }}
                            className="rounded-md px-1 py-0.5 text-[11px] font-semibold hover:bg-white/50 dark:hover:bg-slate-800"
                          >
                            Dismiss
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                      No new alerts.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setShowProfileMenu((value) => !value)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white dark:bg-slate-700">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user?.name || "User"}
                    className="h-8 w-8 rounded-lg object-cover"
                  />
                ) : (
                  userInitial
                )}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Signed in
                </span>
                <span className="block max-w-28 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {user?.name || "User"}
                </span>
              </span>
            </button>

            {showProfileMenu ? (
              <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/profile");
                  }}
                >
                  Profile
                </button>
                <button
                  type="button"
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/settings");
                  }}
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex w-full items-center rounded-xl bg-rose-50 px-3 py-2 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/20"
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
