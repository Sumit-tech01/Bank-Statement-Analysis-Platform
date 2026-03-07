import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/api.js";
import CameraCapture from "../components/CameraCapture.jsx";
import ManualTransactionForm from "../components/ManualTransactionForm.jsx";
import UploadArea from "../components/UploadArea.jsx";
import Button from "../components/ui/Button.jsx";
import Card from "../components/ui/Card.jsx";
import { upsertNotification } from "../utils/notifications.js";

const tabs = [
  { id: "csv", label: "CSV Upload" },
  { id: "pdf", label: "PDF Upload" },
  { id: "image", label: "Image Upload" },
  { id: "camera", label: "Scan via Camera" },
  { id: "manual", label: "Manual Entry" },
];

const fileConfig = {
  csv: {
    accept: ".csv,text/csv",
    title: "Upload CSV Statement",
    description: "Drop your CSV statement and parse transactions automatically.",
  },
  pdf: {
    accept: ".pdf,application/pdf",
    title: "Upload PDF Statement",
    description: "Upload a PDF statement and extract transactions with parser + OCR fallback.",
  },
  image: {
    accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
    title: "Upload Statement Image",
    description: "Upload JPG/PNG statements for OCR extraction.",
  },
};

const UploadStatement = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabs.some((tab) => tab.id === initialTab) ? initialTab : "csv"
  );
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadNoticeType, setUploadNoticeType] = useState("success");
  const [uploadError, setUploadError] = useState("");

  const isFileTab = useMemo(
    () => ["csv", "pdf", "image"].includes(activeTab),
    [activeTab]
  );

  const clearFeedback = () => {
    setUploadMessage("");
    setUploadNoticeType("success");
    setUploadError("");
    setUploadProgress(0);
  };

  const notifyDataUpdated = () => {
    window.dispatchEvent(new Event("statement:updated"));
  };

  const uploadFileToServer = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    clearFeedback();

    try {
      const response = await api.post("/statements/upload", formData, {
        onUploadProgress: (eventData) => {
          if (!eventData.total) {
            return;
          }
          const percent = Math.round((eventData.loaded * 100) / eventData.total);
          setUploadProgress(percent);
        },
      });

      const parsedCount = Number(response?.data?.meta?.parsedTransactions || 0);
      const responseMessage = String(response?.data?.message || "");
      const warningMode =
        parsedCount === 0 ||
        /no transactions detected/i.test(responseMessage);
      setUploadProgress(100);
      setUploadNoticeType(warningMode ? "warning" : "success");
      setUploadMessage(
        warningMode
          ? responseMessage || "No transactions detected, but summary calculated."
          : `Uploaded and parsed ${parsedCount} transactions successfully.`
      );

      upsertNotification({
        id: `upload-${Date.now()}`,
        type: warningMode ? "warning" : "success",
        title: "Statement Uploaded",
        message: warningMode
          ? responseMessage || "No transactions detected, but summary calculated."
          : `${parsedCount} transactions were parsed successfully.`,
      });

      await Promise.allSettled([
        api.get("/analysis/summary"),
        api.get("/analysis/chart"),
      ]);

      setSelectedFile(null);
      notifyDataUpdated();
    } catch (error) {
      setUploadError(
        error?.response?.data?.message || error?.message || "File upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a file first.");
      return;
    }

    await uploadFileToServer(selectedFile);
  };

  const onFilePicked = (file) => {
    if (!file) {
      return;
    }
    clearFeedback();
    setSelectedFile(file);
  };

  return (
    <div className="space-y-4">
      <Card asMotion initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Upload Statement
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Add statements from file upload, camera scan, or manual entry.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedFile(null);
                clearFeedback();
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-200"
                  : "border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {isFileTab ? (
        <Card className="max-w-4xl">
          <h3 className="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
            {fileConfig[activeTab].title}
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {fileConfig[activeTab].description}
          </p>

          <form onSubmit={handleFileSubmit} className="mt-4 space-y-4">
            <UploadArea
              accept={fileConfig[activeTab].accept}
              selectedFile={selectedFile}
              onFileSelect={onFilePicked}
              disabled={uploading}
            />

            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload and Parse"}
            </Button>
          </form>
        </Card>
      ) : null}

      {activeTab === "camera" ? (
        <motion.div className="max-w-4xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <CameraCapture disabled={uploading} onCapture={uploadFileToServer} />
        </motion.div>
      ) : null}

      {activeTab === "manual" ? (
        <motion.div className="max-w-4xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ManualTransactionForm onSuccess={notifyDataUpdated} />
        </motion.div>
      ) : null}

      {uploading ? (
        <Card className="max-w-4xl">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <motion.div
              className="h-full bg-sky-600"
              animate={{ width: `${Math.max(uploadProgress, 10)}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Upload progress: {uploadProgress}%
          </p>
        </Card>
      ) : null}

      {uploadMessage ? (
        <p
          className={`max-w-4xl rounded-xl border px-3 py-2 text-sm ${
            uploadNoticeType === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
          }`}
        >
          {uploadMessage}
        </p>
      ) : null}
      {uploadError ? (
        <p className="max-w-4xl rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
};

export default UploadStatement;
