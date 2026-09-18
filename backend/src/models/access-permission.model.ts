import { Schema, model, type InferSchemaType } from "mongoose";

const accessPermissionSchema = new Schema(
  {
    assetId: { type: String, required: true, index: true },
    ownerWallet: { type: String, required: true, lowercase: true, index: true },
    recipientWallet: { type: String, required: true, lowercase: true, index: true },
    permission: { type: String, enum: ["VIEW", "VERIFY", "DOWNLOAD", "SHARE"], required: true },
    status: { type: String, enum: ["ACTIVE", "EXPIRED", "REVOKED"], default: "ACTIVE", index: true },
    expiresAt: { type: Date, required: true },
    blockchainTx: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

accessPermissionSchema.index({ assetId: 1, recipientWallet: 1 });

export type AccessPermissionDocument = InferSchemaType<typeof accessPermissionSchema>;
export const AccessPermissionModel = model("AccessPermission", accessPermissionSchema);
