import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import crypto from "crypto";
import csvParser from "csv-parser";
import { PDFParse } from "pdf-parse";
import Tesseract from "tesseract.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

const MIN_DESCRIPTION_LENGTH = 3;
const MIN_LINE_LENGTH = 10;

const DATE_START_PATTERN =
  /^(?<date>\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b/;

const TRANSACTION_PATTERNS = [
  /^(?<date>\d{1,2}\/\d{1,2}\/\d{2,4})\s+(?<description>.+?)\s+(?<amount>[+-]?(?:\(\s*)?(?:INR|RS\.?)?\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*\))?)(?:\s*(?<indicator>CR|DR|CREDIT|DEBIT))?$/i,
  /^(?<date>\d{1,2}-\d{1,2}-\d{2,4})\s+(?<description>.+?)\s+(?<amount>[+-]?(?:\(\s*)?(?:INR|RS\.?)?\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*\))?)(?:\s*(?<indicator>CR|DR|CREDIT|DEBIT))?$/i,
  /^(?<date>\d{4}-\d{1,2}-\d{1,2})\s+(?<description>.+?)\s+(?<amount>[+-]?(?:\(\s*)?(?:INR|RS\.?)?\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*\))?)(?:\s*(?<indicator>CR|DR|CREDIT|DEBIT))?$/i,
];

const AMOUNT_TOKEN_PATTERN =
  /[+-]?\s*(?:\(\s*)?(?:INR|RS\.?)?\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*\))?/gi;

const IGNORED_LINE_PATTERNS = [
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^statement(\s+of|\s+period|\s+for)?/i,
  /^account(\s+statement|\s+number|\s+name)?/i,
  /^ifsc\b/i,
  /^branch\b/i,
  /^customer\b/i,
  /^generated\s+on/i,
  /^opening\s+balance/i,
  /^closing\s+balance/i,
  /^available\s+balance/i,
  /^ledger\s+balance/i,
  /^total\s+(debit|credit|amount)/i,
  /^description\s+debit\s+credit/i,
];

const CATEGORY_RULES = [
  { category: "shopping", keywords: ["amazon", "flipkart", "purchase", "mall"] },
  { category: "groceries", keywords: ["grocery", "supermarket", "mart"] },
  { category: "food", keywords: ["zomato", "swiggy", "restaurant", "cafe"] },
  { category: "salary", keywords: ["salary", "payroll", "wage"] },
  { category: "rent", keywords: ["rent", "landlord"] },
  { category: "fuel", keywords: ["fuel", "petrol", "diesel"] },
  { category: "transfer", keywords: ["imps", "neft", "rtgs", "upi"] },
  { category: "utilities", keywords: ["electric", "water", "gas", "bill"] },
];

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

const buildPreview = (text, maxLength = 1200) =>
  normalizeWhitespace(String(text || "")).slice(0, maxLength);

const parseDateToken = (dateToken) => {
  const token = String(dateToken || "").trim();
  if (!token) {
    return null;
  }

  const yearFirst = token.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yearFirst) {
    const [, year, month, day] = yearFirst;
    const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const dayFirst = token.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dayFirst) {
    let [, day, month, year] = dayFirst;
    if (Number(year) < 100) {
      year = String(2000 + Number(year));
    }

    const value = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  return null;
};

const parseAmountToken = (token) => {
  const source = String(token || "").trim();
  if (!source) {
    return Number.NaN;
  }

  const negativeByParentheses = /\(\s*[^)]+\s*\)/.test(source);
  const negativeBySign = source.includes("-");
  const numeric = source.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(numeric);

  if (Number.isNaN(parsed)) {
    return Number.NaN;
  }

  return negativeByParentheses || negativeBySign ? -parsed : parsed;
};

const inferCategory = (description) => {
  const source = String(description || "").toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => source.includes(keyword))) {
      return rule.category;
    }
  }

  return "uncategorized";
};

const normalizeDescription = (description) =>
  normalizeWhitespace(String(description || "").replace(/\b(?:CR|DR)\b$/i, ""));

const resolveType = ({ amount, indicator = "", description = "" }) => {
  if (amount < 0) {
    return "expense";
  }

  const indicatorText = String(indicator || "").toLowerCase();
  if (/(^|\s)(dr|debit)(\s|$)/i.test(indicatorText)) {
    return "expense";
  }
  if (/(^|\s)(cr|credit)(\s|$)/i.test(indicatorText)) {
    return "income";
  }

  if (/(debit|withdraw|purchase|payment|upi|pos)/i.test(description)) {
    return "expense";
  }

  return "income";
};

const normalizeTransaction = ({
  date,
  description,
  amount,
  indicator,
  category,
}) => {
  const normalizedDate = parseDateToken(date);
  const normalizedDescription = normalizeDescription(description);
  const parsedAmount = Number(amount);

  if (!normalizedDate) {
    return null;
  }
  if (!Number.isFinite(parsedAmount) || Number.isNaN(parsedAmount) || parsedAmount === 0) {
    return null;
  }
  if (!normalizedDescription || normalizedDescription.length < MIN_DESCRIPTION_LENGTH) {
    return null;
  }
  if (!/[a-zA-Z]{2,}/.test(normalizedDescription)) {
    return null;
  }

  return {
    date: normalizedDate,
    description: normalizedDescription,
    amount: Math.abs(parsedAmount),
    type: resolveType({
      amount: parsedAmount,
      indicator,
      description: normalizedDescription.toLowerCase(),
    }),
    category: normalizeWhitespace(category) || inferCategory(normalizedDescription),
  };
};

const splitByDateAnchors = (line) => {
  const source = normalizeWhitespace(line);
  if (!source) {
    return [];
  }

  const anchors = [
    ...source.matchAll(
      /(?=(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}))/g
    ),
  ];

  if (anchors.length <= 1) {
    return [source];
  }

  const segments = [];
  for (let index = 0; index < anchors.length; index += 1) {
    const start = anchors[index].index;
    const end = anchors[index + 1]?.index ?? source.length;
    const chunk = source.slice(start, end).trim();
    if (chunk) {
      segments.push(chunk);
    }
  }

  return segments;
};

const shouldIgnoreLine = (line) => {
  const normalized = normalizeWhitespace(line);
  if (!normalized) {
    return true;
  }
  if (normalized.length < MIN_LINE_LENGTH) {
    return true;
  }

  const lowered = normalized.toLowerCase();
  if (lowered.includes("balance")) {
    return true;
  }
  if (!/[a-zA-Z]/.test(normalized)) {
    return true;
  }

  return IGNORED_LINE_PATTERNS.some((pattern) => pattern.test(normalized));
};

const cleanStatementTextLines = (rawText) => {
  const normalizedText = String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const roughLines = normalizedText.split("\n");
  const lines = [];

  for (const roughLine of roughLines) {
    const segments = splitByDateAnchors(roughLine);
    for (const segment of segments) {
      if (!shouldIgnoreLine(segment)) {
        lines.push(normalizeWhitespace(segment));
      }
    }
  }

  return lines;
};

const extractAmountCandidates = (line) => {
  const matches = [...String(line || "").matchAll(AMOUNT_TOKEN_PATTERN)];

  return matches
    .map((match) => {
      const raw = match[0];
      const start = match.index ?? 0;
      const end = start + raw.length;
      const numericToken = raw.replace(/[^0-9]/g, "");
      const hasSeparator = /[.,]/.test(raw);
      const hasSign = /[-+()]/.test(raw);

      if (!numericToken || numericToken.length > 10) {
        return null;
      }
      if (numericToken.length >= 8 && !hasSeparator && !hasSign) {
        return null;
      }

      const amount = parseAmountToken(raw);
      if (Number.isNaN(amount)) {
        return null;
      }

      return { raw, amount, start, end };
    })
    .filter(Boolean);
};

const pickAmountCandidate = (candidates, line) => {
  if (!candidates.length) {
    return null;
  }

  const explicit = candidates.filter((candidate) => /[-+()]/.test(candidate.raw));
  if (explicit.length) {
    return explicit[explicit.length - 1];
  }

  if (/\b(?:cr|credit|dr|debit)\b/i.test(line)) {
    return candidates[candidates.length - 1];
  }

  if (candidates.length >= 2) {
    return candidates[candidates.length - 2];
  }

  return candidates[0];
};

const parseRegexTransactionLine = (line) => {
  const normalized = normalizeWhitespace(line);
  if (!normalized || shouldIgnoreLine(normalized)) {
    return null;
  }
  if (!DATE_START_PATTERN.test(normalized)) {
    return null;
  }

  for (const pattern of TRANSACTION_PATTERNS) {
    const match = normalized.match(pattern);
    if (!match?.groups) {
      continue;
    }

    const transaction = normalizeTransaction({
      date: match.groups.date,
      description: match.groups.description,
      amount: parseAmountToken(match.groups.amount),
      indicator: match.groups.indicator || "",
    });

    if (transaction) {
      return transaction;
    }
  }

  const dateMatch = normalized.match(DATE_START_PATTERN);
  if (!dateMatch?.groups?.date) {
    return null;
  }

  const dateToken = dateMatch.groups.date;
  const remainder = normalizeWhitespace(normalized.slice(dateMatch[0].length));
  if (!remainder) {
    return null;
  }

  const amountCandidates = extractAmountCandidates(remainder);
  const selectedAmount = pickAmountCandidate(amountCandidates, normalized);
  if (!selectedAmount) {
    return null;
  }

  const description = normalizeDescription(remainder.slice(0, selectedAmount.start));
  const indicator = normalizeWhitespace(remainder.slice(selectedAmount.end));

  return normalizeTransaction({
    date: dateToken,
    description,
    amount: selectedAmount.amount,
    indicator,
  });
};

const dedupeTransactions = (transactions) => {
  const seen = new Set();
  const unique = [];

  for (const transaction of transactions) {
    const key = [
      transaction.date,
      transaction.description.toLowerCase(),
      Number(transaction.amount).toFixed(2),
      transaction.type,
      String(transaction.category || "").toLowerCase(),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(transaction);
  }

  return unique;
};

const parseTransactionsFromText = (text, stage) => {
  const lines = cleanStatementTextLines(text);
  const transactions = lines.map(parseRegexTransactionLine).filter(Boolean);
  const deduped = dedupeTransactions(transactions);

  logger.debug(
    {
      stage,
      extractedTextPreview: buildPreview(text),
      cleanedLineCount: lines.length,
      cleanedLineSample: lines.slice(0, 30),
      transactionCount: deduped.length,
      transactionSample: deduped.slice(0, 5),
    },
    "Statement text parsing completed"
  );

  return deduped;
};

const parseCSVLine = (line) => {
  const values = [];
  let token = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        token += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(token.trim());
      token = "";
      continue;
    }

    token += char;
  }

  values.push(token.trim());
  return values;
};

const getColumnValue = (row, keys) => {
  for (const key of keys) {
    const match = Object.keys(row).find(
      (candidate) => candidate.toLowerCase().replace(/[\s_-]+/g, "") === key
    );

    if (match && row[match] != null && String(row[match]).trim() !== "") {
      return row[match];
    }
  }

  return "";
};

export const parseCSVStatement = async (filePath) => {
  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  const transactions = rows
    .map((row) => {
      const date = getColumnValue(row, ["date", "transactiondate", "valuedate"]);
      const description = getColumnValue(row, [
        "description",
        "details",
        "narration",
        "remarks",
      ]);
      const directAmount = getColumnValue(row, ["amount", "transactionamount", "value"]);
      const debitAmount = getColumnValue(row, ["debit", "withdrawal", "dr"]);
      const creditAmount = getColumnValue(row, ["credit", "deposit", "cr"]);
      const typeIndicator = getColumnValue(row, ["type", "transactiontype"]);
      const category = getColumnValue(row, ["category", "tag"]);

      let parsedAmount = parseAmountToken(directAmount);
      let indicator = typeIndicator;

      if (Number.isNaN(parsedAmount)) {
        const debit = parseAmountToken(debitAmount);
        const credit = parseAmountToken(creditAmount);

        if (!Number.isNaN(credit) && Math.abs(credit) > 0) {
          parsedAmount = Math.abs(credit);
          indicator = "credit";
        } else if (!Number.isNaN(debit) && Math.abs(debit) > 0) {
          parsedAmount = -Math.abs(debit);
          indicator = "debit";
        }
      }

      return normalizeTransaction({
        date,
        description,
        amount: parsedAmount,
        indicator,
        category,
      });
    })
    .filter(Boolean);

  const deduped = dedupeTransactions(transactions);
  const csvPreview = rows
    .slice(0, 5)
    .map((row) => JSON.stringify(row))
    .join("\n");

  logger.debug(
    {
      stage: "csv",
      filePath,
      rowCount: rows.length,
      transactionCount: deduped.length,
      extractedTextPreview: buildPreview(csvPreview, 800),
      transactionSample: deduped.slice(0, 5),
    },
    "CSV statement parsing completed"
  );

  return {
    transactions: deduped,
    extractedText: csvPreview,
    stage: "csv",
  };
};

const runPdfTextExtraction = async (pdfBuffer) => {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const textResult = await parser.getText();
    return {
      parser,
      text: String(textResult?.text || ""),
    };
  } catch (error) {
    await parser.destroy();
    throw error;
  }
};

const isUnreadableText = (text) => {
  const normalized = normalizeWhitespace(text);
  if (normalized.length < 80) {
    return true;
  }

  const alnum = (normalized.match(/[a-z0-9]/gi) || []).length;
  return alnum < normalized.length * 0.35;
};

export const parsePDFStatement = async (filePath) => {
  const buffer = await fs.readFile(filePath);
  const { parser, text } = await runPdfTextExtraction(buffer);

  try {
    const transactions = parseTransactionsFromText(text, "pdf-text");
    return {
      transactions,
      extractedText: text,
      stage: "pdf-text",
      parser,
      unreadable: isUnreadableText(text),
    };
  } catch (error) {
    await parser.destroy();
    throw error;
  }
};

const runOcrOnImage = async (filePath) => {
  const result = await Tesseract.recognize(filePath, "eng", {
    logger: () => {},
  });
  return String(result?.data?.text || "");
};

const runOcrOnPdf = async (parser) => {
  const screenshotResult = await parser.getScreenshot({
    first: 6,
    scale: 2,
    imageDataUrl: false,
    imageBuffer: true,
  });

  const pages = screenshotResult?.pages || [];
  const chunks = [];

  for (const [index, page] of pages.entries()) {
    if (!page?.data) {
      continue;
    }

    const result = await Tesseract.recognize(Buffer.from(page.data), "eng", {
      logger: () => {},
    });
    const text = String(result?.data?.text || "");
    chunks.push(text);

    logger.debug(
      {
        stage: "ocr-pdf-page",
        page: index + 1,
        extractedTextPreview: buildPreview(text, 500),
      },
      "OCR extracted text from PDF page"
    );
  }

  return chunks.join("\n");
};

export const parseOCRStatement = async ({ filePath, inputType = "image", pdfParser }) => {
  let parser = pdfParser;
  let ownsParser = false;

  if (inputType === "pdf" && !parser) {
    const buffer = await fs.readFile(filePath);
    parser = new PDFParse({ data: buffer });
    ownsParser = true;
  }

  try {
    const text =
      inputType === "pdf"
        ? await runOcrOnPdf(parser)
        : await runOcrOnImage(filePath);

    const transactions = parseTransactionsFromText(text, `ocr-${inputType}`);

    logger.debug(
      {
        stage: `ocr-${inputType}`,
        transactionCount: transactions.length,
        extractedTextPreview: buildPreview(text),
      },
      "OCR statement parsing completed"
    );

    return {
      transactions,
      extractedText: text,
      stage: `ocr-${inputType}`,
    };
  } finally {
    if (ownsParser && parser) {
      await parser.destroy();
    }
  }
};

const parseGeminiJson = (rawText) => {
  const cleaned = String(rawText || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const parseDirect = () => JSON.parse(cleaned);
  const parseFromSlice = () => {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start < 0 || end < 0 || end <= start) {
      throw new Error("No JSON array found in Gemini response.");
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  };

  try {
    const parsed = parseDirect();
    return Array.isArray(parsed) ? parsed : parsed?.transactions || [];
  } catch (_error) {
    const parsed = parseFromSlice();
    return Array.isArray(parsed) ? parsed : parsed?.transactions || [];
  }
};

export const parseAIStatement = async (text) => {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
Extract all financial transactions from this bank statement text.
Return ONLY a JSON array with objects:
[
  {
    "date": "YYYY-MM-DD",
    "description": "string",
    "amount": 1234.56,
    "type": "income|expense",
    "category": "string"
  }
]
Rules:
- Ignore headers, footers, balances, and page metadata.
- Include only valid transaction rows.
- date, description, amount are mandatory.
- description must be at least 3 characters.
- If type is missing infer: negative amount => expense, positive => income.
- Keep category short and lower-case.

Statement text:
${String(text || "").slice(0, 30000)}
  `.trim();

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const raw = response.text();

  logger.debug(
    {
      stage: "ai-gemini-raw",
      responsePreview: buildPreview(raw, 1000),
    },
    "Gemini statement parser raw response"
  );

  const rows = parseGeminiJson(raw);

  const transactions = rows
    .map((row) =>
      normalizeTransaction({
        date: row?.date,
        description: row?.description,
        amount: row?.amount,
        indicator: row?.type,
        category: row?.category,
      })
    )
    .filter(Boolean);

  const deduped = dedupeTransactions(transactions);

  logger.debug(
    {
      stage: "ai-gemini",
      transactionCount: deduped.length,
      transactionSample: deduped.slice(0, 5),
    },
    "Gemini statement parsing completed"
  );

  return {
    transactions: deduped,
    extractedText: raw,
    stage: "ai-gemini",
  };
};

export const detectFileType = (file) => {
  const extension = path.extname(file?.originalname || "").toLowerCase();
  const mimeType = String(file?.mimetype || "").toLowerCase();

  if (
    extension === ".csv" ||
    ["text/csv", "application/csv", "application/vnd.ms-excel"].includes(mimeType)
  ) {
    return "csv";
  }

  if (extension === ".pdf" || mimeType === "application/pdf") {
    return "pdf";
  }

  if (
    [".jpg", ".jpeg", ".png"].includes(extension) ||
    ["image/jpeg", "image/jpg", "image/png"].includes(mimeType)
  ) {
    return "image";
  }

  return "unsupported";
};

const buildFallbackText = (chunks) => chunks.filter(Boolean).join("\n");

const buildTransactionFingerprint = (transactions) => {
  const hash = crypto.createHash("sha1");
  transactions.forEach((transaction) => {
    hash.update(
      `${transaction.date}|${transaction.description}|${transaction.amount}|${transaction.type}|${transaction.category}\n`
    );
  });
  return hash.digest("hex");
};

export const parseStatementFile = async (file) => {
  const fileType = detectFileType(file);
  const filePath = path.resolve(file.path);

  if (fileType === "unsupported") {
    throw new Error("Unsupported file type. Allowed: CSV, PDF, JPG, JPEG, PNG.");
  }

  logger.info(
    {
      stage: "upload-detect",
      fileType,
      originalName: file.originalname,
      mimeType: file.mimetype,
      filePath,
    },
    "Statement upload detected"
  );

  if (fileType === "csv") {
    const csvResult = await parseCSVStatement(filePath);
    if (csvResult.transactions.length) {
      return {
        ...csvResult,
        debug: {
          stageChain: ["csv"],
          fingerprint: buildTransactionFingerprint(csvResult.transactions),
        },
      };
    }

    let aiResult;
    try {
      aiResult = await parseAIStatement(csvResult.extractedText);
    } catch (error) {
      logger.warn({ error: error.message, stage: "ai-gemini" }, "AI parser stage failed");
      aiResult = {
        transactions: [],
        extractedText: csvResult.extractedText,
        stage: "ai-gemini",
      };
    }

    return {
      ...aiResult,
      debug: {
        stageChain: ["csv", "ai-gemini"],
        fallbackFrom: "csv",
        fingerprint: buildTransactionFingerprint(aiResult.transactions),
      },
    };
  }

  if (fileType === "pdf") {
    const stageChain = [];
    const fallbackTextParts = [];
    let pdfResult = null;
    let pdfParser = null;

    try {
      pdfResult = await parsePDFStatement(filePath);
      pdfParser = pdfResult.parser;
      stageChain.push("pdf-text");
      fallbackTextParts.push(pdfResult.extractedText);

      if (pdfResult.transactions.length && !pdfResult.unreadable) {
        await pdfResult.parser.destroy();
        return {
          transactions: pdfResult.transactions,
          stage: pdfResult.stage,
          extractedText: pdfResult.extractedText,
          debug: {
            stageChain,
            fingerprint: buildTransactionFingerprint(pdfResult.transactions),
          },
        };
      }
    } catch (error) {
      logger.warn({ error: error.message, stage: "pdf-text" }, "PDF text parser stage failed");
    }

    let ocrResult = {
      transactions: [],
      extractedText: "",
      stage: "ocr-pdf",
    };
    try {
      try {
        ocrResult = await parseOCRStatement({
          filePath,
          inputType: "pdf",
          pdfParser,
        });
        stageChain.push("ocr-pdf");
        fallbackTextParts.push(ocrResult.extractedText);
      } catch (error) {
        logger.warn({ error: error.message, stage: "ocr-pdf" }, "OCR parser stage failed");
        stageChain.push("ocr-pdf");
      }
    } finally {
      if (pdfParser) {
        await pdfParser.destroy();
      }
    }

    if (ocrResult.transactions.length) {
      return {
        ...ocrResult,
        debug: {
          stageChain,
          fallbackFrom: "pdf-text",
          fingerprint: buildTransactionFingerprint(ocrResult.transactions),
        },
      };
    }

    let aiResult;
    try {
      aiResult = await parseAIStatement(buildFallbackText(fallbackTextParts));
    } catch (error) {
      logger.warn({ error: error.message, stage: "ai-gemini" }, "AI parser stage failed");
      aiResult = {
        transactions: [],
        extractedText: buildFallbackText(fallbackTextParts),
        stage: "ai-gemini",
      };
    }

    stageChain.push("ai-gemini");
    return {
      ...aiResult,
      debug: {
        stageChain,
        fallbackFrom: "ocr-pdf",
        fingerprint: buildTransactionFingerprint(aiResult.transactions),
      },
    };
  }

  let ocrResult = {
    transactions: [],
    extractedText: "",
    stage: "ocr-image",
  };
  try {
    ocrResult = await parseOCRStatement({ filePath, inputType: "image" });
  } catch (error) {
    logger.warn({ error: error.message, stage: "ocr-image" }, "OCR parser stage failed");
  }

  if (ocrResult.transactions.length) {
    return {
      ...ocrResult,
      debug: {
        stageChain: ["ocr-image"],
        fingerprint: buildTransactionFingerprint(ocrResult.transactions),
      },
    };
  }

  let aiResult;
  try {
    aiResult = await parseAIStatement(ocrResult.extractedText);
  } catch (error) {
    logger.warn({ error: error.message, stage: "ai-gemini" }, "AI parser stage failed");
    aiResult = {
      transactions: [],
      extractedText: ocrResult.extractedText,
      stage: "ai-gemini",
    };
  }

  return {
    ...aiResult,
    debug: {
      stageChain: ["ocr-image", "ai-gemini"],
      fallbackFrom: "ocr-image",
      fingerprint: buildTransactionFingerprint(aiResult.transactions),
    },
  };
};

export const parseTransactionsFromUploadedFile = async (file) => {
  const result = await parseStatementFile(file);
  return result.transactions;
};
