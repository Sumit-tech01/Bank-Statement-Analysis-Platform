import { motion } from "framer-motion";

const Card = ({ children, className = "", asMotion = false, ...props }) => {
  const classes = [
    "rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/70",
    className,
  ].join(" ");

  if (asMotion) {
    return (
      <motion.article className={classes} {...props}>
        {children}
      </motion.article>
    );
  }

  return (
    <article className={classes} {...props}>
      {children}
    </article>
  );
};

export default Card;
