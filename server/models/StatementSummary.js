import mongoose from "mongoose";

const statementSummarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    totalCredit: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDebit: {
      type: Number,
      default: 0,
      min: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    transactionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

statementSummarySchema.index({ userId: 1, createdAt: -1 });

const StatementSummary =
  mongoose.models.StatementSummary ||
  mongoose.model("StatementSummary", statementSummarySchema);

export default StatementSummary;
