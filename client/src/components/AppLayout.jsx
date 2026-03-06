import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "./Navbar.jsx";
import Sidebar from "./Sidebar.jsx";

const pageTitles = {
  "/dashboard": "Overview",
  "/upload": "Upload Statement",
  "/transactions": "Transactions",
  "/analytics": "Analytics",
  "/budget": "Budget",
  "/profile": "Profile",
  "/settings": "Settings",
};

const AppLayout = () => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = useMemo(
    () => pageTitles[location.pathname] || "Overview",
    [location.pathname]
  );

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_0%_-15%,rgba(14,165,233,0.2),transparent_42%),radial-gradient(circle_at_100%_-10%,rgba(56,189,248,0.15),transparent_40%)] dark:bg-[radial-gradient(circle_at_0%_-15%,rgba(30,41,59,0.65),transparent_45%),radial-gradient(circle_at_100%_-10%,rgba(15,23,42,0.9),transparent_40%)]" />

      <Navbar
        pageTitle={pageTitle}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
      />

      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <Sidebar
          open={sidebarOpen}
          onNavigate={() => setSidebarOpen(false)}
        />

        <AnimatePresence>
          {sidebarOpen ? (
            <motion.button
              type="button"
              aria-label="Close sidebar"
              className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm md:hidden"
              onClick={() => setSidebarOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : null}
        </AnimatePresence>

        <main className="mt-16 w-full flex-1 md:mt-20">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
