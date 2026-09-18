import { Schema, model, type InferSchemaType } from "mongoose";

const notificationSchema = new Schema(
  {
    walletAddress: { type: String, required: true, lowercase: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedAssetId: { type: String, default: null },
  },
  { timestamps: true, versionKey: false }
);

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model("Notification", notificationSchema);
