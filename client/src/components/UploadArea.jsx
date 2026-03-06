import { motion } from "framer-motion";
import { useRef, useState } from "react";

const UploadArea = ({ accept, selectedFile, onFileSelect, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        disabled={disabled}
        whileHover={disabled ? undefined : { y: -2 }}
        transition={{ duration: 0.15 }}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-10 text-center transition ${
          isDragging
            ? "border-sky-500 bg-sky-500/10 dark:border-sky-400 dark:bg-sky-500/10"
            : "border-slate-300 bg-white/70 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""} backdrop-blur-lg shadow-xl shadow-slate-900/5`}
      >
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M12 16.5V6m0 0 3.75 3.75M12 6 8.25 9.75M4.5 18h15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
          Drag and drop your file here
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          or click to browse ({accept.split(",")[0]})
        </p>
        {selectedFile ? (
          <p className="mt-3 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
            Selected: {selectedFile.name}
          </p>
        ) : null}
      </motion.button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
        className="hidden"
      />
    </>
  );
};

export default UploadArea;
