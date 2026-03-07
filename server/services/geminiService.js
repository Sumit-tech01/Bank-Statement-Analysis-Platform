import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import logger from "../utils/logger.js";

const MODEL_NAME = "gemini-1.5-flash";
const MAX_TEXT_CHARS = 30000;
const MAX_AMOUNT = 10000000; // 1 crore
const JSON_RETRY_ATTEMPTS = 1;

const DATE_PATTERNS = [
  /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/,
  /^\d{4}-\d{1,2}-\d{1,2}$/,
];

const extractDateToken = (value) => {
  const source = String(value || "").trim();
  if (!source) {
    return "";
  }

  const iso = source.match(/\b\d{4}-\d{1,2}-\d{1,2}\b/);
  if (iso) {
    return iso[0];
  }

  const dayFirst = source.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/);
  if (dayFirst) {
    return dayFirst[0];
  }

  return "";
};

const normalizeDate = (value) => {
  const token = extractDateToken(value);
  if (!token) {
    return null;
  }

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(token)) {
    const [, year, month, day] = token.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) || [];
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const parsed = new Date(`${iso}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : iso;
  }

  const dayFirst = token.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dayFirst) {
    let [, day, month, year] = dayFirst;
    if (Number(year) < 100) {
      year = String(2000 + Number(year));
    }

    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const parsed = new Date(`${iso}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : iso;
  }

  return null;
};

const toMoney = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return Number.NaN;
  }

  const negativeByParen = /^\(.*\)$/.test(raw);
  const numeric = raw.replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(numeric);
  if (!Number.isFinite(parsed)) {
    return Number.NaN;
  }

  return negativeByParen ? -Math.abs(parsed) : parsed;
};

const parseGeminiJsonArray = (rawText) => {
  const cleaned = String(rawText || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Strict JSON-only validation: non-JSON wrappers should fail and trigger retry/fallback.
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Gemini response is not a JSON array.");
  }

  return parsed;
};

const normalizeType = (value, amount) => {
  const token = String(value || "").toLowerCase();
  if (/(debit|dr|expense|withdraw)/.test(token)) {
    return "debit";
  }
  if (/(credit|cr|income|deposit)/.test(token)) {
    return "credit";
  }
  return amount < 0 ? "debit" : "credit";
};

const isValidDateToken = (value) =>
  DATE_PATTERNS.some((pattern) => pattern.test(extractDateToken(value)));

const normalizeTransaction = (row) => {
  if (!row || typeof row !== "object") {
    return null;
  }

  const dateToken = String(row.date || "").trim();
  if (!isValidDateToken(dateToken)) {
    return null;
  }

  const normalizedDate = normalizeDate(dateToken);
  if (!normalizedDate) {
    return null;
  }

  const description = String(row.description || "").trim();
  if (description.length < 3) {
    return null;
  }

  const parsedAmount = toMoney(row.amount);
  const absoluteAmount = Math.abs(parsedAmount);
  if (!Number.isFinite(parsedAmount) || absoluteAmount === 0 || absoluteAmount > MAX_AMOUNT) {
    return null;
  }

  const type = normalizeType(row.type, parsedAmount);
  return {
    date: normalizedDate,
    description,
    amount: absoluteAmount,
    type,
  };
};

const dedupeTransactions = (transactions) => {
  const seen = new Set();
  const unique = [];

  for (const transaction of transactions) {
    const key = [
      transaction.date,
      transaction.description.toLowerCase(),
      transaction.amount.toFixed(2),
      transaction.type,
    ].join("|");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(transaction);
  }

  return unique;
};

export const extractTransactionsWithGemini = async (statementText) => {
  const text = String(statementText || "").trim();
  if (!text) {
    return {
      transactions: [],
      rawResponse: "",
      source: "gemini",
    };
  }

  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = client.getGenerativeModel({ model: MODEL_NAME });
  const statementSlice = text.slice(0, MAX_TEXT_CHARS);

  const buildPrompt = (retry = false) => `
Extract all transactions from this bank statement.

Return JSON array only. Do not return markdown, prose, or any extra text.
${retry ? "Previous output was invalid JSON. Return only valid JSON array this time." : ""}

Required output format:
[
  {
    "date": "",
    "description": "",
    "amount": 0,
    "type": "credit"
  }
]

Rules:
- date must be DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
- type must be exactly "credit" or "debit"
- amount must be numeric only
- ignore opening balance, closing balance, balance rows, account number, page number
- include only real transaction rows

Bank statement text:
${statementSlice}
`.trim();

  let rawText = "";
  let rows = [];
  let parsed = false;
  let lastParseError = null;

  for (let attempt = 0; attempt <= JSON_RETRY_ATTEMPTS; attempt += 1) {
    const response = await model.generateContent(buildPrompt(attempt > 0));
    rawText = response.response.text();

    try {
      rows = parseGeminiJsonArray(rawText);
      parsed = true;
      break;
    } catch (error) {
      lastParseError = error;
      logger.warn(
        {
          model: MODEL_NAME,
          attempt: attempt + 1,
          error: error.message,
          rawResponsePreview: String(rawText || "").slice(0, 600),
        },
        "Gemini returned invalid JSON transaction output"
      );
    }
  }

  if (!parsed) {
    throw new Error(
      `Gemini did not return valid JSON array. ${lastParseError?.message || ""}`.trim()
    );
  }

  const normalized = dedupeTransactions(rows.map(normalizeTransaction).filter(Boolean));

  logger.debug(
    {
      model: MODEL_NAME,
      inputLength: text.length,
      extractedCount: normalized.length,
      extractedSample: normalized.slice(0, 20),
    },
    "Gemini statement extraction completed"
  );

  return {
    transactions: normalized,
    rawResponse: rawText,
    source: "gemini",
  };
};

export default extractTransactionsWithGemini;
