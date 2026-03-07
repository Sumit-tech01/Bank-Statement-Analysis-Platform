import { createReadStream } from "fs";
import csvParser from "csv-parser";
import logger from "../utils/logger.js";
import {
  detectFileType,
  parseOCRStatement,
  parsePDFStatement,
} from "./statementParser.js";
import { extractTransactionsWithGemini } from "./geminiService.js";

const MAX_AMOUNT = 10000000;
const MIN_DESCRIPTION_LENGTH = 3;
const MAX_NUMERIC_DIGITS = 8;

const DATE_PATTERNS = [
  /\b(\d{2}\/\d{2}\/\d{4})\b/,
  /\b(\d{2}-\d{2}-\d{4})\b/,
  /\b(\d{4}-\d{2}-\d{2})\b/,
];

const AMOUNT_PATTERN = /[+-]?\s*(?:\(\s*)?(?:INR|RS\.?)?\s*\d[\d,]*(?:\.\d{1,2})?(?:\s*\))?/gi;

const IGNORE_LINE_PATTERNS = [
  /\bpage\b/i,
  /\bbalance\b/i,
  /\bopening\b/i,
  /\bclosing\b/i,
  /\baccount\b/i,
  /\bifsc\b/i,
  /\bbranch\b/i,
  /\btotal\b/i,
  /\bledger\b/i,
  /\bavailable\b/i,
  /\bcustomer\b/i,
  /\bmobile\b/i,
  /\bphone\b/i,
];

const CATEGORY_RULES = [
  { category: "shopping", keywords: ["amazon", "flipkart", "mall", "store", "purchase"] },
  { category: "groceries", keywords: ["grocery", "supermarket", "mart"] },
  { category: "food", keywords: ["zomato", "swiggy", "restaurant", "cafe"] },
  { category: "salary", keywords: ["salary", "payroll", "wage"] },
  { category: "utilities", keywords: ["electric", "water", "gas", "bill"] },
  { category: "transfer", keywords: ["upi", "imps", "neft", "rtgs", "transfer"] },
  { category: "rent", keywords: ["rent", "landlord"] },
];

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

const normalizeDate = (value) => {
  const token = String(value || "").trim();
  if (!token) {
    return null;
  }

  const isoMatch = token.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const normalized = `${year}-${month}-${day}`;
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : normalized;
  }

  const dayFirstMatch = token.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    const normalized = `${year}-${month}-${day}`;
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : normalized;
  }

  return null;
};

const parseAmountToken = (token) => {
  const source = String(token || "").trim();
  if (!source) {
    return Number.NaN;
  }

  const negativeByParentheses = /\(\s*[^)]+\s*\)/.test(source);
  const negativeBySign = /-\s*\d/.test(source) || source.replace(/\s+/g, "").startsWith("-");
  const numeric = source.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(numeric);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return negativeByParentheses || negativeBySign ? -parsed : parsed;
};

const isAmountAllowed = (token, amount) => {
  const absolute = Math.abs(Number(amount || 0));
  if (!Number.isFinite(absolute) || absolute === 0 || absolute > MAX_AMOUNT) {
    return false;
  }

  const digits = String(token || "").replace(/[^0-9]/g, "");
  if (!digits || digits.length > MAX_NUMERIC_DIGITS) {
    return false;
  }

  return true;
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

const resolveCreditDebitType = (line, amount) => {
  if (amount < 0) {
    return "debit";
  }

  const lowered = String(line || "").toLowerCase();
  const hasDebitHint = /\b(dr|debit|withdraw|purchase|payment|upi|pos)\b/i.test(lowered);
  const hasCreditHint = /\b(cr|credit|salary|deposit|refund)\b/i.test(lowered);

  if (hasDebitHint && !hasCreditHint) {
    return "debit";
  }
  if (hasCreditHint && !hasDebitHint) {
    return "credit";
  }

  return "credit";
};

const toStatementType = (type) => (type === "debit" ? "expense" : "income");

const cleanText = (rawText) => {
  return String(rawText || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .filter((line) => line.length >= 8)
    .filter((line) => !IGNORE_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .filter((line) => !/\b\d{9,}\b/.test(line));
};

const findDateMatch = (line) => {
  for (const pattern of DATE_PATTERNS) {
    const match = line.match(pattern);
    if (match) {
      return { token: match[1], index: match.index ?? 0 };
    }
  }
  return null;
};

const hasExplicitSign = (token) =>
  /-\s*\d/.test(String(token || "")) || /\(\s*[^)]+\s*\)/.test(String(token || ""));

const hasDebitCreditIndicatorAfter = (line, startIndex, rawAmount) => {
  const start = startIndex + String(rawAmount || "").length;
  const after = String(line || "").slice(start, start + 24);
  return /\b(cr|dr|credit|debit)\b/i.test(after);
};

const extractAmountCandidate = (line, dateIndex, dateToken) => {
  const startIndex = dateIndex + dateToken.length;
  const remainder = line.slice(startIndex);
  const matches = [...remainder.matchAll(AMOUNT_PATTERN)];
  if (!matches.length) {
    return null;
  }

  const candidates = [];
  for (const match of matches) {
    const raw = String(match[0] || "").trim();
    const amount = parseAmountToken(raw);
    if (isAmountAllowed(raw, amount)) {
      const localStart = match.index ?? 0;
      candidates.push({
        raw,
        amount,
        start: startIndex + localStart,
      });
    }
  }

  if (!candidates.length) {
    return null;
  }

  // Prefer signed values first, then values explicitly marked with CR/DR.
  const signed = [...candidates]
    .reverse()
    .find((candidate) => hasExplicitSign(candidate.raw));
  if (signed) {
    return signed;
  }

  const indicated = [...candidates]
    .reverse()
    .find((candidate) => hasDebitCreditIndicatorAfter(line, candidate.start, candidate.raw));
  if (indicated) {
    return indicated;
  }

  // In lines with debit/credit/balance columns, trailing value is often balance.
  // Prefer second-to-last value in ambiguous multi-amount lines.
  if (candidates.length >= 2) {
    return candidates[candidates.length - 2];
  }

  return candidates[candidates.length - 1];
};

const shouldIgnoreLikelyBalanceLine = (line) => {
  const lowered = String(line || "").toLowerCase();
  if (!/\bbal(?:ance)?\b/.test(lowered)) {
    return false;
  }

  return !/\b(cr|dr|credit|debit)\b/.test(lowered);
};

const parseLineToTransaction = (line) => {
  if (shouldIgnoreLikelyBalanceLine(line)) {
    return null;
  }

  const dateMatch = findDateMatch(line);
  if (!dateMatch) {
    return null;
  }

  const amountCandidate = extractAmountCandidate(line, dateMatch.index, dateMatch.token);
  if (!amountCandidate) {
    return null;
  }

  const description = normalizeWhitespace(
    line.slice(dateMatch.index + dateMatch.token.length, amountCandidate.start)
  );
  if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
    return null;
  }

  const creditDebitType = resolveCreditDebitType(line, amountCandidate.amount);
  return normalizeExtractedTransaction({
    date: dateMatch.token,
    description,
    amount: amountCandidate.amount,
    type: creditDebitType,
  });
};

const normalizeExtractedTransaction = ({ date, description, amount, type, category }) => {
  const normalizedDate = normalizeDate(date);
  const normalizedDescription = normalizeWhitespace(description);
  const numericAmount = Math.abs(Number(amount || 0));
  const normalizedType = String(type || "").toLowerCase();

  if (!normalizedDate) {
    return null;
  }
  if (!normalizedDescription || normalizedDescription.length < MIN_DESCRIPTION_LENGTH) {
    return null;
  }
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > MAX_AMOUNT) {
    return null;
  }

  const creditDebitType =
    normalizedType === "debit" || normalizedType === "expense"
      ? "debit"
      : normalizedType === "credit" || normalizedType === "income"
        ? "credit"
        : "credit";

  return {
    date: normalizedDate,
    description: normalizedDescription,
    amount: numericAmount,
    type: toStatementType(creditDebitType),
    category: normalizeWhitespace(category) || inferCategory(normalizedDescription),
  };
};

const dedupeTransactions = (transactions) => {
  const seen = new Set();
  const unique = [];

  for (const transaction of transactions || []) {
    const key = [
      transaction.date,
      transaction.description.toLowerCase(),
      Number(transaction.amount).toFixed(2),
      transaction.type,
      String(transaction.category || "uncategorized").toLowerCase(),
    ].join("|");

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(transaction);
  }

  return unique;
};

const extractTransactionsWithRegex = (cleanedLines) => {
  const extracted = [];

  for (const line of cleanedLines) {
    const normalized = parseLineToTransaction(line);
    if (normalized) {
      extracted.push(normalized);
    }
  }

  return dedupeTransactions(extracted);
};

const extractCsvText = async (filePath) => {
  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  const text = rows
    .map((row) => normalizeWhitespace(Object.values(row || {}).join(" ")))
    .filter(Boolean)
    .join("\n");

  return { text, stage: "csv-text" };
};

const extractPdfText = async (filePath) => {
  let parser = null;
  let text = "";
  let stage = "pdf-text";

  try {
    try {
      const pdfResult = await parsePDFStatement(filePath);
      parser = pdfResult.parser;
      text = String(pdfResult?.extractedText || "");
    } catch (error) {
      logger.warn(
        {
          error: error.message,
          stage: "pdf-text",
          filePath,
        },
        "PDF text extraction failed, trying OCR fallback"
      );
    }
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }

  if (!text || !text.trim()) {
    const ocr = await parseOCRStatement({ filePath, inputType: "pdf" });
    text = String(ocr?.extractedText || "");
    stage = "ocr-pdf";
  }

  return { text, stage };
};

const extractImageText = async (filePath) => {
  const ocr = await parseOCRStatement({ filePath, inputType: "image" });
  return {
    text: String(ocr?.extractedText || ""),
    stage: "ocr-image",
  };
};

export const extractText = async (file) => {
  const fileType = detectFileType(file);
  if (fileType === "unsupported") {
    throw new Error("Unsupported file type. Allowed: CSV, PDF, JPG, JPEG, PNG.");
  }

  if (fileType === "csv") {
    const result = await extractCsvText(file.path);
    return { fileType, ...result };
  }

  if (fileType === "pdf") {
    const result = await extractPdfText(file.path);
    return { fileType, ...result };
  }

  const result = await extractImageText(file.path);
  return { fileType, ...result };
};

export const extractTransactions = async (file) => {
  const extracted = await extractText(file);
  const cleanedLines = cleanText(extracted.text);
  const cleanedText = cleanedLines.join("\n");

  let transactions = [];
  let source = "regex";

  if (cleanedText) {
    try {
      const geminiResult = await extractTransactionsWithGemini(cleanedText);
      const normalizedGemini = dedupeTransactions(
        (geminiResult.transactions || [])
          .map((transaction) =>
            normalizeExtractedTransaction({
              date: transaction.date,
              description: transaction.description,
              amount: transaction.amount,
              type: transaction.type,
              category: transaction.category,
            })
          )
          .filter(Boolean)
      );

      if (normalizedGemini.length > 0) {
        transactions = normalizedGemini;
        source = "gemini";
      }
    } catch (error) {
      logger.warn(
        {
          error: error.message,
          stage: "gemini",
          fileName: file.originalname,
        },
        "Gemini extraction failed, using regex fallback"
      );
    }
  }

  if (!transactions.length) {
    transactions = extractTransactionsWithRegex(cleanedLines);
    source = "regex";
  }

  logger.info(
    {
      fileName: file.originalname,
      fileType: extracted.fileType,
      extractionStage: extracted.stage,
      source,
      cleanedLines: cleanedLines.length,
      transactionCount: transactions.length,
    },
    "Transaction extraction completed"
  );

  return {
    fileType: extracted.fileType,
    stage: extracted.stage,
    source,
    extractedText: extracted.text,
    cleanedText,
    cleanedLines,
    transactions,
  };
};

export const calculateSummary = (transactions = []) => {
  let credit = 0;
  let debit = 0;
  let count = 0;

  const validTransactions = [];

  for (const transaction of transactions) {
    const date = normalizeDate(transaction?.date);
    const amount = Number(transaction?.amount || 0);

    if (!date) {
      continue;
    }
    if (!Number.isFinite(amount)) {
      continue;
    }

    const absoluteAmount = Math.abs(amount);
    if (absoluteAmount === 0 || absoluteAmount > MAX_AMOUNT) {
      continue;
    }

    const typeToken = String(transaction?.type || "").toLowerCase();
    const isDebit = typeToken === "expense" || typeToken === "debit";

    if (isDebit) {
      debit += absoluteAmount;
    } else {
      credit += absoluteAmount;
    }
    count += 1;

    if (validTransactions.length < 100) {
      validTransactions.push({
        date,
        description: normalizeWhitespace(transaction?.description),
        amount: absoluteAmount,
        type: isDebit ? "debit" : "credit",
      });
    }
  }

  const summary = {
    totalCredit: Number(credit.toFixed(2)),
    totalDebit: Number(debit.toFixed(2)),
    balance: Number((credit - debit).toFixed(2)),
    transactionCount: count,
  };

  console.log("Transactions", validTransactions);
  console.log("Credit", summary.totalCredit);
  console.log("Debit", summary.totalDebit);
  console.log("Balance", summary.balance);

  return summary;
};

export default {
  extractText,
  extractTransactions,
  calculateSummary,
};
