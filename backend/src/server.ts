import { app } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";

const database = await connectDatabase();
const server = app.listen(env.PORT, "0.0.0.0", () => console.log(`Raksa ID API listening on port ${env.PORT} (${database ? "mongodb" : "memory-development"})`));
async function shutdown() { server.close(); await disconnectDatabase(); process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
