import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Transaction date is required"],
    },
    description: {
      type: String,
      required: [true, "Transaction description is required"],
      trim: true,
      maxlength: 300,
    },
    amount: {
      type: Number,
      required: [true, "Transaction amount is required"],
    },
    category: {
      type: String,
      required: [true, "Transaction category is required"],
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Transaction type is required"],
    },
  },
  {
    _id: false,
  }
);

const statementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
      trim: true,
      maxlength: 255,
    },
    uploadDate: {
      type: Date,
      default: Date.now,
    },
    transactions: {
      type: [transactionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

statementSchema.index({ userId: 1 });
statementSchema.index({ createdAt: -1 });
statementSchema.index({ userId: 1, createdAt: -1 });

const Statement =
  mongoose.models.Statement || mongoose.model("Statement", statementSchema);

export default Statement;
