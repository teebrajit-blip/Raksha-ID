import { Schema, model, type InferSchemaType } from "mongoose";

const accessRequestSchema = new Schema(
  {
    assetId: { type: String, required: true, index: true },
    requesterWallet: { type: String, required: true, lowercase: true, index: true },
    ownerWallet: { type: String, required: true, lowercase: true, index: true },
    requestedPermission: { type: String, enum: ["VIEW", "VERIFY", "DOWNLOAD", "SHARE"], required: true },
    reason: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

export type AccessRequestDocument = InferSchemaType<typeof accessRequestSchema>;
export const AccessRequestModel = model("AccessRequest", accessRequestSchema);
