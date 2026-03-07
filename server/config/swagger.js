import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bank Statement Analysis API",
      version: "1.0.0",
      description:
        "REST API for financial statement analysis platform. Supports authentication, statement ingestion, transaction management, analytics, and AI-powered insights.",
    },
    servers: [
      {
        url: "http://localhost:8000",
        description: "Local development",
      },
      {
        url: "https://your-production-domain.com",
        description: "Production (placeholder)",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication and authorization endpoints" },
      { name: "Statements", description: "Statement upload and statement-level operations" },
      { name: "Transactions", description: "Transaction operations under statements" },
      { name: "Analytics", description: "Financial analytics and AI insights" },
      { name: "Budget", description: "Budget-related endpoints (reserved for expansion)" },
      { name: "Profile", description: "User profile endpoints (reserved for expansion)" },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "67c9fc8f4b32802ac35b4d41" },
            name: { type: "string", example: "Sumit" },
            email: { type: "string", format: "email", example: "sumit@mail.com" },
            role: { type: "string", enum: ["user", "admin"], example: "user" },
            createdAt: { type: "string", format: "date-time", example: "2026-03-01T10:20:00.000Z" },
            updatedAt: { type: "string", format: "date-time", example: "2026-03-01T10:20:00.000Z" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Sumit" },
            email: { type: "string", format: "email", example: "sumit@mail.com" },
            password: { type: "string", format: "password", example: "12345678" },
          },
          example: {
            name: "Sumit",
            email: "sumit@mail.com",
            password: "12345678",
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "sumit@mail.com" },
            password: { type: "string", format: "password", example: "12345678" },
          },
          example: {
            email: "sumit@mail.com",
            password: "12345678",
          },
        },
        Transaction: {
          type: "object",
          required: ["date", "description", "amount", "type", "category"],
          properties: {
            date: { type: "string", format: "date-time", example: "2026-03-01T00:00:00.000Z" },
            description: { type: "string", example: "AMAZON PAYMENT" },
            amount: { type: "number", example: 2000 },
            type: { type: "string", enum: ["income", "expense"], example: "expense" },
            category: { type: "string", example: "shopping" },
          },
          example: {
            date: "2026-03-01T00:00:00.000Z",
            description: "AMAZON PAYMENT",
            amount: 2000,
            type: "expense",
            category: "shopping",
          },
        },
        Statement: {
          type: "object",
          properties: {
            _id: { type: "string", example: "67c9fd9d4b32802ac35b4d48" },
            userId: { type: "string", example: "67c9fc8f4b32802ac35b4d41" },
            fileName: { type: "string", example: "march-2026-statement.pdf" },
            uploadDate: { type: "string", format: "date-time", example: "2026-03-05T08:15:00.000Z" },
            transactions: {
              type: "array",
              items: { $ref: "#/components/schemas/Transaction" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Budget: {
          type: "object",
          properties: {
            category: { type: "string", example: "food" },
            limit: { type: "number", example: 10000 },
            spent: { type: "number", example: 7450 },
            month: { type: "string", example: "2026-03" },
          },
        },
        StatementUploadRequest: {
          type: "object",
          required: ["fileName", "transactions"],
          properties: {
            fileName: { type: "string", example: "march-2026-statement.csv" },
            uploadDate: { type: "string", format: "date-time" },
            transactions: {
              type: "array",
              items: { $ref: "#/components/schemas/Transaction" },
            },
          },
          example: {
            fileName: "march-2026-statement.csv",
            uploadDate: "2026-03-05T08:15:00.000Z",
            transactions: [
              {
                date: "2026-03-01T00:00:00.000Z",
                description: "AMAZON PAYMENT",
                amount: 2000,
                type: "expense",
                category: "shopping",
              },
            ],
          },
        },
        ManualTransactionRequest: {
          type: "object",
          required: ["date", "description", "amount", "type", "category"],
          properties: {
            date: { type: "string", format: "date-time" },
            description: { type: "string" },
            amount: { type: "number" },
            type: { type: "string", enum: ["income", "expense"] },
            category: { type: "string" },
          },
          example: {
            date: "2026-03-06T00:00:00.000Z",
            description: "UPI Grocery Store",
            amount: 1450,
            type: "expense",
            category: "groceries",
          },
        },
        UpdateTransactionRequest: {
          type: "object",
          properties: {
            date: { type: "string", format: "date-time", example: "2026-03-06T00:00:00.000Z" },
            description: { type: "string", example: "Updated description" },
            amount: { type: "number", example: 1500 },
            type: { type: "string", enum: ["income", "expense"], example: "expense" },
            category: { type: "string", example: "utilities" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login successful." },
            data: {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/User" },
                token: {
                  type: "string",
                  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                },
              },
            },
          },
        },
        StatementResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Statement uploaded successfully." },
            data: { $ref: "#/components/schemas/Statement" },
            meta: {
              type: "object",
              properties: {
                parsedTransactions: { type: "number", example: 12 },
                savedTransactions: { type: "number", example: 10 },
                duplicatesRemoved: { type: "number", example: 2 },
                parserStage: { type: "string", example: "pdf" },
                stageChain: {
                  type: "array",
                  items: { type: "string" },
                  example: ["pdf", "ocr", "ai"],
                },
              },
            },
          },
        },
        StatementsListResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Statement" },
            },
            pagination: {
              type: "object",
              properties: {
                page: { type: "number", example: 1 },
                limit: { type: "number", example: 10 },
                total: { type: "number", example: 48 },
                totalPages: { type: "number", example: 5 },
              },
            },
          },
        },
        AnalysisSummaryResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                totalIncome: { type: "number", example: 64000 },
                totalExpenses: { type: "number", example: 25500 },
                totalCredit: { type: "number", example: 64000 },
                totalDebit: { type: "number", example: 25500 },
                balance: { type: "number", example: 38500 },
                transactionCount: { type: "number", example: 42 },
                categorySpendingSummary: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", example: "rent" },
                      totalSpent: { type: "number", example: 12000 },
                    },
                  },
                },
              },
            },
          },
        },
        AnalysisChartResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                credit: { type: "number", example: 64000 },
                debit: { type: "number", example: 25500 },
                balance: { type: "number", example: 38500 },
                transactionCount: { type: "number", example: 42 },
                trend: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "number", example: 1 },
                      label: { type: "string", example: "2026-03-07" },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                        example: "2026-03-07T10:10:00.000Z",
                      },
                      credit: { type: "number", example: 64000 },
                      debit: { type: "number", example: 25500 },
                      balance: { type: "number", example: 38500 },
                      transactionCount: { type: "number", example: 42 },
                    },
                  },
                },
              },
            },
          },
        },
        AIInsightsResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            insights: {
              type: "array",
              items: { type: "string" },
              example: [
                "Food spending increased by 18% versus last month.",
                "You can save ₹4,000 by reducing discretionary shopping.",
              ],
            },
            source: { type: "string", example: "gemini" },
            cacheHit: { type: "boolean", example: false },
            generatedAt: { type: "string", format: "date-time" },
            sections: {
              type: "object",
              properties: {
                spendingInsights: { type: "array", items: { type: "string" } },
                budgetingSuggestions: { type: "array", items: { type: "string" } },
                unusualPatterns: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Invalid or expired token." },
            details: { nullable: true },
          },
        },
      },
      responses: {
        BadRequest: {
          description: "Validation error or malformed request",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              examples: {
                validation: {
                  value: {
                    success: false,
                    message: "Validation failed.",
                  },
                },
              },
            },
          },
        },
        Unauthorized: {
          description: "Missing or invalid authentication token",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              examples: {
                unauthorized: {
                  value: {
                    success: false,
                    message: "Unauthorized.",
                  },
                },
              },
            },
          },
        },
        NotFound: {
          description: "Requested resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              examples: {
                notFound: {
                  value: {
                    success: false,
                    message: "Resource not found.",
                  },
                },
              },
            },
          },
        },
        Conflict: {
          description: "Resource conflict",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              examples: {
                conflict: {
                  value: {
                    success: false,
                    message: "Email already registered.",
                  },
                },
              },
            },
          },
        },
        UnprocessableEntity: {
          description: "Request accepted but could not be processed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              examples: {
                parsingFailure: {
                  value: {
                    success: false,
                    message:
                      "No valid transactions detected. Please upload a clearer statement or add transactions manually.",
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: "Unexpected server error",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              examples: {
                serverError: {
                  value: {
                    success: false,
                    message: "Internal server error.",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./server/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

export const setupSwagger = (app) => {
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "none",
      },
      customSiteTitle: "Bank Statement Analysis API Docs",
    })
  );
};

export { swaggerSpec };
