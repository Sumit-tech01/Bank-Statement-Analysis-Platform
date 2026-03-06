import { AnimatePresence, motion } from "framer-motion";

const Dropdown = ({ open, className = "", children }) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.16 }}
          className={[
            "absolute right-0 mt-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900",
            className,
          ].join(" ")}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default Dropdown;
