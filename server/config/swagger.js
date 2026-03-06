import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bank Statement Analysis API",
      version: "1.0.0",
      description: "API documentation for the Bank Statement Analysis backend.",
    },
    servers: [
      {
        url: "http://localhost:8000",
      },
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
        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Sumit Jagtap" },
            email: { type: "string", format: "email", example: "sumit@example.com" },
            password: { type: "string", format: "password", example: "StrongPass123!" },
          },
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email", example: "sumit@example.com" },
            password: { type: "string", format: "password", example: "StrongPass123!" },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "67c9fc8f4b32802ac35b4d41" },
            name: { type: "string", example: "Sumit Jagtap" },
            email: { type: "string", example: "sumit@example.com" },
            role: { type: "string", enum: ["user", "admin"], example: "user" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
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
                token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
              },
            },
          },
        },
        TransactionInput: {
          type: "object",
          required: ["date", "description", "amount", "category", "type"],
          properties: {
            date: { type: "string", format: "date-time", example: "2026-03-01T00:00:00.000Z" },
            description: { type: "string", example: "Electricity bill" },
            amount: { type: "number", example: 2400.5 },
            category: { type: "string", example: "Utilities" },
            type: { type: "string", enum: ["income", "expense"], example: "expense" },
          },
        },
        StatementUploadRequest: {
          type: "object",
          required: ["fileName"],
          properties: {
            fileName: { type: "string", example: "feb-2026-statement.pdf" },
            uploadDate: { type: "string", format: "date-time" },
            transactions: {
              type: "array",
              items: { $ref: "#/components/schemas/TransactionInput" },
            },
          },
        },
        Statement: {
          type: "object",
          properties: {
            _id: { type: "string", example: "67c9fd9d4b32802ac35b4d48" },
            userId: { type: "string", example: "67c9fc8f4b32802ac35b4d41" },
            fileName: { type: "string", example: "feb-2026-statement.pdf" },
            uploadDate: { type: "string", format: "date-time" },
            transactions: {
              type: "array",
              items: { $ref: "#/components/schemas/TransactionInput" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        StatementResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Statement uploaded successfully." },
            data: { $ref: "#/components/schemas/Statement" },
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
          },
        },
        DeleteStatementResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Statement deleted successfully." },
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
                balance: { type: "number", example: 38500 },
                categorySpendingSummary: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string", example: "Rent" },
                      totalSpent: { type: "number", example: 12000 },
                    },
                  },
                },
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
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
};

export { swaggerSpec };
