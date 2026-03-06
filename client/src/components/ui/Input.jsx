const Input = ({ className = "", ...props }) => {
  return (
    <input
      className={[
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-sky-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
        className,
      ].join(" ")}
      {...props}
    />
  );
};

export default Input;
