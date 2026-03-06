import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().trim().email("Please provide a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Please provide a valid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});

export const statementUploadSchema = z.object({
  body: z.object({
    fileName: z.string().trim().min(1, "fileName is required"),
    uploadDate: z.coerce.date().optional(),
    userId: z.string().optional(),
    transactions: z
      .array(
        z.object({
          date: z.coerce.date(),
          description: z.string().trim().min(1, "Transaction description is required"),
          amount: z.coerce.number(),
          category: z.string().trim().min(1, "Transaction category is required"),
          type: z.enum(["income", "expense"]),
        })
      )
      .optional()
      .default([]),
  }),
});

export const manualTransactionSchema = z.object({
  body: z.object({
    userId: z.string().optional(),
    date: z.coerce.date(),
    description: z.string().trim().min(1, "Transaction description is required"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    type: z.enum(["income", "expense"]),
    category: z.string().trim().min(1, "Category is required"),
  }),
});

export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Statement id is required"),
    transactionIndex: z.coerce.number().int().min(0),
  }),
  body: z
    .object({
      date: z.coerce.date().optional(),
      description: z.string().trim().min(1).optional(),
      amount: z.coerce.number().positive().optional(),
      type: z.enum(["income", "expense"]).optional(),
      category: z.string().trim().min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one transaction field must be provided.",
    }),
});
