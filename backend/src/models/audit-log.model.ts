import { Schema, model, type InferSchemaType } from "mongoose";

const auditLogSchema = new Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    action: { type: String, required: true },
    targetId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipHash: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model("AuditLog", auditLogSchema);
