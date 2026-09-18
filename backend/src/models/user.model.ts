import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, unique: true, index: true },
    role: { type: String, enum: ["USER", "ISSUER", "VERIFIER", "ADMIN"], default: "USER" },
    displayName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);