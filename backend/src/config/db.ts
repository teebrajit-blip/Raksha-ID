import mongoose from "mongoose";
import { env } from "./env.js";

let connected = false;

export async function connectDatabase() {
  if (!env.MONGODB_ENABLED) {
    if (env.NODE_ENV === "production") throw new Error("MONGODB_ENABLED must be true in production.");
    return false;
  }
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 1500 });
    connected = true;
    return true;
  } catch (error) {
    if (env.NODE_ENV === "production") {
      throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    console.warn("MongoDB unavailable; using development memory store.", error instanceof Error ? error.message : error);
    return false;
  }
}

export function isDatabaseConnected() { return connected; }

export async function disconnectDatabase() {
  if (connected) await mongoose.disconnect();
}