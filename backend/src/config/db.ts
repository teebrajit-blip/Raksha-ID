import mongoose from "mongoose";
import { env } from "./env.js";

let connected = false;

export async function connectDatabase() {
  if (!env.MONGODB_ENABLED) return false;
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 1500 });
    connected = true;
    return true;
  } catch (error) {
    console.warn("MongoDB unavailable; using development memory store.", error instanceof Error ? error.message : error);
    return false;
  }
}

export function isDatabaseConnected() { return connected; }

export async function disconnectDatabase() {
  if (connected) await mongoose.disconnect();
}