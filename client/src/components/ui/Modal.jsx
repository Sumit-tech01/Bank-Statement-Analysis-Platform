import { AnimatePresence, motion } from "framer-motion";

const Modal = ({ open, title, onClose, children }) => {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            {title ? (
              <h2 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h2>
            ) : null}
            <div className={title ? "mt-3" : ""}>{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default Modal;
