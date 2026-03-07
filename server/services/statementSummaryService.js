import { createReadStream } from "fs";
import path from "path";
import csvParser from "csv-parser";
import logger from "../utils/logger.js";
import {
  detectFileType,
  parseOCRStatement,
  parsePDFStatement,
} from "./statementParser.js";
import { extractTransactionsWithGemini } from "./geminiService.js";

const TRANSACTION_DATE_PATTERN =
  /\b(?:\d{2}[/-]\d{2}[/-]\d{4}|\d{4}-\d{2}-\d{2})\b/;

const MONEY_PATTERN = /-?\d[\d,]*(?:\.\d{1,2})?/g;

const DEBIT_HINT_PATTERN = /\b(?:dr|debit)\b/i;
const CREDIT_HINT_PATTERN = /\b(?:cr|credit)\b/i;

const IGNORED_LINE_PATTERNS = [
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^statement(\s+of|\s+period|\s+for)?/i,
  /^account(\s+statement|\s+number|\s+name)?/i,
  /^opening\s+balance/i,
  /^closing\s+balance/i,
  /^available\s+balance/i,
  /^ledger\s+balance/i,
  /^total\s+(debit|credit|amount)/i,
  /^description\s+debit\s+credit/i,
];

const MIN_LINE_LENGTH = 8;
const MAX_AMOUNT_DIGITS = 8; // 1 crore has 8 digits
const MAX_AMOUNT = 10000000; // 1 crore

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));
const DATE_VALUE_PATTERN =
  /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2})\b/;

const toSummary = ({ totalCredit, totalDebit, transactionCount }) => ({
  totalCredit: roundMoney(totalCredit),
  totalDebit: roundMoney(totalDebit),
  balance: roundMoney(roundMoney(totalCredit) - roundMoney(totalDebit)),
  transactionCount: Number(transactionCount || 0),
});

const toSummaryFromGeminiTransactions = (transactions = []) => {
  let credit = 0;
  let debit = 0;
  let count = 0;
  const validTransactions = [];

  for (const transaction of transactions) {
    const date = String(transaction?.date || "").trim();
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
    const normalizedType =
      typeToken === "debit" || typeToken === "expense"
        ? "debit"
        : typeToken === "credit" || typeToken === "income"
          ? "credit"
          : amount < 0
            ? "debit"
            : "credit";

    if (normalizedType === "credit") {
      credit += absoluteAmount;
    } else {
      debit += absoluteAmount;
    }
    count += 1;

    if (validTransactions.length < 60) {
      validTransactions.push({
        date,
        description: String(transaction?.description || "").trim(),
        amount: absoluteAmount,
        type: normalizedType,
      });
    }
  }

  console.log("Transactions", validTransactions);
  console.log("Credit", roundMoney(credit));
  console.log("Debit", roundMoney(debit));

  return toSummary({
    totalCredit: credit,
    totalDebit: debit,
    transactionCount: count,
  });
};

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

const normalizeKey = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

const hasValidDateValue = (value) => {
  const token = normalizeWhitespace(value);
  if (!token) {
    return false;
  }

  if (DATE_VALUE_PATTERN.test(token)) {
    return true;
  }

  const parsed = new Date(token);
  return !Number.isNaN(parsed.getTime());
};

const hasValidDescriptionValue = (value) => {
  const text = normalizeWhitespace(value);
  return text.length >= 3 && /[a-zA-Z]/.test(text);
};

const getColumnValue = (row, keys) => {
  const rowKeys = Object.keys(row || {});
  for (const key of keys) {
    const match = rowKeys.find((candidate) => normalizeKey(candidate) === key);
    if (match && row[match] != null && String(row[match]).trim() !== "") {
      return row[match];
    }
  }
  return "";
};

const parseAmountToken = (token) => {
  const source = String(token || "").trim();
  if (!source) {
    return Number.NaN;
  }

  const negativeByParentheses = /\(\s*[^)]+\s*\)/.test(source);
  const negativeBySign =
    /-\s*\d/.test(source) || source.replace(/\s+/g, "").startsWith("-");
  const numeric = source.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(numeric);

  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return negativeByParentheses || negativeBySign ? -parsed : parsed;
};

const isAmountAllowed = (rawAmount, parsedAmount) => {
  const absolute = Math.abs(Number(parsedAmount || 0));
  if (!Number.isFinite(absolute) || absolute === 0) {
    return false;
  }

  const digits = String(rawAmount || parsedAmount).replace(/[^0-9]/g, "");
  if (!digits || digits.length > MAX_AMOUNT_DIGITS) {
    return false;
  }

  if (absolute > MAX_AMOUNT) {
    return false;
  }

  return true;
};

const extractLastAmountFromLine = (line) => {
  const matches = [...String(line || "").matchAll(MONEY_PATTERN)];
  if (!matches.length) {
    return null;
  }

  const lastMatch = matches[matches.length - 1];
  const raw = String(lastMatch[0] || "").trim();
  const amount = parseAmountToken(raw);

  if (!isAmountAllowed(raw, amount)) {
    return null;
  }

  const start = lastMatch.index ?? 0;
  const end = start + raw.length;

  return { raw, amount, start, end };
};

const shouldIgnoreLine = (line) => {
  const normalized = normalizeWhitespace(line);
  if (!normalized || normalized.length < MIN_LINE_LENGTH) {
    return true;
  }

  if (normalized.length > 240) {
    return true;
  }

  if (/\b(balance|opening|closing|available)\b/i.test(normalized)) {
    return true;
  }

  return IGNORED_LINE_PATTERNS.some((pattern) => pattern.test(normalized));
};

const cleanStatementLines = (rawText) => {
  return String(rawText || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .filter((line) => !shouldIgnoreLine(line));
};

const detectTransactionFromLine = (line) => {
  const normalized = normalizeWhitespace(line);
  if (!normalized) {
    return null;
  }

  const dateMatch = TRANSACTION_DATE_PATTERN.exec(normalized);
  if (!dateMatch) {
    return null;
  }

  const amountCandidate = extractLastAmountFromLine(normalized);
  if (!amountCandidate) {
    return null;
  }

  if (dateMatch.index > amountCandidate.start) {
    return null;
  }

  const description = normalizeWhitespace(
    normalized.slice(dateMatch.index + dateMatch[0].length, amountCandidate.start)
  );
  if (description.length < 3 || !/[a-zA-Z]/.test(description)) {
    return null;
  }

  const hasDebitHint = DEBIT_HINT_PATTERN.test(normalized);
  const hasCreditHint = CREDIT_HINT_PATTERN.test(normalized);
  const absoluteAmount = Math.abs(amountCandidate.amount);
  const type =
    amountCandidate.amount < 0 || (hasDebitHint && !hasCreditHint)
      ? "debit"
      : "credit";

  return {
    line: normalized,
    amount: absoluteAmount,
    type,
  };
};

export const buildSummaryFromTransactions = (transactions = []) => {
  let totalCredit = 0;
  let totalDebit = 0;
  let transactionCount = 0;

  for (const transaction of transactions) {
    const amount = Number(transaction?.amount || 0);
    if (!Number.isFinite(amount) || amount === 0) {
      continue;
    }

    transactionCount += 1;
    if (transaction?.type === "expense") {
      totalDebit += Math.abs(amount);
    } else {
      totalCredit += Math.abs(amount);
    }
  }

  return toSummary({ totalCredit, totalDebit, transactionCount });
};

const extractCsvSummary = async (filePath) => {
  const rows = [];

  await new Promise((resolve, reject) => {
    createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  let totalCredit = 0;
  let totalDebit = 0;
  let transactionCount = 0;
  const detectedRows = [];

  for (const row of rows) {
    const date = getColumnValue(row, ["date", "transactiondate", "valuedate"]);
    const description = getColumnValue(row, [
      "description",
      "details",
      "narration",
      "remarks",
      "particulars",
    ]);
    const directAmount = getColumnValue(row, [
      "amount",
      "transactionamount",
      "value",
    ]);
    const debitAmount = getColumnValue(row, ["debit", "withdrawal", "dr"]);
    const creditAmount = getColumnValue(row, ["credit", "deposit", "cr"]);
    const typeIndicator = String(
      getColumnValue(row, ["type", "transactiontype"]) || ""
    ).toLowerCase();
    const rowContextIsValid =
      hasValidDateValue(date) && hasValidDescriptionValue(description);
    const rowText = normalizeWhitespace(
      `${date} ${description} ${Object.values(row || {}).join(" ")}`
    ).toLowerCase();

    const parsedCredit = parseAmountToken(creditAmount);
    const parsedDebit = parseAmountToken(debitAmount);

    let consumed = false;
    if (rowContextIsValid && isAmountAllowed(creditAmount, parsedCredit)) {
      totalCredit += Math.abs(parsedCredit);
      transactionCount += 1;
      if (detectedRows.length < 60) {
        detectedRows.push({
          line: normalizeWhitespace(Object.values(row || {}).join(" ")),
          amount: Math.abs(parsedCredit),
          type: "credit",
        });
      }
      consumed = true;
    }

    if (rowContextIsValid && isAmountAllowed(debitAmount, parsedDebit)) {
      totalDebit += Math.abs(parsedDebit);
      transactionCount += 1;
      if (detectedRows.length < 60) {
        detectedRows.push({
          line: normalizeWhitespace(Object.values(row || {}).join(" ")),
          amount: Math.abs(parsedDebit),
          type: "debit",
        });
      }
      consumed = true;
    }

    if (consumed) {
      continue;
    }

    const parsedAmount = rowContextIsValid ? parseAmountToken(directAmount) : Number.NaN;
    if (rowContextIsValid && isAmountAllowed(directAmount, parsedAmount)) {
      const absoluteAmount = Math.abs(parsedAmount);

      const debitByType =
        parsedAmount < 0 || /debit|dr|expense/.test(typeIndicator) ||
        (DEBIT_HINT_PATTERN.test(rowText) && !CREDIT_HINT_PATTERN.test(rowText));

      if (debitByType) {
        totalDebit += absoluteAmount;
        if (detectedRows.length < 60) {
          detectedRows.push({
            line: normalizeWhitespace(Object.values(row || {}).join(" ")),
            amount: absoluteAmount,
            type: "debit",
          });
        }
      } else {
        totalCredit += absoluteAmount;
        if (detectedRows.length < 60) {
          detectedRows.push({
            line: normalizeWhitespace(Object.values(row || {}).join(" ")),
            amount: absoluteAmount,
            type: "credit",
          });
        }
      }
      transactionCount += 1;
      continue;
    }

    const fallback = detectTransactionFromLine(Object.values(row || {}).join(" "));
    if (!fallback) {
      continue;
    }

    if (fallback.type === "debit") {
      totalDebit += fallback.amount;
    } else {
      totalCredit += fallback.amount;
    }
    transactionCount += 1;
    if (detectedRows.length < 60) {
      detectedRows.push({
        line: fallback.line,
        amount: fallback.amount,
        type: fallback.type,
      });
    }
  }

  const previewText = rows
    .slice(0, 8)
    .map((row) => normalizeWhitespace(Object.values(row || {}).join(" ")))
    .filter(Boolean)
    .join("\n");
  const fullText = rows
    .map((row) => normalizeWhitespace(Object.values(row || {}).join(" ")))
    .filter(Boolean)
    .join("\n");

  logger.debug(
    {
      rowCount: rows.length,
      detectedTransactionCount: transactionCount,
      detectedTransactions: detectedRows,
    },
    "CSV summary parser detected transaction rows"
  );

  return {
    summary: toSummary({ totalCredit, totalDebit, transactionCount }),
    previewText,
    fullText,
  };
};

const hasReadableText = (text) => String(text || "").replace(/\s+/g, "").length > 20;

const extractPdfText = async (filePath) => {
  let parser = null;
  let text = "";
  let stage = "pdf-text";

  try {
    const pdfResult = await parsePDFStatement(filePath);
    parser = pdfResult.parser;
    text = String(pdfResult?.extractedText || "");
  } catch (error) {
    logger.warn({ error: error.message }, "PDF text extraction failed for summary");
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }

  if (!hasReadableText(text)) {
    const ocrResult = await parseOCRStatement({ filePath, inputType: "pdf" });
    text = String(ocrResult?.extractedText || "");
    stage = "ocr-pdf";
  }

  return { text, stage };
};

const extractImageText = async (filePath) => {
  const ocrResult = await parseOCRStatement({ filePath, inputType: "image" });
  return {
    text: String(ocrResult?.extractedText || ""),
    stage: "ocr-image",
  };
};

export const calculateSummaryFromText = (text) => {
  let totalCredit = 0;
  let totalDebit = 0;
  let transactionCount = 0;

  const lines = cleanStatementLines(text);
  const detected = [];

  for (const line of lines) {
    const transaction = detectTransactionFromLine(line);
    if (!transaction) {
      continue;
    }

    if (transaction.type === "debit") {
      totalDebit += transaction.amount;
    } else {
      totalCredit += transaction.amount;
    }
    transactionCount += 1;

    if (detected.length < 60) {
      detected.push({
        line: transaction.line,
        amount: transaction.amount,
        type: transaction.type,
      });
    }
  }

  logger.debug(
    {
      rawLineCount: String(text || "").split("\n").length,
      candidateLineCount: lines.length,
      detectedTransactionCount: transactionCount,
      detectedTransactions: detected,
    },
    "Summary parser detected transaction rows"
  );

  return toSummary({ totalCredit, totalDebit, transactionCount });
};

export const analyzeStatementSummaryFromFile = async (file) => {
  const filePath = path.resolve(file.path);
  const fileType = detectFileType(file);

  if (fileType === "unsupported") {
    throw new Error("Unsupported file type. Allowed: CSV, PDF, JPG, JPEG, PNG.");
  }

  let extractedText = "";
  let stage = "";
  let summary = null;
  let summarySource = "";
  let geminiTransactions = [];

  if (fileType === "csv") {
    const csvResult = await extractCsvSummary(filePath);
    extractedText = csvResult.fullText || csvResult.previewText;
    summary = csvResult.summary;
    stage = "csv-summary";
    summarySource = "csv";
  } else if (fileType === "pdf") {
    const pdfResult = await extractPdfText(filePath);
    extractedText = pdfResult.text;
    stage = pdfResult.stage;
  } else {
    const imageResult = await extractImageText(filePath);
    extractedText = imageResult.text;
    stage = imageResult.stage;
  }

  let geminiSummary = null;
  const shouldAttemptGemini =
    Boolean(extractedText) && !(fileType === "csv" && Number(summary?.transactionCount || 0) > 0);

  if (shouldAttemptGemini) {
    try {
      const geminiResult = await extractTransactionsWithGemini(extractedText);
      geminiTransactions = Array.isArray(geminiResult.transactions)
        ? geminiResult.transactions
        : [];

      if (geminiTransactions.length) {
        geminiSummary = toSummaryFromGeminiTransactions(geminiTransactions);
      }
    } catch (error) {
      logger.warn(
        {
          error: error.message,
          fileType,
          stage,
        },
        "Gemini summary extraction failed, using regex fallback"
      );
    }
  }

  const fallbackSummary = summary || calculateSummaryFromText(extractedText);
  const useGeminiSummary = Boolean(
    geminiSummary &&
    geminiSummary.transactionCount > 0 &&
      (geminiSummary.totalCredit > 0 || geminiSummary.totalDebit > 0) &&
      Number(fallbackSummary?.transactionCount || 0) === 0
  );
  const resolvedSummary = useGeminiSummary ? geminiSummary : fallbackSummary;
  summarySource = useGeminiSummary ? "gemini" : summarySource || "regex";

  logger.info(
    {
      stage,
      fileType,
      summarySource,
      summary: resolvedSummary,
      geminiTransactionsCount: geminiTransactions.length,
      extractedTextPreview: String(extractedText || "").slice(0, 1000),
    },
    "Statement summary analysis completed"
  );

  return {
    ...resolvedSummary,
    extractedText,
    stage,
    source: summarySource,
  };
};
