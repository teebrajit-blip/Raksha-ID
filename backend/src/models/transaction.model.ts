import { Schema, model, type InferSchemaType } from "mongoose";

const transactionSchema = new Schema(
  {
    txHash: { type: String, required: true, unique: true, index: true },
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    assetId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["REGISTER_ASSET", "GRANT_ACCESS", "REVOKE_ACCESS", "REVOKE_ASSET"],
      required: true,
    },
    network: { type: String, default: "Polygon Amoy" },
    status: { type: String, enum: ["PENDING", "CONFIRMED", "FAILED"], default: "PENDING", index: true },
    blockNumber: { type: Number, default: null },
  },
  { timestamps: true, versionKey: false }
);

export type TransactionDocument = InferSchemaType<typeof transactionSchema>;
export const TransactionModel = model("Transaction", transactionSchema);
