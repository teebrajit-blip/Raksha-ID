import { Schema, model, type InferSchemaType } from "mongoose";

const identitySchema = new Schema(
  {
    identityId: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    displayName: { type: String, trim: true, default: "" },
    verificationStatus: { type: String, enum: ["UNVERIFIED", "VERIFIED"], default: "UNVERIFIED" },
    visibilitySettings: {
      displayName: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PUBLIC" },
      email: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PRIVATE" },
      phone: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PRIVATE" },
      address: { type: String, enum: ["PUBLIC", "PRIVATE"], default: "PRIVATE" },
      wallet: { type: String, enum: ["PUBLIC", "CONTROLLED"], default: "CONTROLLED" },
    },
    issuerRelationships: [{ type: String }],
  },
  { timestamps: true, versionKey: false }
);

export type IdentityDocument = InferSchemaType<typeof identitySchema>;
export const IdentityModel = model("Identity", identitySchema);
