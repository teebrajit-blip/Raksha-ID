import { Schema, model, type InferSchemaType } from "mongoose";

const issuerSchema = new Schema(
  {
    issuerId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    institutionType: { type: String, required: true, trim: true },
    verified: { type: Boolean, default: false },
    issuerWallet: { type: String, required: true, lowercase: true, index: true },
  },
  { timestamps: true, versionKey: false }
);

export type IssuerDocument = InferSchemaType<typeof issuerSchema>;
export const IssuerModel = model("Issuer", issuerSchema);
