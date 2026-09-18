import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/raksa-id"),
  MONGODB_ENABLED: z.string().default("false").transform((value) => value.toLowerCase() === "true"),
  SESSION_SECRET: z.string().min(32).default("development-only-change-me-please-123456"),
  RPC_URL: z.string().url().default("https://rpc-amoy.polygon.technology"),
  CHAIN_ID: z.coerce.number().int().positive().default(80002),
  NETWORK_NAME: z.string().default("Polygon Amoy"),
  CONTRACT_ADDRESS: z.string().optional(),
  STORAGE_ENDPOINT: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
