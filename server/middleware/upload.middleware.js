import fs from "fs";
import path from "path";
import multer from "multer";

const uploadsDir = path.resolve("uploads", "statements");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    const baseName = path
      .basename(file.originalname || "statement-upload", extension)
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase();
    cb(null, `${Date.now()}-${baseName}${extension}`);
  },
});

const supportedMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const supportedExtensions = new Set([".csv", ".pdf", ".jpg", ".jpeg", ".png"]);

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimeType = String(file.mimetype || "").toLowerCase();

  if (supportedMimeTypes.has(mimeType) || supportedExtensions.has(extension)) {
    cb(null, true);
    return;
  }

  cb(new Error("Unsupported file type. Allowed: CSV, PDF, JPG, JPEG, PNG."));
};

export const statementUploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
}).single("file");

export default statementUploadMiddleware;
