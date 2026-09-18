import { Schema, model, type InferSchemaType } from "mongoose";

const assetSchema = new Schema(
  {
    assetId: { type: String, required: true, unique: true, index: true },
    ownerWallet: { type: String, required: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    issuer: { type: String, required: true, trim: true },
    issuerWallet: { type: String, lowercase: true, default: null },
    type: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["DRAFT", "UPLOADING", "HASHED", "PENDING_BLOCKCHAIN", "REGISTERED", "REVOKED"],
      default: "PENDING_BLOCKCHAIN",
      index: true,
    },
    hash: { type: String, default: null, index: true },
    hashAlgorithm: { type: String, default: "SHA-256" },
    storageReference: { type: String, default: null },
    transactionHash: { type: String, default: null },
    blockNumber: { type: Number, default: null },
    contractAddress: { type: String, default: null },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

assetSchema.index({ createdAt: -1 });
export type AssetDocument = InferSchemaType<typeof assetSchema>;
export const AssetModel = model("Asset", assetSchema);